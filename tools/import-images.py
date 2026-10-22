#!/usr/bin/env python3
"""Importiert Übungsbilder einer neuen Variante (z. B. Frauen-Figuren).

Aufruf:  python3 tools/import-images.py woman /pfad/zu/ordner

Die Bilder im Ordner müssen so heißen wie die Originale, z. B. kobra_stretch.png
(Umlaute, Groß-/Kleinschreibung und _ / - sind egal). Das Skript verkleinert sie auf
640 px, speichert sie als WebP in images/<variante>/ und trägt sie in
data/exercises.json ein. Danach: node tools/update-sw.mjs
"""
import json, os, re, sys, unicodedata
from PIL import Image

variant, src = sys.argv[1], sys.argv[2]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data_path = os.path.join(root, 'data', 'exercises.json')
data = json.load(open(data_path, encoding='utf-8'))

def slug(name):
    name = os.path.splitext(name)[0].lower()
    for a, b in (('ü', 'ue'), ('ö', 'oe'), ('ä', 'ae'), ('ß', 'ss'), ('_', '-'), (' ', '-')):
        name = name.replace(a, b)
    return re.sub(r'[^a-z0-9-]', '', unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode())

by_slug = {e['id']: e for e in data['exercises']}
out_dir = os.path.join(root, 'images', variant)
os.makedirs(out_dir, exist_ok=True)
done, unknown = [], []
for f in sorted(os.listdir(src)):
    if not f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        continue
    s = slug(f)
    if s not in by_slug:
        unknown.append(f); continue
    im = Image.open(os.path.join(src, f)).convert('RGB').resize((640, 640), Image.LANCZOS)
    rel = f'images/{variant}/{s}.webp'
    im.save(os.path.join(root, rel), 'WEBP', quality=84, method=6)
    by_slug[s]['images'][variant] = rel
    done.append(s)
json.dump(data, open(data_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
missing = [i for i in by_slug if i not in done]
print(f'{len(done)} Bilder importiert.')
if unknown: print('Unbekannte Dateinamen:', ', '.join(unknown))
if missing: print('Noch ohne Bild (fällt auf Männlich zurück):', ', '.join(missing))
