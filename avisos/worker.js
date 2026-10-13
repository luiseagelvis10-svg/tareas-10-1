// Servidor de avisos de Tareas 10-1 (Cloudflare Worker + KV).
// Solo guarda las "direcciones" anónimas (suscripciones push) de los celulares que
// activaron los avisos. No guarda nombres, correos ni teléfonos.
//
//   POST /suscribir      cuerpo: la suscripción push del navegador
//   POST /desuscribir    cuerpo: { endpoint }
//   GET  /suscripciones  solo con la clave privada (Authorization: Bearer ...) → lista para enviar
//   POST /borrar         solo con la clave privada, cuerpo: { endpoints: [...] } → quita las vencidas
const ORIGEN = "https://luiseagelvis10-svg.github.io";
const MAX_BYTES = 4096;

const cors = req => {
  const o = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": o === ORIGEN || /^http:\/\/localhost:\d+$/.test(o || "") ? o : ORIGEN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
};
const json = (req, datos, status = 200) =>
  new Response(JSON.stringify(datos), { status, headers: { "Content-Type": "application/json", ...cors(req) } });

// La clave de cada suscripción es un resumen del endpoint (no se puede revertir)
async function clave(endpoint){
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return "s:" + [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}

const esPushValido = s =>
  s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000 &&
  s.keys && typeof s.keys.p256dh === "string" && typeof s.keys.auth === "string";

async function leerJson(req){
  const txt = await req.text();
  if (txt.length > MAX_BYTES) throw new Error("demasiado grande");
  return JSON.parse(txt);
}

function autorizado(req, env){
  const a = req.headers.get("Authorization") || "";
  return env.CLAVE_ENVIO && a === `Bearer ${env.CLAVE_ENVIO}`;
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });

    try {
      if (req.method === "POST" && url.pathname === "/suscribir"){
        const s = await leerJson(req);
        if (!esPushValido(s)) return json(req, { ok: false, error: "suscripción inválida" }, 400);
        const limpia = { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
        await env.AVISOS.put(await clave(s.endpoint), JSON.stringify(limpia), { metadata: { desde: Date.now() } });
        return json(req, { ok: true });
      }
      if (req.method === "POST" && url.pathname === "/desuscribir"){
        const { endpoint } = await leerJson(req);
        if (typeof endpoint !== "string") return json(req, { ok: false }, 400);
        await env.AVISOS.delete(await clave(endpoint));
        return json(req, { ok: true });
      }
      if (req.method === "GET" && url.pathname === "/suscripciones"){
        if (!autorizado(req, env)) return json(req, { ok: false }, 401);
        const todas = [];
        let cursor;
        do {
          const lista = await env.AVISOS.list({ prefix: "s:", cursor });
          for (const k of lista.keys){ const v = await env.AVISOS.get(k.name); if (v) todas.push(JSON.parse(v)); }
          cursor = lista.list_complete ? null : lista.cursor;
        } while (cursor);
        return json(req, { ok: true, suscripciones: todas });
      }
      if (req.method === "POST" && url.pathname === "/borrar"){
        if (!autorizado(req, env)) return json(req, { ok: false }, 401);
        const { endpoints } = await leerJson(req);
        for (const e of endpoints || []) await env.AVISOS.delete(await clave(e));
        return json(req, { ok: true, borradas: (endpoints || []).length });
      }
      if (url.pathname === "/") return json(req, { ok: true, servicio: "avisos Tareas 10-1" });
      return json(req, { ok: false }, 404);
    } catch {
      return json(req, { ok: false, error: "petición inválida" }, 400);
    }
  }
};
