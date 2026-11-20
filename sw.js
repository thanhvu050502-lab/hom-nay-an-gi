// Service worker: giữ khung app trên máy để mở được khi mất mạng.
const V = 'hnag-v2-6';
const SHELL = ['/', '/index.html', '/css/app.css', '/js/main.js', '/js/store.js', '/js/logic.js', '/js/catalog.js', '/js/ui.js', '/js/config.js', '/manifest.webmanifest', '/icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.pathname.startsWith('/api/') || /supabase\.co$/.test(u.hostname) || /open-meteo/.test(u.hostname)) return;
  const cdn = /unpkg\.com|esm\.sh|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com|tile\.openstreetmap\.org/.test(u.hostname);
  if (u.origin !== location.origin && !cdn) return;
  // trang và mã của app: mạng trước, hết mạng thì dùng bản đã lưu
  if (u.origin === location.origin){
    e.respondWith(fetch(r).then(res => { if (res.ok){ const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('/index.html') : undefined))));
    return;
  }
  // thư viện, font, ô bản đồ: dùng bản đã lưu, cập nhật nền
  e.respondWith(caches.match(r).then(m => { const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')){ const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => m); return m || net; }));
});
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type:'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('/'))); });
