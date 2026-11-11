const C='bme-v2',SHELL=['./','./index.html','./manifest.webmanifest','./firebase-config.js','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.hostname.endsWith('googleapis.com'))return;
 e.respondWith(caches.match(r).then(h=>{const n=fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const cl=res.clone();caches.open(C).then(c=>c.put(r,cl))}return res}).catch(()=>h);return h||n}))});
