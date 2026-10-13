# Actualización diaria (la ejecuta Claude a las 6:00 pm)

Objetivo: copiar las tareas y sus adjuntos de Academics a la web y publicarlas en GitHub Pages.
Nunca escribir usuario ni contraseña de Academics, ni resolver captchas. Si no hay sesión, avisar a Luis y parar.
Todo se trabaja desde la carpeta `C:\Users\Damer\tareas-10-1`.

## 1. Tareas (en Google Chrome, con Claude in Chrome)

1. `tabs_context_mcp` y luego abrir una pestaña nueva (`tabs_create_mcp`) en
   `https://academics.com.co/AcademicsV2Campestre/ConsultasExternos/newProcesosAlumno.aspx`.
   Si Chrome no está conectado, notificar "Abre Google Chrome para actualizar las tareas de 10-1" y terminar.
2. Si la página redirige a `Login.aspx`, no hay sesión: notificar
   "Inicia sesión en Academics en Chrome y luego pulsa 'Ejecutar ahora' en 'Actualizar tareas 10-1'" y terminar.
3. Si no existe la tabla `#ctl00_Main_grdTareas`, hacer clic en el enlace **TAREAS** del menú y esperar a que aparezca.
4. Ejecutar en la página el contenido de `scripts/extraer-academics.js` (javascript_tool).
   - Si devuelve `{"error": ...}` o 0 filas, notificar y terminar sin tocar nada.
5. Guardar el JSON devuelto, tal cual, en `.cache/academics-raw.json`.
6. Ejecutar `node scripts/actualizar.mjs` y leer el resumen.
7. Para cada tarea con `"revisar": true` en `data/tareas.json`:
   - `title`: corto (máx. ~55 caracteres), claro, en español, sin repetir el nombre de la materia.
   - `desc`: en segunda persona, ordenada, conservando TODOS los datos (páginas, número de palabras, materiales).
   - `type`: `"eval"` si es quiz, examen, evaluación o taller evaluativo; si no, `"act"`.
   - Si el texto dice claramente que la tarea es de otra materia que la registrada, cambiar `s` y explicar en `note`.
   - Quitar `"revisar"`. No cambiar `id`, `due`, `reg`, `original` ni `files`.

## 2. Adjuntos (misma pestaña de Chrome)

1. `node scripts/adjuntos.mjs conocidos` → copia la lista que imprime.
2. En la pestaña de Academics ejecutar `window.__t101Conocidos = <esa lista>;` seguido del contenido de
   `scripts/descargar-adjuntos.js` (en la misma llamada). Devuelve "iniciado" y trabaja en segundo plano.
3. Consultar cada pocos segundos con
   `for (let i=0;i<20 && window.__t101.estado!=='terminado';i++) await new Promise(r=>setTimeout(r,2000)); JSON.stringify(window.__t101)`
   hasta que `estado` sea `"terminado"`. Si trae `error`, notificar y seguir con la parte 3 (Publicar) solo para las tareas.
   Si `descargados` es 0, saltar a la parte 3.
   (Academics ya tiene permiso en Chrome para descargar varios archivos. Si aun así no aparecen en Descargas, notificar a Luis.)
4. Esperar 2 segundos y ejecutar `node scripts/adjuntos.mjs preparar`: mueve los archivos `t101__...` de Descargas
   a `.cache/revision/` y extrae su texto.
5. **Revisión de privacidad**: leer cada `.txt` que indica el resumen. Excluir un archivo si contiene datos
   personales de estudiantes: nombres de estudiantes en listas, notas, documentos de identidad, teléfonos,
   correos o direcciones de estudiantes o familias. Nombres de profesores, del colegio o de autores citados sí se permiten.
   Si un .txt sale vacío o "[no se pudo leer]" (por ejemplo un PDF escaneado), excluirlo y avisarlo en la notificación.
6. `node scripts/adjuntos.mjs publicar --excluir <números a excluir separados por coma>` (sin `--excluir` si no hay).

## 3. Publicar

1. Validar: `node -e "JSON.parse(require('fs').readFileSync('data/tareas.json','utf8'))"`.
2. `git add data adjuntos && git commit -m "Tareas actualizadas AAAA-MM-DD" && git push`
   (el mensaje termina con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`).
3. Avisos a los celulares: `node scripts/notificar.mjs`. Junta las tareas nuevas de hoy y lo que se revisa el
   siguiente día de clase, y lo envía a quienes activaron los avisos. Si no hay nada que avisar, no envía nada.
   Si falla, anotarlo en la notificación a Luis pero no repetir el envío (para no mandar avisos dobles).
   Ejecutarlo solo DESPUÉS del `git push`, para que al tocar el aviso la web ya tenga las tareas nuevas.
4. Cerrar la pestaña de Chrome que se abrió.
5. Notificar a Luis solo si hubo cambios: tareas nuevas/cambiadas/quitadas y adjuntos publicados o excluidos
   (ej.: "10-1: 2 tareas nuevas (Física jue 22, Inglés vie 23) y 1 adjunto nuevo").

## Claves de materias (`s`)
mat Matemáticas · fis Física · qui Química · cas Castellano · ing Inglés · soc Sociales · nat C. Naturales ·
fil Filosofía · eco Económicas · eti Ética · rel Religión · cat Cátedra Socioemocional · edf Ed. Física ·
tec Tecnología · emp Emprendimiento · dan Danzas · dep Escuelas Deportivas · con Convivencia

## Privacidad
El repositorio es público. Solo se publican tareas, horario, nombres de profesores y adjuntos revisados.
Nunca agregar nombre del estudiante, documento, notas, observador ni pagos.
