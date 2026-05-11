/**
 * Telegram Bot API Proxy (Cloudflare Worker)
 * Проксирует все /bot/TOKEN/... и /file/bot/TOKEN/... к api.telegram.org
 *
 * Deploy: https://dash.cloudflare.com → Workers → twilight-sound-6bfb
 */

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname + url.search;
  
  const tgUrl = `https://api.telegram.org${path}`;
  
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('host', 'api.telegram.org');
  headers.delete('cf-connecting-ip');
  
  // Для GET запросов — стримим ответ
  if (request.method === 'GET') {
    // Для file endpoints — стримим через fetch с таймаутом
    const fetchTimeout = setTimeout(() => {
      if (!responseDone) {
        console.error(`Request timeout for ${path}`);
      }
    }, 119000); // 119s — почти 2 минуты, меньше 2мин Cloudflare
    
    const response = await fetch(tgUrl, {
      method: 'GET',
      headers: Object.fromEntries(headers),
    });
    
    clearTimeout(fetchTimeout);
    
    // Копируем заголовки ответа
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('access-control-allow-origin', '*');
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }
  
  // Для POST/PUT с телом — ждём и форвардим
  const body = await request.text();
  const response = await fetch(tgUrl, {
    method: request.method,
    headers: Object.fromEntries(headers),
    body: body,
  });
  
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('access-control-allow-origin', '*');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
