// Envía el aviso diario a los celulares que activaron los avisos.
//
//   node scripts/notificar.mjs              envía hasta dos avisos: lo de mañana y las tareas nuevas (si hay)
//   node scripts/notificar.mjs --ver        solo muestra el aviso, no envía nada
//   node scripts/notificar.mjs --prueba     envía los dos tipos de aviso marcados como prueba
//   node scripts/notificar.mjs --solo-nuevas  solo el aviso de tareas nuevas (actualización a mano después de las 6 pm)
//   node scripts/notificar.mjs --tarde     recordatorio de las 3 pm (solo lo de mañana; domingo a jueves)
//   node scripts/notificar.mjs --noche      recordatorio de las 9 pm (solo lo de mañana; domingo a jueves)
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

const enlace = t => "./" + (t ? "#t-" + t.id.replace(/[^0-9a-z]+/gi, "-") : "");
const corta = t => { const f = new Date(t.due + "T12:00"); return `${DIAS[f.getDay()]} ${f.getDate()}`; };
let unico = 0;
const etiqueta = (tipo, hoy) => `tareas-10-1-${tipo}-${iso(hoy)}-${hoy.getHours()}${pad(hoy.getMinutes())}-${unico++}`; // única: el iPhone no reemplaza en silencio

// Dos avisos separados: lo que se revisa el siguiente día de clase y las tareas nuevas de hoy.
// soloRecordatorio: para los avisos de las 3 pm y 9 pm (sin tareas nuevas, con otro título)
function armarAvisos(soloRecordatorio = ""){
  const hoy = new Date();
  const avisos = [];

  // 1. Siguiente día de clase (viernes y sábado → lunes)
  const sig = new Date(hoy); sig.setDate(sig.getDate() + 1);
  while (sig.getDay() === 0 || sig.getDay() === 6) sig.setDate(sig.getDate() + 1);
  const cuando = sig.getDay() === 1 && hoy.getDay() >= 5 ? "El lunes" : "Mañana";
  const proximas = tareas.filter(t => t.due === iso(sig));
  const prefijo = { tarde: "Recordatorio · ", noche: "Antes de dormir · " }[soloRecordatorio] || "";
  if (proximas.length) avisos.push({
    title: `${prefijo}${cuando} (${DIAS_LARGOS[sig.getDay()]}): ${proximas.length} ${proximas.length === 1 ? "entrega" : "entregas"}`,
    body: proximas.map(t => `• ${materia(t)}: ${t.title}`).join("\n"),
    url: enlace(proximas[0]),
    tag: etiqueta("manana", hoy)
  });

  if (soloRecordatorio) return avisos;

  // 2. Tareas nuevas: solo si la actualización de hoy las encontró
  const rutaNuevas = join(root, ".cache", "nuevas.json");
  let nuevas = [];
  if (existsSync(rutaNuevas)){
    const n = JSON.parse(readFileSync(rutaNuevas, "utf8"));
    if (n.fecha && iso(new Date(n.fecha)) === iso(hoy)) nuevas = tareas.filter(t => n.ids.includes(t.id));
  }
  if (nuevas.length) avisos.push({
    title: nuevas.length === 1 ? `Tarea nueva de ${materia(nuevas[0])}` : `${nuevas.length} tareas nuevas en 10-1`,
    body: nuevas.map(t => `• ${materia(t)} (se revisa el ${corta(t)}): ${t.title}`).join("\n"),
    url: enlace(nuevas[0]),
    tag: etiqueta("nuevas", hoy)
  });
  return avisos;
}

let avisos;
if (modo === "--prueba"){
  // Muestra cómo se ven los dos tipos, marcados como prueba
  const hoy = new Date(), ej = tareas.filter(t => t.due >= iso(hoy)).slice(0, 2);
  avisos = [
    { title: "Prueba · Mañana: 2 entregas", body: ej.map(t => `• ${materia(t)}: ${t.title}`).join("\n"), url: "./", tag: etiqueta("prueba1", hoy) },
    { title: "Prueba · 2 tareas nuevas en 10-1", body: ej.map(t => `• ${materia(t)} (se revisa el ${corta(t)}): ${t.title}`).join("\n"), url: "./", tag: etiqueta("prueba2", hoy) }
  ];
} else if (modo === "--solo-nuevas"){
  // Para una actualización hecha a mano después de las 6 pm: solo el aviso de tareas nuevas
  avisos = armarAvisos().filter(a => a.tag.includes("-nuevas-"));
} else if (modo === "--tarde" || modo === "--noche"){
  // Recordatorios de las 3 pm y 9 pm: solo las noches antes de un día de clase (domingo a jueves)
  const dia = new Date().getDay();
  avisos = dia >= 0 && dia <= 4 ? armarAvisos(modo.slice(2)) : [];
} else avisos = armarAvisos();

if (!avisos.length){ console.log("Hoy no hay nada que avisar (sin tareas nuevas ni entregas el próximo día de clase)."); process.exit(0); }
for (const a of avisos) console.log(`Aviso:
  ${a.title}
  ${a.body.replace(/\n/g, "\n  ")}`);
if (process.argv.includes("--ver")) process.exit(0); // --ver también sirve con --tarde o --noche

webpush.setVapidDetails(llaves.contacto, llaves.vapidPublica, llaves.vapidPrivada);
const auth = { Authorization: `Bearer ${llaves.claveEnvio}` };
const r = await fetch(`${llaves.servidor}/suscripciones`, { headers: auth });
if (!r.ok){ console.error(`ERROR: el servidor de avisos respondió ${r.status}`); process.exit(2); }
const { suscripciones } = await r.json();

const vencidas = new Set();
for (const aviso of avisos){ // uno tras otro, para que lleguen en orden
  let enviados = 0;
  await Promise.all(suscripciones.filter(s => !vencidas.has(s.endpoint)).map(async s => {
    try {
      await webpush.sendNotification(s, JSON.stringify(aviso), { TTL: 12 * 3600, urgency: "normal" });
      enviados++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) vencidas.add(s.endpoint); // el celular desactivó los avisos
      else console.error(`  no se pudo enviar a un celular (${e.statusCode || e.message})`);
    }
  }));
  console.log(`«${aviso.title}» enviado a ${enviados} de ${suscripciones.length} celulares.`);
  await new Promise(r => setTimeout(r, 1500));
}
if (vencidas.size){
  await fetch(`${llaves.servidor}/borrar`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify({ endpoints: [...vencidas] }) });
  console.log(`${vencidas.size} celulares ya no reciben avisos y se quitaron.`);
}
