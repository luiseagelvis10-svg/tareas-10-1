@echo off
rem Recordatorio de las 3 pm (tarde) o 9 pm (noche). Lo ejecuta el Programador de tareas de Windows.
cd /d "%~dp0.."
if not exist ".cache" mkdir ".cache"
echo [%date% %time%] %1>> ".cache\avisos.log"
"C:\Program Files\nodejs\node.exe" scripts\notificar.mjs --%1 >> ".cache\avisos.log" 2>&1
