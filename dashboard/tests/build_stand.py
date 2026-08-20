#!/usr/bin/env python3
"""Сборка локального стенда для проверки дэшборда без интернета.

Панели подключают Plotly, SheetJS, JSZip и html2canvas с CDN. Чтобы прогнать
дэшборд в закрытой среде (или просто быстро проверить правки темы), стенд
подменяет CDN-адреса на локальные копии библиотек и собирает:

  stand/<панель>-themed.html   панель с фирменной темой
  stand/<панель>-orig.html     та же панель без темы (для сравнения)
  stand/dashboard-stand.html   полный дэшборд (оболочка + три панели)

Библиотеки берутся из node_modules (npm i plotly.js-dist-min@2.27.0 xlsx@0.18.5
jszip@3.10.1 html2canvas@1.4.1) и копируются в stand/vendor/.

Запуск:  python3 dashboard/tests/build_stand.py
Затем:   python3 -m http.server 8099 --directory dashboard/tests/stand
"""

import base64
import json
import pathlib
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE.parent / "src"
STAND = HERE / "stand"
PANELS = ["incubation", "zpp", "broiler"]

CDN = {
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js": "vendor/xlsx.js",
    "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js": "vendor/jszip.js",
    "https://cdn.plot.ly/plotly-2.27.0.min.js": "vendor/plotly.js",
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js": "vendor/html2canvas.js",
}

VENDOR_SOURCES = {
    "vendor/plotly.js": "node_modules/plotly.js-dist-min/plotly.min.js",
    "vendor/xlsx.js": "node_modules/xlsx/dist/xlsx.full.min.js",
    "vendor/jszip.js": "node_modules/jszip/dist/jszip.min.js",
    "vendor/html2canvas.js": "node_modules/html2canvas/dist/html2canvas.min.js",
}


def copy_vendor(root: pathlib.Path):
    (STAND / "vendor").mkdir(parents=True, exist_ok=True)
    missing = []
    for dest, src in VENDOR_SOURCES.items():
        src_path = root / src
        if src_path.exists():
            shutil.copy(src_path, STAND / dest)
        elif not (STAND / dest).exists():
            missing.append(src)
    if missing:
        print("нет локальных копий библиотек:", ", ".join(missing), file=sys.stderr)
        print("установите: npm i plotly.js-dist-min@2.27.0 xlsx@0.18.5 jszip@3.10.1 html2canvas@1.4.1", file=sys.stderr)


def themed_panel(key: str, css: str, js: str):
    html = (SRC / "panels" / f"{key}.html").read_text(encoding="utf-8")
    for cdn, local in CDN.items():
        html = html.replace(cdn, local)
    block = f'<style id="aitas-theme-css">\n{css}\n</style>\n<script id="aitas-theme-js">\n{js}\n</script>\n'
    return html, html.replace("</body>", block + "</body>", 1)


def main():
    STAND.mkdir(parents=True, exist_ok=True)
    copy_vendor(pathlib.Path.cwd())

    css = (SRC / "theme.css").read_text(encoding="utf-8")
    js = (SRC / "theme.js").read_text(encoding="utf-8")

    encoded = {}
    for key in PANELS:
        plain, themed = themed_panel(key, css, js)
        (STAND / f"{key}-orig.html").write_text(plain, encoding="utf-8")
        (STAND / f"{key}-themed.html").write_text(themed, encoding="utf-8")
        encoded[key] = base64.b64encode(themed.encode("utf-8")).decode("ascii")

    shell = (SRC / "shell.html").read_text(encoding="utf-8")
    (STAND / "dashboard-stand.html").write_text(
        shell.replace("__DASH_B64_JSON__", json.dumps(encoded, ensure_ascii=True)), encoding="utf-8"
    )
    print("стенд собран:", STAND)


if __name__ == "__main__":
    main()
