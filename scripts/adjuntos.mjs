// Publica en la web los adjuntos que descargar-adjuntos.js dejó en la carpeta Descargas.
//
//   node scripts/adjuntos.mjs preparar
//     Mueve de Descargas los archivos "t101__..." (de descargar-adjuntos.js) a .cache/revision/
//     y extrae su texto a .cache/revision/<archivo>.txt para revisar datos personales.
//
//   node scripts/adjuntos.mjs publicar [--excluir 000,003]
//     Mueve los archivos revisados a adjuntos/<tarea>/ y los agrega a data/tareas.json.
//     --excluir deja fuera (y borra de .cache/revision) los que tienen datos personales.
//
//   node scripts/adjuntos.mjs conocidos
//     Imprime la lista para window.__t101Conocidos (adjuntos ya publicados).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, copyFileSync, unlinkSync, statSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";
import { homedir } from "node:os";
import { norm, materiaKey, MATERIAS_NOMBRES } from "./comun.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = join(root, "data", "tareas.json");
const revision = join(root, ".cache", "revision");
const descargas = join(homedir(), "Downloads");
const python = join(root, ".venv", "Scripts", "python.exe");
const [cmd, ...args] = process.argv.slice(2);

const leerDatos = () => JSON.parse(readFileSync(dataPath, "utf8"));
const seguro = n => {
  const ext = extname(n).toLowerCase();
  const base = norm(n.slice(0, n.length - ext.length)).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "archivo";
  return base.slice(0, 80) + ext;
};
const mover = (de, a) => { try { renameSync(de, a); } catch { copyFileSync(de, a); unlinkSync(de); } };

if (cmd === "conocidos") {
  const claves = leerDatos().tareas.flatMap(t => (t.files || []).map(f => f.clave));
  console.log(JSON.stringify(claves));
} else if (cmd === "preparar") {
  // Recoge de Descargas los archivos "t101__<registro>__<materia>__<nombre>"
  rmSync(revision, { recursive: true, force: true });
  mkdirSync(revision, { recursive: true });
  const slugMateria = Object.fromEntries(MATERIAS_NOMBRES.map(n => [n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), materiaKey(n)]));
  const listos = [];
  let num = 0;
  for (const f of readdirSync(descargas).sort()) {
    const m = f.match(/^t101__(\d{4}-\d{2}-\d{2})T(\d{2})(\d{2})__([a-z0-9-]+)__(.+)$/);
    if (!m) continue;
    const nombre = m[5].replace(/ \(\d+\)(?=\.[^.]+$)/, "");
    const key = slugMateria[m[4]] || "x-" + m[4];
    const meta = { id: `${m[1]}T${m[2]}:${m[3]}|${key}`, nombre, clave: `${m[1]}T${m[2]}${m[3]}|${nombre}` };
    const n = String(num++).padStart(3, "0");
    const destino = join(revision, `${n}__${seguro(nombre)}`);
    mover(join(descargas, f), destino);
    const texto = execFileSync(python, ["-I", join(root, "scripts", "texto.py"), destino], { encoding: "utf8" });
    writeFileSync(destino + ".txt", texto);
    writeFileSync(destino + ".json", JSON.stringify(meta));
    listos.push(`${n}  ${nombre}  (${meta.id}, ${Math.max(1, Math.round(statSync(destino).size / 1024))} KB)  → texto: ${destino}.txt`);
  }
  console.log(`Preparados ${listos.length}. Revisa cada .txt antes de publicar:`);
  listos.forEach(l => console.log("  " + l));
} else if (cmd === "publicar") {
  const i = args.indexOf("--excluir");
  const excluir = new Set(i >= 0 ? (args[i + 1] || "").split(",").map(s => s.trim()).filter(Boolean) : []);
  const datos = leerDatos();
  const porId = new Map(datos.tareas.map(t => [t.id, t]));
  const hechos = [], omitidos = [];
  for (const f of existsSync(revision) ? readdirSync(revision).filter(f => f.endsWith(".json")) : []) {
    const a = JSON.parse(readFileSync(join(revision, f), "utf8"));
    const archivo = join(revision, f.slice(0, -5));
    const num = f.split("__")[0];
    if (excluir.has(num)) { unlinkSync(archivo); omitidos.push(a.nombre); continue; }
    const t = porId.get(a.id);
    if (!t) { omitidos.push(`${a.nombre} (no se encontró la tarea; corre primero actualizar.mjs)`); continue; }
    const carpeta = t.id.replace(/[:|]/g, "-").replace("T", "-");
    mkdirSync(join(root, "adjuntos", carpeta), { recursive: true });
    const rel = `adjuntos/${carpeta}/${seguro(a.nombre)}`;
    mover(archivo, join(root, rel));
    t.files = (t.files || []).filter(x => x.clave !== a.clave);
    t.files.push({ name: a.nombre, path: rel, bytes: statSync(join(root, rel)).size, clave: a.clave });
    hechos.push(`${a.nombre} → ${rel}`);
  }
  writeFileSync(dataPath, JSON.stringify(datos, null, 2) + "\n");
  rmSync(revision, { recursive: true, force: true });
  console.log(`Publicados ${hechos.length}:`); hechos.forEach(h => console.log("  " + h));
  if (omitidos.length) { console.log(`No publicados ${omitidos.length}:`); omitidos.forEach(h => console.log("  " + h)); }
} else {
  console.log("Uso: node scripts/adjuntos.mjs preparar | publicar [--excluir 000,001] | conocidos");
  process.exit(1);
}
