// Envía el aviso diario a los celulares que activaron los avisos.
//
//   node scripts/notificar.mjs              arma el aviso del día y lo envía (si hay algo que avisar)
//   node scripts/notificar.mjs --ver        solo muestra el aviso, no envía nada
//   node scripts/notificar.mjs --prueba     envía un aviso de prueba
//   node scripts/notificar.mjs --reenviar   vuelve a enviar el aviso del día como uno nuevo
//                                           (el iPhone reemplaza sin sonar los avisos con la misma etiqueta)
//
// El aviso junta: tareas nuevas de hoy (.cache/nuevas.json, lo escribe actualizar.mjs)
// y lo que se revisa el siguiente día de clase. Las llaves están fuera del proyecto,
// en C:\Users\Damer\.tareas-10-1\avisos.json, y nunca se suben a GitHub.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import webpush from "web-push";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const llaves = JSON.parse(readFileSync(join(homedir(), ".tareas-10-1", "avisos.json"), "utf8"));
const { tareas } = JSON.parse(readFileSync(join(root, "data", "tareas.json"), "utf8"));
const modo = process.argv[2] || "";

const CORTO = { mat: "Matemáticas", fis: "Física", qui: "Química", cas: "Castellano", ing: "Inglés", soc: "Sociales",
  nat: "C. Naturales", fil: "Filosofía", eco: "Económicas", eti: "Ética", rel: "Religión", cat: "Socioemocional",
  edf: "Ed. Física", tec: "Tecnología", emp: "Emprendimiento", dan: "Danzas", dep: "Esc. Deportivas", con: "Convivencia" };
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const materia = t => CORTO[t.s] || t.materia || "Otra materia";
const lista = arr => arr.length <= 1 ? arr.join("") : arr.slice(0, -1).join(", ") + " y " + arr.at(-1);

function armarAviso(){
  const hoy = new Date();
  // Tareas nuevas: solo si la actualización de hoy las encontró
  let nuevas = [];
  const rutaNuevas = join(root, ".cache", "nuevas.json");
  if (existsSync(rutaNuevas)){
    const n = JSON.parse(readFileSync(rutaNuevas, "utf8"));
    if (n.fecha && iso(new Date(n.fecha)) === iso(hoy)) nuevas = tareas.filter(t => n.ids.includes(t.id));
  }
  // Siguiente día de clase (viernes y sábado → lunes)
  const sig = new Date(hoy); sig.setDate(sig.getDate() + 1);
  while (sig.getDay() === 0 || sig.getDay() === 6) sig.setDate(sig.getDate() + 1);
  const cuando = sig.getDay() === 1 && hoy.getDay() >= 5 ? "El lunes" : "Mañana";
  const proximas = tareas.filter(t => t.due === iso(sig));

  const lineas = [];
  if (proximas.length) lineas.push(`${cuando} se revisa: ${lista(proximas.map(t => `${materia(t)} (${t.title})`))}.`);
  if (nuevas.length){
    const d = t => { const f = new Date(t.due + "T12:00"); return `${DIAS[f.getDay()]} ${f.getDate()}`; };
    lineas.push(`${nuevas.length === 1 ? "Tarea nueva" : nuevas.length + " tareas nuevas"}: ${lista(nuevas.map(t => `${materia(t)}, ${d(t)}`))}.`);
  }
  if (!lineas.length) return null;
  const titulo = proximas.length
    ? `${cuando} (${DIAS_LARGOS[sig.getDay()]}): ${proximas.length} ${proximas.length === 1 ? "entrega" : "entregas"}`
    : `${nuevas.length === 1 ? "Hay una tarea nueva" : "Hay tareas nuevas"} en 10-1`;
  const primera = proximas[0] || nuevas[0];
  return {
    title: titulo,
    body: lineas.join("\n"),
    url: "./" + (primera ? "#t-" + primera.id.replace(/[^0-9a-z]+/gi, "-") : ""),
    tag: "tareas-10-1-" + iso(hoy) + "-" + hoy.getHours() + pad(hoy.getMinutes()) // etiqueta única: el iPhone no reemplaza en silencio
  };
}

const aviso = modo === "--prueba"
  ? { title: "Avisos activados", body: "Así te llegará el resumen de las tareas de 10-1 a las 6 pm.", url: "./", tag: "prueba" }
  : armarAviso();
if (aviso && modo === "--reenviar") aviso.tag += "-" + Date.now();

if (!aviso){ console.log("Hoy no hay nada que avisar (sin tareas nuevas ni entregas el próximo día de clase)."); process.exit(0); }
console.log(`Aviso:\n  ${aviso.title}\n  ${aviso.body.replace(/\n/g, "\n  ")}`);
if (modo === "--ver") process.exit(0);

webpush.setVapidDetails(llaves.contacto, llaves.vapidPublica, llaves.vapidPrivada);
const auth = { Authorization: `Bearer ${llaves.claveEnvio}` };
const r = await fetch(`${llaves.servidor}/suscripciones`, { headers: auth });
if (!r.ok){ console.error(`ERROR: el servidor de avisos respondió ${r.status}`); process.exit(2); }
const { suscripciones } = await r.json();

let enviados = 0;
const vencidas = [];
await Promise.all(suscripciones.map(async s => {
  try {
    await webpush.sendNotification(s, JSON.stringify(aviso), { TTL: 12 * 3600, urgency: "normal" });
    enviados++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) vencidas.push(s.endpoint); // el celular desactivó los avisos
    else console.error(`  no se pudo enviar a un celular (${e.statusCode || e.message})`);
  }
}));
if (vencidas.length){
  await fetch(`${llaves.servidor}/borrar`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ endpoints: vencidas }) });
}
console.log(`Enviado a ${enviados} de ${suscripciones.length} celulares${vencidas.length ? ` (${vencidas.length} ya no reciben avisos y se quitaron)` : ""}.`);
