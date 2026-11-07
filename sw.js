/* Mesa Redonda del Taller — service worker
   Estrategia: la página (HTML) se pide SIEMPRE fresca a la red cuando hay
   conexión (así cada publicación se ve al abrir, sin reinstalar el acceso);
   los iconos y el manifiesto se sirven de la caché y se renuevan detrás.
   Sin conexión, se muestra la última copia guardada. */
var CACHE = "mesa-v1";

self.addEventListener("install", function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll(["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"]).catch(function(){});
  }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return; /* Supabase y demás: directo a la red, sin caché */

  var esDocumento = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html");
  if(esDocumento){
    e.respondWith(
      fetch(req, { cache: "no-store" }).then(function(resp){
        var copia = resp.clone();
        caches.open(CACHE).then(function(c){ c.put("index.html", copia); });
        return resp;
      }).catch(function(){
        return caches.match("index.html");
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function(hit){
      var red = fetch(req).then(function(resp){
        if(resp && resp.ok){
          var copia = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copia); });
        }
        return resp;
      }).catch(function(){ return hit; });
      return hit || red;
    })
  );
});
