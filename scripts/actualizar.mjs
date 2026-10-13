// Uso: node scripts/actualizar.mjs [ruta-del-json-extraido]
// Lee lo que devolvió extraer-academics.js y lo mezcla con data/tareas.json:
//  - tareas nuevas: se agregan con un título automático y "revisar": true
//  - tareas existentes: se conservan título/descripción/materia corregidos a mano
//    y solo se actualizan fecha de revisión, tipo y adjunto
//  - tareas futuras que ya no aparecen en Academics: se quitan (el profesor las borró)
//  - tareas pasadas que ya no aparecen: se conservan como historial
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { materiaKey, fechaHora, fecha } from "./comun.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rawPath = process.argv[2] || join(root, ".cache", "academics-raw.json");
const dataPath = join(root, "data", "tareas.json");

const raw = JSON.parse(readFileSync(rawPath, "utf8"));
if (raw.error) {
  console.error(`ERROR: ${raw.error} — no se actualizó nada.`);
  process.exit(2);
}
if (!Array.isArray(raw.filas)) {
  console.error("ERROR: el archivo no tiene 'filas'.");
  process.exit(2);
}

// Quita los "NOMBRE DE LA MATERIA - " repetidos al inicio y limpia espacios.
function limpiar(desc) {
  let d = desc.replace(/\t/g, " ").replace(/[ ]{2,}/g, " ");
  while (/^[A-ZÁÉÍÓÚÑÜ ,.]{4,} - /.test(d)) d = d.replace(/^[A-ZÁÉÍÓÚÑÜ ,.]{4,} - /, "");
  return d.split("\n").map(l => l.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function tituloAuto(desc) {
  let t = desc.split(/\n|(?<=[.:])\s/)[0].replace(/[:.]+$/, "").trim();
  if (t === t.toUpperCase()) t = t.charAt(0) + t.slice(1).toLowerCase();
  return t.length > 70 ? t.slice(0, 67).replace(/\s+\S*$/, "") + "…" : t;
}
const esEvaluacion = (tipo, desc) => /EVALUACION/i.test(tipo) || /\bquiz\b|evaluaci[oó]n escrita|examen|parcial/i.test(desc);

const previo = existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, "utf8")) : { tareas: [] };
const porId = new Map(previo.tareas.map(t => [t.id, t]));
const vistos = new Set();
const resumen = { nuevas: [], cambiadas: [], quitadas: [] };
const idsNuevas = [];

for (const f of raw.filas) {
  const materia = f.asignatura.replace(/\s+/g, " ").trim();
  const id = `${fechaHora(f.registro)}|${materiaKey(materia)}`;
  vistos.add(id);
  const due = fecha(f.entrega);
  const type = esEvaluacion(f.tipo, f.descripcion) ? "eval" : "act";
  const viejo = porId.get(id);
  if (viejo) {
    const cambios = [];
    if (viejo.due !== due) cambios.push(`fecha ${viejo.due} → ${due}`);
    if (viejo.type !== type) cambios.push(`tipo ${viejo.type} → ${type}`);
    if (viejo.original !== f.descripcion) cambios.push("descripción editada por el profesor");
    Object.assign(viejo, { due, type, pdf: f.adjunto, original: f.descripcion, materia });
    if (cambios.includes("descripción editada por el profesor")) viejo.revisar = true;
    if (cambios.length) resumen.cambiadas.push(`${id}: ${cambios.join(", ")}`);
  } else {
    const desc = limpiar(f.descripcion);
    const nueva = {
      id, s: materiaKey(materia), materia, due, reg: fecha(f.registro), type, pdf: f.adjunto,
      title: tituloAuto(desc), desc, original: f.descripcion, revisar: true
    };
    porId.set(id, nueva);
    resumen.nuevas.push(`${id} (${materia}, ${due}): ${nueva.title}`);
    idsNuevas.push(id);
  }
}

const hoy = raw.leido.slice(0, 10);
for (const [id, t] of porId) {
  if (!vistos.has(id) && t.due >= hoy) {
    porId.delete(id);
    resumen.quitadas.push(`${id} (${t.materia}, ${t.due}): ${t.title}`);
  }
}

const tareas = [...porId.values()].sort((a, b) => a.due.localeCompare(b.due) || a.id.localeCompare(b.id));
writeFileSync(dataPath, JSON.stringify({ actualizado: raw.leido, tareas }, null, 2) + "\n");
// Para scripts/notificar.mjs: qué tareas aparecieron en esta actualización
writeFileSync(join(root, ".cache", "nuevas.json"), JSON.stringify({ fecha: raw.leido, ids: idsNuevas }) + "\n");

console.log(`Tareas en Academics: ${raw.filas.length} · En la web: ${tareas.length}`);
for (const [k, arr] of Object.entries(resumen)) {
  console.log(`${k}: ${arr.length}`);
  arr.forEach(x => console.log("  - " + x));
}
const pendientes = tareas.filter(t => t.revisar).map(t => t.id);
if (pendientes.length) console.log(`Para revisar título/descripción (revisar: true): ${pendientes.join(" ; ")}`);
