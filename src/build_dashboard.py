# -*- coding: utf-8 -*-
"""Сборка офлайн-дэшборда в один HTML-файл.

Нормы, прайс и сопоставление названий вшиваются в файл, поэтому дэшборд
работает без интернета и без сервера: график санразрыва разбирается прямо
в браузере (xlsx — это zip, распаковку делает встроенный DecompressionStream).

    python3 src/build_dashboard.py
"""

import argparse
import csv
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_schedule import SHOP_BLOCKS, OPERATIONS, IGNORED  # noqa: E402

SITES = {"Г": ["Г 1", "Г 2", "Г 3", "Г 4", "Г 5"], "Д": ["Д 1", "Д 2", "Д 3", "Д 4"]}


def read(path):
    with io.open(path, encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh, delimiter=";"))


def number(value):
    value = (value or "").strip().replace(" ", "").replace(",", ".")
    return float(value) if value else None


def norms(path):
    return [{
        "app": r["Приложение"], "proc": r["Процесс"], "code": r["Код в графике"],
        "occ": int(r["Вхождение"]) if (r.get("Вхождение") or "").strip() else None,
        "site": r["Участок"], "shop": r["Цех"], "agent": r["Средство"].strip(),
        "norm": number(r["Норма средства на птичник"]),
        "conc": number(r["Концентрация"]),
    } for r in read(path)]


def build(args):
    prices = {}
    for r in read(args.price):
        name = r["Наименование"].strip()
        if name:
            prices[name] = {"unit": r["Ед.изм"].strip(), "price": number(r["Цена"])}

    data = {
        "blocks": [{"shop": s, "from": a, "to": b} for s, a, b in SHOP_BLOCKS],
        "ops": {k: {"code": v[0], "name": v[1]} for k, v in OPERATIONS.items()},
        "ignored": sorted(IGNORED),
        "prices": prices,
        "map": {r["Средство в программе"].strip(): r["Позиция прайса"].strip()
                for r in read(args.map)},
        "programs": {name: norms(path) for name, path in
                     (p.split("=", 1) for p in args.program)},
        "extra": [{
            "proc": r["Процесс"], "site": r["Площадка"],
            "shops": [x.strip() for x in r["Цеха"].split(",") if x.strip()],
            "agent": r["Средство"].strip(), "norm": number(r["Норма"]),
            "units": int(float(r["Единиц"])), "times": int(float(r["Раз в месяц"])),
            "note": (r["Примечание"] or "").strip(),
        } for r in read(args.extra)],
        "sites": SITES,
    }

    parts = [io.open(os.path.join(args.src, n), encoding="utf-8").read()
             for n in ("part1.html", "part2.html", "part3.html")]
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    parts[1] = parts[1].replace("__DATA__", payload)
    html = "\n".join(parts)
    io.open(args.out, "w", encoding="utf-8").write(html)

    print("Дэшборд собран:", args.out)
    print("  размер: {} КБ".format(len(html.encode("utf-8")) // 1024))
    for name, rows in data["programs"].items():
        print("  программа «{}»: {} строк норм".format(name, len(rows)))
    print("  прайс: {} позиций, работ вне графика: {}"
          .format(len(prices), len(data["extra"])))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", default="dashboard", help="папка с part1/2/3.html")
    ap.add_argument("--out", default="dashboard/dezsredstva-dashboard.html")
    ap.add_argument("--price", default="data/dezsredstva.csv")
    ap.add_argument("--map", default="data/sopostavlenie.csv")
    ap.add_argument("--extra", default="data/normy_dopolnitelno.csv")
    ap.add_argument("--program", action="append", metavar="ИМЯ=ФАЙЛ",
                    default=None, help="набор норм, можно указать несколько")
    args = ap.parse_args(argv)
    if not args.program:
        args.program = ["2026-08 (19.07.2026)=data/normy-2026-08.csv",
                        "с сентября (31.08.2026)=data/normy.csv"]
    build(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
