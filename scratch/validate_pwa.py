import urllib.request
import json
import struct
import os

print('--- CHECKING FILES ---')
for path in ['img/logo-conversor.png', 'img/icons/icon-192.png', 'img/icons/icon-512.png', 'manifest.json', 'index.html']:
    exists = os.path.exists(path)
    size = os.path.getsize(path) if exists else 0
    print(f'File {path}: exists={exists}, size={size} bytes')

print('\n--- CHECKING IMAGES ---')
for path in ['img/icons/icon-192.png', 'img/icons/icon-512.png']:
    with open(path, 'rb') as f:
        w, h = struct.unpack('>LL', f.read(24)[16:24])
        print(f'{path}: {w}x{h}')

print('\n--- CHECKING MANIFEST JSON ---')
with open('manifest.json', 'r', encoding='utf-8') as f:
    m = json.load(f)
    print(json.dumps(m, indent=2, ensure_ascii=False))

print('\n--- CHECKING HTTP RESPONSES ---')
for rel in ['manifest.json', 'img/icons/icon-192.png', 'img/icons/icon-512.png', 'index.html']:
    url = f'http://localhost:8000/{rel}'
    try:
        resp = urllib.request.urlopen(url)
        print(f'{url}: Status {resp.status}, Content-Type: {resp.headers.get("Content-Type")}, Length: {resp.headers.get("Content-Length")}')
    except Exception as e:
        print(f'{url}: ERROR {e}')
