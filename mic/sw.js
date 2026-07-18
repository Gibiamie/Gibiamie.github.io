const CACHE='mic-mobile-v8';
const CORE=['./','index.html','manifest.webmanifest','style.css?v=8','indicators.css?v=8','app-core.js?v=8','app-main.js?v=8','virtual.js?v=8','indicators.js?v=8'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  const networkFirst=u.pathname.includes('/data/')||e.request.mode==='navigate'||/\.(js|css)$/.test(u.pathname);
  if(networkFirst){
    e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});