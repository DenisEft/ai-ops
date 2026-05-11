#!/usr/bin/env node
const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

const PORT = 18790;
let TOKEN = process.env.AMVERA_TOKEN || '';
if (!TOKEN) {
  try {
    TOKEN = execSync('gpg --batch --pinentry-mode loopback --passphrase "pass-gpg-2026" -d ~/.password-store/amvera-gpt5-token.gpg 2>/dev/null', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.error('Cannot read amvera-gpt5-token from pass');
    process.exit(1);
  }
}

const MAX_SYSTEM_PROMPT = 4000; // chars limit for system prompt

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (pathname === '/v1/chat/completions' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    await new Promise(r => req.on('end', r));

    let openaiReq;
    try {
      openaiReq = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Invalid JSON', type: 'invalid_request_error' } }));
      return;
    }

    // Convert OpenAI → Amvera format
    const messages = (openaiReq.messages || []).map(msg => {
      const m = { role: msg.role };
      if (msg.role === 'system') {
        // Truncate oversized system prompts
        const content = msg.content || msg.text || '';
        m.text = content.length > MAX_SYSTEM_PROMPT
          ? content.substring(0, MAX_SYSTEM_PROMPT) + '\n\n[... system prompt truncated, total ' + content.length + ' chars]'
          : content;
      } else {
        m.text = msg.content || msg.text || '';
      }
      return m;
    });

    const amveraBody = {
      model: openaiReq.model || 'gpt-5',
      messages,
      temperature: openaiReq.temperature,
      max_completion_tokens: openaiReq.max_completion_tokens || openaiReq.max_tokens,
      top_p: openaiReq.top_p,
      stop: openaiReq.stop,
      frequency_penalty: openaiReq.frequency_penalty,
      presence_penalty: openaiReq.presence_penalty,
      n: openaiReq.n,
    };

    Object.keys(amveraBody).forEach(k => {
      if (amveraBody[k] === undefined) delete amveraBody[k];
    });

    const data = JSON.stringify(amveraBody);
    const postData = Buffer.from(data);

    const options = {
      hostname: 'kong-proxy.yc.amvera.ru',
      path: '/api/v1/models/gpt',
      method: 'POST',
      port: 443,
      headers: {
        'X-Auth-Token': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'User-Agent': 'AmveraOpenAIProxy/1.0',
      },
      timeout: 120000,
    };

    const proxyReq = https.request(options, proxyRes => {
      let proxyBody = '';
      proxyRes.on('data', chunk => proxyBody += chunk);
      proxyRes.on('end', () => {
        try {
          const resp = JSON.parse(proxyBody);

          if (resp.choices && resp.choices.length > 0) {
            const openaiResp = {
              id: resp.id || `chatcmpl-${Date.now()}`,
              object: 'chat.completion',
              created: resp.created || Math.floor(Date.now() / 1000),
              model: resp.model || amveraBody.model,
              choices: resp.choices.map((c, i) => ({
                index: c.index || i,
                message: {
                  role: c.message?.role || 'assistant',
                  content: c.message?.content || c.message?.text || '',
                },
                finish_reason: c.finish_reason || 'stop',
              })),
              usage: resp.usage ? {
                prompt_tokens: parseInt(resp.usage.prompt_tokens || 0),
                completion_tokens: parseInt(resp.usage.completion_tokens || 0),
                total_tokens: parseInt(resp.usage.total_tokens || 0),
              } : undefined,
            };

            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(openaiResp));
          } else if (resp.alternatives && resp.alternatives.length > 0) {
            const alt = resp.alternatives[0];
            const msg = alt.message || {};

            const openaiResp = {
              id: resp.id || `chatcmpl-${Date.now()}`,
              object: 'chat.completion',
              created: resp.created || Math.floor(Date.now() / 1000),
              model: resp.model || amveraBody.model,
              choices: [{
                index: 0,
                message: {
                  role: msg.role || 'assistant',
                  content: msg.text || msg.content || '',
                },
                finish_reason: alt.status === 'stop' ? 'stop' : 'length',
              }],
              usage: resp.usage ? {
                prompt_tokens: parseInt(resp.usage.inputTextTokens || resp.usage.prompt_tokens || 0),
                completion_tokens: parseInt(resp.usage.completionTokens || resp.usage.completion_tokens || 0),
                total_tokens: parseInt(resp.usage.totalTokens || resp.usage.total_tokens || 0),
              } : undefined,
            };

            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(openaiResp));
          } else {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: {
                message: `Unexpected Amvera response: ${proxyBody.substring(0, 300)}`,
                type: 'server_error'
              }
            }));
          }
        } catch (e) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: {
              message: `Failed to parse Amvera response: ${e.message}. Raw: ${proxyBody.substring(0, 200)}`,
              type: 'server_error'
            }
          }));
        }
      });
    });

    proxyReq.on('error', err => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `Proxy error: ${err.message}`, type: 'server_error' } }));
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Gateway timeout', type: 'server_error' } }));
    });

    proxyReq.write(postData);
    proxyReq.end();
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'Not found', type: 'not_found' } }));
  }
});

server.listen(PORT, () => {
  console.log(`Amvera OpenAI proxy listening on port ${PORT}`);
});
