// Se ejecuta en Chrome (Claude in Chrome), en Academics (newProcesosAlumno.aspx), con la
// planilla de TAREAS cargada. Lee las filas de la planilla y las descarga como el archivo
// "t101-tareas.json" en la carpeta Descargas (Chrome corta las respuestas largas, por eso
// no se devuelven directamente). Devuelve un resumen corto.
// Solo lee datos de las tareas: nada del estudiante, notas ni pagos.
(() => {
  const tabla = document.getElementById("ctl00_Main_grdTareas");
  if (!tabla) {
    const login = /Login\.aspx/i.test(location.href) || document.getElementById("cLogin_UserName");
    return JSON.stringify({ error: login ? "SIN_SESION" : "SIN_TABLA_TAREAS", url: location.pathname });
  }
  const filas = [...tabla.querySelectorAll("tr")]
    .filter(tr => tr.cells.length >= 4 && /\d+\/\d+\/\d{4}/.test(tr.cells[0].innerText))
    .map(tr => {
      const c = tr.cells;
      const desc = c[3].querySelector("[id$='LblDescTarea']");
      const tipo = c[3].querySelector("[id$='LblDescTareaTipo']");
      return {
        registro: c[0].innerText.trim(),
        entrega: c[1].innerText.trim(),
        asignatura: c[2].innerText.trim(),
        descripcion: (desc ? desc.innerText : c[3].innerText).trim(),
        tipo: (tipo ? tipo.innerText : "").trim(),
        adjunto: !!tr.querySelector("[id$='imgAdjunto']")
      };
    });
  const json = JSON.stringify({ leido: new Date().toISOString(), filas });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  a.download = "t101-tareas.json";
  document.body.appendChild(a); a.click(); a.remove();
  return JSON.stringify({ ok: true, filas: filas.length, archivo: "t101-tareas.json" });
})();
