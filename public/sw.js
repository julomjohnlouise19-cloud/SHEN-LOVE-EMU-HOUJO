const CACHE = 'cozy-science-v1';
const PRECACHE = [];
const BASE_URL = new URL('./', self.location.href).pathname;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE.length ? PRECACHE : [BASE_URL, `${BASE_URL}school-seal.webp`])));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('cozy-science-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function cachedDocument(request, response) {
  const range = request.headers.get('range');
  if (!range || !response.headers.get('content-type')?.includes('application/pdf')) return response;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return response;
  const data = await response.arrayBuffer();
  const size = data.byteLength;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.set('accept-ranges', 'bytes');
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size || (!match[1] && Number(match[2]) === 0)) {
    headers.set('content-range', `bytes */${size}`);
    headers.set('content-length', '0');
    return new Response(null, { status: 416, headers });
  }
  headers.set('content-range', `bytes ${start}-${end}/${size}`);
  headers.set('content-length', String(end - start + 1));
  return new Response(data.slice(start, end + 1), { status: 206, headers });
}
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    // Partial PDF responses must not replace the complete cached handbook.
    if (response.ok && response.status === 200) {
      const copy = response.clone();
      void caches.open(CACHE).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request, { ignoreVary: true });
    if (cached) return cachedDocument(event.request, cached);
    if (event.request.mode === 'navigate') return (await caches.match(BASE_URL, { ignoreVary: true })) || Response.error();
    return Response.error();
  }));
});
