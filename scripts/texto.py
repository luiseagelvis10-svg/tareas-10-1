"""Extrae el texto de un PDF o DOCX para revisar que no tenga datos personales.

Uso: .venv/Scripts/python.exe -I scripts/texto.py <archivo>
Imprime el texto (máximo 20.000 caracteres). No ejecuta nada del archivo.
"""
import re
import sys
import zipfile


def docx(ruta):
    with zipfile.ZipFile(ruta) as z:
        partes = [n for n in z.namelist() if re.match(r"word/(document|header\d*|footer\d*|comments)\.xml$", n)]
        xml = " ".join(z.read(n).decode("utf-8", "ignore") for n in partes)
    xml = re.sub(r"</w:p>", "\n", xml)
    return re.sub(r"<[^>]+>", "", xml)


def pdf(ruta):
    from pypdf import PdfReader
    lector = PdfReader(ruta)
    meta = lector.metadata or {}
    cab = f"[metadatos] autor={meta.get('/Author')} titulo={meta.get('/Title')}\n"
    return cab + "\n".join((p.extract_text() or "") for p in lector.pages)


ruta = sys.argv[1]
ext = ruta.lower().rsplit(".", 1)[-1]
try:
    texto = docx(ruta) if ext in ("docx", "docm") else pdf(ruta) if ext == "pdf" else f"[sin extractor para .{ext}]"
except Exception as e:  # archivo dañado o protegido
    texto = f"[no se pudo leer: {e}]"
sys.stdout.reconfigure(encoding="utf-8")
print(re.sub(r"[ \t]+", " ", texto)[:20000])
