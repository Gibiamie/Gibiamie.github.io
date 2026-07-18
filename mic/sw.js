const CACHE='mic-mobile-v20';
const CORE=['./','index.html','manifest.webmanifest','style.css?v=12','indicators.css?v=12','app-core.js?v=12','app-main.js?v=12','virtual.js?v=12','indicators.js?v=12','chart-workspace-v10.css?v=12','indicators-v10-patch.js?v=12','chart-workspace-v10.js?v=20','chart-workspace-v13.css?v=20','indicators-v13-patch.js?v=20','chart-workspace-v13.js?v=20','chart-stability-v16.css?v=20','chart-stability-v16.js?v=20','profile-risk-v14.css?v=20','profile-risk-v14.js?v=20','asset-catalog-v15.js?v=20','catalog-ui-v20.css?v=20','catalog-ui-v20.js?v=20','quality-fixes-v17.css?v=20','quality-fixes-v17.js?v=20','price-integrity-v18.css?v=20','price-integrity-v18.js?v=20','gateway-tutorial-v19.css?v=20','gateway-tutorial-v19.js?v=20','data/supplemental-assets.json','data/history/QQQI.json','data-governance-v11.css?v=12','data-governance-v11.js?v=12'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))]))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  const networkFirst=u.pathname.includes('/data/')||e.request.mode==='navigate'||/\.(js|css)$/.test(u.pathname);
  if(networkFirst){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});