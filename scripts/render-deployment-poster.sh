#!/bin/bash
# Renders content/architecture-poster/deployment.html → apps/web/public/deployment-poster.png
set -euo pipefail
cd "$(dirname "$0")/../content/architecture-poster"
chromium-browser --headless=new --disable-gpu --screenshot=render-d.png \
  --window-size=1560,2400 --force-device-scale-factor=2 --hide-scrollbars \
  "file://$PWD/deployment.html"
python3 - <<'PY'
from PIL import Image
im = Image.open('render-d.png').convert('RGB')
w, h = im.size
px = im.load()
def row_white(y):
    return all(px[x, y] == (255, 255, 255) for x in range(0, w, 40))
y = h - 1
while y > 0 and row_white(y):
    y -= 1
im.crop((0, 0, w, min(h, y + 30))).save('../../apps/web/public/deployment-poster.png', optimize=True)
print('deployment-poster.png updated')
PY
rm render-d.png
