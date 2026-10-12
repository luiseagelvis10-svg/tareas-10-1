// Funciones compartidas por actualizar.mjs y adjuntos.mjs.
export const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const MATERIAS = {
  "matematicas": "mat", "fisica": "fis", "quimica": "qui", "castellano - plan lector": "cas",
  "idioma extranjero ingles": "ing", "ciencias sociales, historia, geografia c. politica": "soc",
  "ciencias naturales y ed. ambiental": "nat", "filosofia": "fil", "ciencias economicas y politicas": "eco",
  "etica actitudes y en valores humanos": "eti", "educacion religiosa y agustinologia": "rel",
  "catedra socioemocional": "cat", "educacion fisica": "edf", "tecnologia e informatica": "tec",
  "cultura de emprendimiento": "emp", "danzas": "dan", "escuelas deportivas y ludicas": "dep",
  "convivencia escolar": "con"
};
export const MATERIAS_NOMBRES = ["Matemáticas","Física","Química","Castellano - Plan Lector","Idioma Extranjero Inglés","Ciencias Sociales, Historia, Geografía C. Política","Ciencias Naturales y Ed. Ambiental","Filosofía","Ciencias Económicas y Políticas","Ética Actitudes y en Valores Humanos","Educación Religiosa y Agustinología","Cátedra Socioemocional","Educación Física","Tecnología e Informática","Cultura de Emprendimiento","Danzas","Escuelas Deportivas y Lúdicas","Convivencia Escolar"];
export const materiaKey = nombre => MATERIAS[norm(nombre)] || "x-" + norm(nombre).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// "24/09/2026 4:59:00 p.m." -> "2026-09-24T16:59"
export function fechaHora(s) {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?\s*m/i);
  if (!m) throw new Error(`Fecha de registro no reconocida: "${s}"`);
  let h = +m[4] % 12;
  if (m[6].toLowerCase() === "p") h += 12;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T${String(h).padStart(2, "0")}:${m[5]}`;
}
// "9/11/2026" -> "2026-11-09"
export function fecha(s) {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) throw new Error(`Fecha de entrega no reconocida: "${s}"`);
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}
export const idTarea = (registro, asignatura) => `${fechaHora(registro)}|${materiaKey(asignatura.replace(/\s+/g, " ").trim())}`;
