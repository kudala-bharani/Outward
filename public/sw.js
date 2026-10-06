// Only application assets are cached. Journal data and cross-origin model files
// are outside this worker. New releases wait for existing trip tabs to close.
const CACHE = 'outward-shell-v2';
const PRECACHE = ['/','/index.html','/favicon.svg','/landscape.svg','/manifest.webmanifest'];
const STATIC_PATHS = ['/favicon.svg','/landscape.svg','/manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('outward-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () => {
      const cached = await caches.match('/index.html');
      return cached || new Response('Outward is not available offline in this browser yet. Reconnect and reload before heading out.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }));
    return;
  }
  if (!url.pathname.startsWith('/assets/') && !STATIC_PATHS.includes(url.pathname)) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    // A redirected access/sign-in page must never replace a versioned asset.
    if (response.ok && !response.redirected) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {}));
    }
    return response;
  })));
});
