const CACHE_NAME='cbe-admin-desktop-v1-20260528';
const APP_SHELL=['./','./index.html','./styles.css','./admin.js','./manifest.webmanifest','./icons/admin-icon.svg'];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).catch(()=>{}))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;if(new URL(req.url).origin!==self.location.origin)return;event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)).catch(()=>{});return res}).catch(()=>caches.match(req).then(cached=>cached||caches.match('./index.html'))))});
