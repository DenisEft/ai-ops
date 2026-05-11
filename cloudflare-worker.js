/**
 * Telegram Bot API Proxy (Cloudflare Worker)
 * Проксирует все /bot/TOKEN/... и /file/bot/TOKEN/... к api.telegram.org
 *
 * Deploy: https://dash.cloudflare.com → Workers → twilight-sound-6bfb
 */

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname + url.search;
  
  // Проксируем всё к Telegram Bot API
  const tgUrl = `https://api.telegram.org${path}`;
  
  // Собираем headers
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('host', 'api.telegram.org');
  
  // Для GET запросов без тела
  if (request.method === 'GET') {
    return fetch(tgUrl, {
      method: 'GET',
      headers: Object.fromEntries(headers),
    });
  }
  
  // Для POST/PUT с телом
  const body = await request.text();
  return fetch(tgUrl, {
    method: request.method,
    headers: Object.fromEntries(headers),
    body: body,
  });
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
