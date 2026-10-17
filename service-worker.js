/* =========================================================
   SERVICE WORKER · Mi biblioteca
   Sube VERSION cada vez que cambies index.html, el manifest o
   los iconos: así el navegador descarga la nueva versión y
   borra las cachés antiguas.
   ========================================================= */
const VERSION = 'v9';
const SHELL_CACHE  = `biblioteca-shell-${VERSION}`;
const FONT_CACHE   = 'biblioteca-fuentes';
const COVER_CACHE  = 'biblioteca-portadas';
const MAX_COVERS   = 200;

/* Archivos de la propia app: se guardan al instalar */
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

/* APIs de búsqueda de portadas: siempre en red, nunca en caché */
const NETWORK_ONLY = /^https:\/\/(www\.googleapis\.com\/books|openlibrary\.org\/search|query\.wikidata\.org)/;

/* ---------- Instalación: precarga la app ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ---------- Activación: limpia versiones antiguas ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith('biblioteca-shell-') && k !== SHELL_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ---------- Peticiones ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (NETWORK_ONLY.test(req.url)) return;

  // Página: red primero (para ver siempre la última versión), caché si no hay conexión
  if (req.mode === 'navigate'){
    event.respondWith(networkFirst(req));
    return;
  }

  // Archivos propios (manifest, iconos): caché primero
  if (url.origin === self.location.origin){
    event.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  // Google Fonts: respuesta inmediata desde caché y actualización en segundo plano
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    event.respondWith(staleWhileRevalidate(req, FONT_CACHE));
    return;
  }

  // Librería del escáner (html5-qrcode, solo en navegadores sin lector propio): disponible también sin conexión
  if (url.hostname === 'cdnjs.cloudflare.com'){
    event.respondWith(staleWhileRevalidate(req, 'biblioteca-librerias'));
    return;
  }

  // Portadas de libros (<img> y fondos CSS). Las peticiones CORS (lectura del
  // color de la portada) se dejan pasar a la red: una respuesta opaca guardada
  // en caché rompería el canvas.
  if (req.destination === 'image' && req.mode === 'no-cors'){
    event.respondWith(cacheFirst(req, COVER_CACHE, MAX_COVERS));
  }
});

/* ---------- Estrategias ---------- */
async function networkFirst(req){
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put('./index.html', res.clone());
    return res;
  } catch(e){
    return (await cache.match(req, { ignoreSearch:true }))
        || (await cache.match('./index.html'))
        || Response.error();
  }
}

async function cacheFirst(req, cacheName, maxEntries){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque'){
      await cache.put(req, res.clone());
      if (maxEntries) trim(cache, maxEntries);
    }
    return res;
  } catch(e){
    return Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const update = fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  }).catch(() => hit || Response.error());
  return hit || update;
}

/* Mantiene la caché de portadas por debajo de un límite (borra las más antiguas) */
async function trim(cache, max){
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
