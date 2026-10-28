/* TraceTheToxin service worker: installability, offline shell, push alerts. */
const CACHE = 'ttt-shell-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'image/TraceTheToxin.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for our own files (the app deliberately avoids stale caches),
// cached copy only when offline. Map tiles, Supabase and other origins are untouched.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
  );
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'TraceTheToxin', {
    body: d.body || '',
    icon: 'image/TraceTheToxin.png',
    badge: 'image/TraceTheToxin.png',
    tag: d.tag || 'ttt-wind-alert',
    renotify: true,
    vibrate: [200, 100, 200, 100, 400],
    data: { lat: d.lat, lon: d.lon }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { lat, lon } = e.notification.data || {};
  const hasPos = lat != null && lon != null;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length) {
        const c = list[0];
        if (hasPos) c.postMessage({ type: 'focus', lat, lon });
        return c.focus();
      }
      return self.clients.openWindow(hasPos ? `./?focus=${lat},${lon}` : './');
    })
  );
});
