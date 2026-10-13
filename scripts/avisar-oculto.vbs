' Ejecuta avisar.cmd sin mostrar ninguna ventana. Uso: wscript avisar-oculto.vbs tarde|noche
Dim carpeta : carpeta = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
CreateObject("WScript.Shell").Run """" & carpeta & "\avisar.cmd"" " & WScript.Arguments(0), 0, True
