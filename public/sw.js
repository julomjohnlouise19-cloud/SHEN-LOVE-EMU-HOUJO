const CACHE = 'cozy-science-v1';
const PRECACHE = [];
const BASE_URL = new URL('./', self.location.href).pathname;
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE.length ? PRECACHE : [BASE_URL, `${BASE_URL}favicon.svg`]))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('cozy-science-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => { if (response.ok) { const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put(event.request, copy)); } return response; }).catch(async () => { const cached = await caches.match(event.request, { ignoreVary: true }); if (cached) return cached; if (event.request.mode === 'navigate') return (await caches.match(BASE_URL, { ignoreVary: true })) || Response.error(); return Response.error(); }));
});
