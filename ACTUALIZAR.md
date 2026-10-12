# Actualización diaria (la ejecuta Claude a las 6:00 pm)

Objetivo: copiar las tareas de Academics a `data/tareas.json` y publicarlas en GitHub Pages.
No escribir nunca usuario ni contraseña de Academics, ni resolver captchas. Si no hay sesión, avisar a Luis y parar.

## Pasos

1. En el navegador integrado de Claude, abrir
   `https://academics.com.co/AcademicsV2Campestre/ConsultasExternos/newProcesosAlumno.aspx`.
2. Si la página redirige a `Login.aspx`, no hay sesión: enviar una notificación
   "Abre Claude e inicia sesión en Academics para actualizar las tareas de 10-1" y terminar.
3. Hacer clic en el enlace **TAREAS** del menú (es un postback, `ctl00$Main$lnkTareas`) y esperar a que exista
   la tabla `#ctl00_Main_grdTareas`.
4. Ejecutar en la página el contenido de `scripts/extraer-academics.js` (javascript_tool).
   - Si devuelve `{"error": ...}`, avisar y terminar sin tocar nada.
   - Si devuelve 0 filas, no continuar (puede ser una falla de Academics): avisar y terminar.
5. Guardar el JSON devuelto, tal cual, en `.cache/academics-raw.json`.
6. Ejecutar `node scripts/actualizar.mjs`. Leer el resumen (nuevas, cambiadas, quitadas).
7. Para cada tarea con `"revisar": true` en `data/tareas.json`:
   - Escribir `title`: corto (máx. ~55 caracteres), claro, en español, sin repetir el nombre de la materia.
     Ej.: "Quiz 2 de Ética", "Taller evaluativo #2 + evaluación escrita".
   - Reescribir `desc`: en segunda persona, ordenada, conservando TODOS los datos (páginas, número de palabras, materiales).
   - Revisar `type`: `"eval"` si es quiz, examen, evaluación o taller evaluativo; si no, `"act"`.
   - Si el texto dice claramente que la tarea es de otra materia que la registrada (como pasó con Kant: registrada en
     Religión pero era de Ética), cambiar `s` a la clave correcta y explicar en `note`.
   - Quitar `"revisar"`.
   - No cambiar `id`, `due`, `reg` ni `original`.
8. Validar: `node -e "JSON.parse(require('fs').readFileSync('data/tareas.json','utf8'))"`.
9. Si `git status --porcelain data/` muestra cambios:
   `git add data/tareas.json && git commit -m "Tareas actualizadas AAAA-MM-DD" && git push`.
   Si no hay cambios igual hacer commit y push, porque cambia la fecha de "Actualizado".
10. Avisar con una notificación corta solo si hubo tareas nuevas, cambiadas o quitadas
    (ej.: "2 tareas nuevas en 10-1: Física (jue 22), Inglés (vie 23)").

## Claves de materias (`s`)
mat Matemáticas · fis Física · qui Química · cas Castellano · ing Inglés · soc Sociales · nat C. Naturales ·
fil Filosofía · eco Económicas · eti Ética · rel Religión · cat Cátedra Socioemocional · edf Ed. Física ·
tec Tecnología · emp Emprendimiento · dan Danzas · dep Escuelas Deportivas · con Convivencia

## Privacidad
El repositorio es público. Solo se publican tareas, horario y nombres de profesores.
Nunca agregar nombre del estudiante, documento, notas, observador ni pagos.
