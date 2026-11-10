#!/usr/bin/env python3
"""Genera el paquete completo para la Chrome Web Store:
dist/Subme-Now-Chrome-Web-Store-v<versión>.zip con el paquete de la extensión,
todos los gráficos y cada texto en su propio archivo, ordenado como el dashboard.

Uso: npm run build && python3 scripts/store-bundle.py
"""
import json, os, re, shutil, zipfile, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
os.chdir(ROOT)
version = json.load(open('manifest.json'))['version']
name = f'Subme-Now-Chrome-Web-Store-v{version}'
out = ROOT / 'dist' / name
if out.exists():
    shutil.rmtree(out)

def put(rel, text=None, src=None):
    p = out / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    if src:
        shutil.copy(src, p)
    else:
        p.write_text(text.strip() + '\n', encoding='utf-8')

pkg = ROOT / 'dist' / f'subme-now-{version}.zip'
if not pkg.exists():
    raise SystemExit(f'Falta {pkg}: ejecuta primero "npm run build".')
put(f'1-Paquete/{pkg.name}', src=pkg)

ficha = open('store/FICHA-TIENDA.md', encoding='utf-8').read()
blocks = re.findall(r'```\n(.*?)```', ficha, re.S)
desc_es = next(b for b in blocks if b.startswith('Subme Now muestra'))
desc_en = next(b for b in blocks if b.startswith('Subme Now shows'))
es = json.load(open('_locales/es/messages.json', encoding='utf-8'))
en = json.load(open('_locales/en/messages.json', encoding='utf-8'))
put('2-Ficha/textos/descripcion-es.txt', desc_es)
put('2-Ficha/textos/descripcion-en.txt', desc_en)
put('2-Ficha/textos/titulo.txt', f"{es['extName']['message']}\n\n(Viene dentro del paquete: no se escribe en el dashboard.)")
put('2-Ficha/textos/resumen-es.txt', es['extDescription']['message'])
put('2-Ficha/textos/resumen-en.txt', en['extDescription']['message'])
put('2-Ficha/textos/categoria.txt', src='store/textos/categoria.txt')
put('2-Ficha/textos/campos-adicionales.txt', src='store/textos/campos-adicionales.txt')

put('2-Ficha/graficos/icono-tienda-128x128.png', src='icons/icon128.png')
for s in (16, 32, 48, 128):
    put(f'2-Ficha/graficos/iconos-de-la-extension/icon{s}.png', src=f'icons/icon{s}.png')
shots = sorted(pathlib.Path('store/screenshots').glob('*.png'))
for p in shots:
    # La tienda acepta hasta 5 capturas: las 1 a 5 son las recomendadas; el resto queda como opcional.
    folder = 'capturas-de-pantalla' if re.match(r'[1-5]-', p.name) else 'opcional'
    put(f'2-Ficha/graficos/{folder}/{p.name}', src=p)
put('2-Ficha/graficos/mosaicos-promocionales/mosaico-pequeno-440x280.png', src='store/promo-small-440x280.png')
put('2-Ficha/graficos/mosaicos-promocionales/mosaico-con-desplazamiento-1400x560.png', src='store/marquee-1400x560.png')

for f in sorted(pathlib.Path('store/textos').glob('[1-6]-*.txt')):
    put(f'3-Privacidad/{f.name}', src=f)
put('3-Privacidad/politica-de-privacidad.md', src='PRIVACY.md')
put('4-Distribucion/distribucion.txt', src='store/textos/distribucion.txt')
put('5-Instrucciones-de-la-prueba/instrucciones-de-la-prueba.txt', src='store/textos/instrucciones-de-la-prueba.txt')
for f in ('README.md', 'store/GUIA-PUBLICACION.md', 'store/FICHA-TIENDA.md'):
    put(f'6-Documentacion/{pathlib.Path(f).name}', src=f)

leeme = open('store/LEEME-PLANTILLA.md', encoding='utf-8').read().replace('{VERSION}', version).replace('{PAQUETE}', pkg.name)
put('LEEME-QUE-PONER-EN-CADA-CAMPO.md', leeme)

zpath = ROOT / 'dist' / f'{name}.zip'
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted(out.rglob('*')):
        if p.is_file():
            z.write(p, p.relative_to(out.parent))
print(f'Paquete de la tienda listo: {zpath}')
