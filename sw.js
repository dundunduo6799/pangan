/* 盘感训练营 Service Worker
   策略：页面导航网络优先（发布后刷新即最新版），失败回退缓存；
   静态资源（图标等）缓存优先。 */
const CACHE = 'pangan-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 行情 API 不拦截
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then(resp => {
        if (!resp.ok) throw 0;
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        caches.open(CACHE).then(c => c.put('./index.html', resp.clone()));
        return resp;
      }).catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      if (resp.ok) caches.open(CACHE).then(c => c.put(req, resp.clone()));
      return resp;
    }))
  );
});
