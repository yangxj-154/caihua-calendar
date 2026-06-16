var CACHE='caihua-cal-v26';
var ASSETS=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',function(e){
 e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS)}));
 self.skipWaiting();
});
self.addEventListener('activate',function(e){
 e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}));
 self.clients.claim();
});
self.addEventListener('fetch',function(e){
 e.respondWith(
  caches.match(e.request).then(function(r){
   return r||fetch(e.request).then(function(res){
    if(res&&res.status===200&&res.type==='basic'){
     var clone=res.clone();
     caches.open(CACHE).then(function(c){c.put(e.request,clone)});
    }
    return res;
   });
  })
 );
});
