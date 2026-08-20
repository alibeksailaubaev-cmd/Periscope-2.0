#!/usr/bin/env python3
"""Сборка единого файла дэшборда AITAS UKPF.

Берёт исходные панели (src/panels/*.html), подмешивает в каждую фирменную тему
(src/theme.css + src/theme.js), упаковывает их в base64 и подставляет в оболочку
(src/shell.html). Результат — один самодостаточный HTML-файл dashboard.html,
который можно просто открыть в браузере или отправить коллегам.

Запуск:  python3 dashboard/build.py
"""

import base64
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
PANELS = ["incubation", "zpp", "broiler"]
OUT = ROOT / "dashboard.html"

THEME_MARK = "aitas-theme"


def read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def inject_theme(html: str, css: str, js: str, key: str) -> str:
    """Добавляет фирменную тему в конец панели (после её собственных стилей)."""
    if THEME_MARK in html:
        raise SystemExit(f"панель {key}: тема уже вшита — используйте чистый исходник")
    if "</body>" not in html:
        raise SystemExit(f"панель {key}: не найден </body>")

    block = (
        f'\n<!-- ===== AITAS UKPF: фирменная тема ===== -->\n'
        f'<style id="{THEME_MARK}-css">\n{css}\n</style>\n'
        f'<script id="{THEME_MARK}-js">\n{js}\n</script>\n'
    )
    return html.replace("</body>", block + "</body>", 1)


def main() -> int:
    css = read(SRC / "theme.css")
    js = read(SRC / "theme.js")
    shell = read(SRC / "shell.html")

    encoded = {}
    for key in PANELS:
        panel = read(SRC / "panels" / f"{key}.html")
        themed = inject_theme(panel, css, js, key)
        encoded[key] = base64.b64encode(themed.encode("utf-8")).decode("ascii")

    if "__DASH_B64_JSON__" not in shell:
        raise SystemExit("в оболочке нет метки __DASH_B64_JSON__")

    result = shell.replace("__DASH_B64_JSON__", json.dumps(encoded, ensure_ascii=True))
    OUT.write_text(result, encoding="utf-8")

    size_kb = OUT.stat().st_size / 1024
    print(f"собрано: {OUT.relative_to(ROOT.parent)}  ({size_kb:.0f} КБ)")
    for key in PANELS:
        print(f"  · {key}: {len(encoded[key]) / 1024:.0f} КБ base64")
    return 0


if __name__ == "__main__":
    sys.exit(main())
