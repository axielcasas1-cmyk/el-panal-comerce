const CACHE='dragolaida-v10lite3-shell';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./d1.js','./d2.js','./d3.js','./b1.js','./b2.js','./b3.js','./avatar-bind.js','./lite-patch.js','../dragolaida-v10/core.js','../dragolaida-v10/app.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{if(r&&r.ok&&new URL(e.request.url).origin===location.origin){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}return r;}).catch(()=>cached)));});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting();});