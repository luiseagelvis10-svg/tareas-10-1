// Se ejecuta en Chrome (Claude in Chrome), en Academics, con la planilla de TAREAS cargada.
// Descarga a la carpeta Descargas los adjuntos que todavía no están en la web. Cada archivo
// lleva en el nombre la tarea a la que pertenece:
//   t101__<fecha de registro AAAA-MM-DDTHHMM>__<materia>__<nombre original>
// y scripts/adjuntos.mjs los recoge de ahí. Antes de ejecutarlo se define:
//   window.__t101Conocidos = [...]   (lo imprime: node scripts/adjuntos.mjs conocidos)
// Academics entrega cada archivo en tres postbacks: abrir lista → elegir archivo → descargar.
// Corre en segundo plano: devuelve "iniciado"; consultar JSON.stringify(window.__t101)
// hasta que estado sea "terminado".
window.__t101 = { estado: "trabajando", descargados: 0 };
(async () => {
  const fin = extra => { window.__t101 = { ...window.__t101, estado: "terminado", ...extra }; };
  const tabla = document.getElementById("ctl00_Main_grdTareas");
  if (!tabla) return fin({ error: /Login\.aspx/i.test(location.href) ? "SIN_SESION" : "SIN_TABLA_TAREAS" });
  const conocidos = new Set(window.__t101Conocidos || []);
  const accion = document.forms[0].action;
  const post = fd => fetch(accion, { method: "POST", body: fd, credentials: "include" });
  const doc = async r => new DOMParser().parseFromString(await r.text(), "text/html");
  const datos = (form, extra) => { const fd = new URLSearchParams(new FormData(form)); for (const [k, v] of Object.entries(extra)) fd.set(k, v); return fd; };
  const pausa = ms => new Promise(r => setTimeout(r, ms));
  const slug = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const regIso = s => {
    const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?\s*m/i);
    if (!m) return null;
    const h = (+m[4] % 12) + (m[6].toLowerCase() === "p" ? 12 : 0);
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}T${String(h).padStart(2, "0")}${m[5]}`;
  };

  const errores = [], nombres = [];
  for (const tr of [...tabla.rows].filter(tr => tr.querySelector("[id$='imgAdjunto']"))) {
    const reg = regIso(tr.cells[0].innerText.trim());
    const materia = slug(tr.cells[2].innerText);
    if (!reg) { errores.push(`fecha rara: ${tr.cells[0].innerText.trim()}`); continue; }
    const b1 = tr.querySelector("[id$='imgAdjunto']").name;
    const d1 = await doc(await post(datos(document.forms[0], { [b1 + ".x"]: "5", [b1 + ".y"]: "5" })));
    const lista = d1.getElementById("ctl00_Main_gvFiles");
    if (!lista) { errores.push(`${reg} ${materia}: sin lista de adjuntos`); continue; }
    for (const fila of [...lista.rows].slice(1)) {
      const boton = fila.querySelector("[id$='imgDescargarAdjunto']");
      const nombre = fila.cells[0].innerText.trim().replace(/[\\/:*?"<>|]/g, "_");
      if (!boton || conocidos.has(`${reg}|${nombre}`)) continue;
      const d2 = await doc(await post(datos(d1.forms[0], { [boton.name + ".x"]: "5", [boton.name + ".y"]: "5" })));
      const r3 = await post(datos(d2.forms[0], { __EVENTTARGET: "ctl00$Main$lnkImprimirAdjuntoUPDPANEL", __EVENTARGUMENT: "" }));
      if (/html/i.test(r3.headers.get("content-type") || "")) { errores.push(`${nombre}: Academics no entregó el archivo`); continue; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await r3.blob());
      a.download = `t101__${reg}__${materia}__${nombre}`;
      document.body.appendChild(a); a.click(); a.remove();
      await pausa(700);
      window.__t101.descargados++;
      nombres.push(nombre);
    }
  }
  fin({ errores, nombres });
})().catch(e => { window.__t101 = { estado: "terminado", error: String(e) }; });
"iniciado";
