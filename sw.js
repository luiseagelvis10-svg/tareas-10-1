// Permite instalar la web como app y usarla sin internet con lo último que se cargó.
// - La página y las tareas: primero internet; si no hay conexión, lo guardado.
// - Íconos y adjuntos: lo guardado primero (no cambian).
const CACHE = "tareas-10-1-v1";
const BASE = ["./", "index.html", "manifest.webmanifest", "iconos/icono-192.png", "iconos/icono-512.png", "iconos/apple-touch-icon.png", "iconos/favicon-64.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function primeroInternet(req, clave){
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: "no-store" });
    if (res.ok) cache.put(clave, res.clone());
    return res;
  } catch {
    const guardado = await cache.match(clave);
    if (!guardado) throw new Error("sin conexión y sin copia guardada");
    // Marca la respuesta para que la página avise que está sin conexión
    const headers = new Headers(guardado.headers);
    headers.set("X-Sin-Conexion", "1");
    return new Response(await guardado.blob(), { status: 200, headers });
  }
}

async function primeroGuardado(req){
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(req);
  if (guardado) return guardado;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (e.request.mode === "navigate") e.respondWith(primeroInternet(e.request, "index.html"));
  else if (url.pathname.endsWith("/data/tareas.json")) e.respondWith(primeroInternet(e.request, "data/tareas.json"));
  else if (url.pathname.includes("/adjuntos/") || url.pathname.includes("/iconos/")) e.respondWith(primeroGuardado(e.request));
});
