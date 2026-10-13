# Tareas 10-1

Calendario de tareas del curso 10-1 del Colegio Agustiniano Campestre, con estilo del Calendario de Apple.
Cada tarea aparece en la hora de clase en que se revisa, con su importancia (materia principal o secundaria, y si es evaluación).

- `index.html`: la web (sin dependencias, se publica con GitHub Pages).
- `data/tareas.json`: las tareas. Se actualiza todos los días a las 6:00 pm desde Academics.
- `scripts/extraer-academics.js`: lee la planilla de tareas en Academics (solo tareas, nada personal).
- `scripts/actualizar.mjs`: mezcla lo leído con `data/tareas.json`.
- `ACTUALIZAR.md`: pasos de la actualización diaria.
- `avisos/`: servidor de avisos (Cloudflare Worker). Solo guarda las direcciones anónimas de los celulares que activaron los avisos.
- `scripts/notificar.mjs`: envía el aviso de las 6 pm. Las llaves están fuera del repositorio, en el computador de Luis.
- `scripts/avisar.cmd` + `avisar-oculto.vbs`: recordatorios de las 3 pm y 9 pm, programados en el Programador de tareas de Windows (carpeta "Tareas 10-1"). Registro en `.cache/avisos.log`.
