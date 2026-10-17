/* Omni Market offline-first service worker. Transactions/auth still require a connection. */
const VERSION = 'omni-market-v3';
const APP_SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = ['/', '/icons/omni-icon.svg', '/product-placeholder.svg', OFFLINE_URL];
self.addEventListener('install', event => { event.waitUntil(caches.open(APP_SHELL).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => ![APP_SHELL,RUNTIME].includes(key)).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
 const req = event.request; const url = new URL(req.url);
 if (req.method !== 'GET') return;
 // Cache images from approved-by-browser public CDNs too (including seller photo URLs).
 if (url.origin !== self.location.origin) {
   if (req.destination === 'image' && url.protocol === 'https:') {
     event.respondWith(caches.open(RUNTIME).then(async cache => { const cached = await cache.match(req); const refresh = fetch(req).then(response => { if(response.ok || response.type === 'opaque') cache.put(req,response.clone()); return response; }).catch(() => cached); return cached || refresh; }));
   }
   return;
 }
 if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;
 if (req.mode === 'navigate') {
   event.respondWith(fetch(req).then(response => { if(response.ok){const copy=response.clone();caches.open(RUNTIME).then(cache=>cache.put(req,copy));} return response; }).catch(async () => (await caches.match(req)) || (await caches.match(url.pathname)) || (await caches.match(OFFLINE_URL))));
   return;
 }
 // Next.js client-side route payloads are cached too, so links between previously
 // visited pages can continue to work when the network disappears.
 if (req.headers.get('RSC') === '1' || url.searchParams.has('_rsc') || req.headers.get('Accept')?.includes('text/x-component')) {
   event.respondWith(fetch(req).then(response => {if(response.ok){const copy=response.clone();caches.open(RUNTIME).then(cache=>cache.put(req,copy));}return response;}).catch(async()=>await caches.match(req) || Response.error()));
   return;
 }
 if (url.pathname.startsWith('/_next/static/') || /\.(?:css|js|woff2?|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname)) {
   event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {if(response.ok){const copy=response.clone();caches.open(RUNTIME).then(cache=>cache.put(req,copy));}return response;})));
 }
});
