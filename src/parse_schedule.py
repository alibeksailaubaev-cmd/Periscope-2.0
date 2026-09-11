# -*- coding: utf-8 -*-
"""Разбор графика санитарного разрыва (xlsx) в список операций по птичникам.

Из графика вытаскиваются только те отметки, которые нужны для расчёта санации
линий поения и расхода дезсредств:

    ОС/ОЧН  -> санация 1 (освобождение / очистка ночь)
    МС      -> санация 2 (мойка сутки)
    ПР/Р    -> санация 3 (приёмка птичника + мойка)
    Р\\ДС    -> берём только ДС (дезинсекция)
    ДЗ/...  -> берём только ДЗ (дезинфекция), сколько бы раз ни встретилась
    ГГ      -> газация глутаркой
    ГФ      -> газация формалином
    ОД      -> обработка дорог
    ПДГ     -> санация 4 (подготовка)

Остальные отметки (Р, ЗН, ЗО, ЗС, СО, П, ПН, Ш) в выборку не попадают.
"""

import argparse
import csv
import json
import re
import sys
from datetime import datetime

import openpyxl

# Строки листа, относящиеся к одному цеху. Часть названий в файле проставлена
# не на весь блок, а в объединённой ячейке в его середине, поэтому границы
# блоков заданы явно.
SHOP_BLOCKS = [
    ("А", 8, 17),
    ("Ж", 18, 22),
    ("Б", 23, 32),
    ("Е", 33, 42),
    ("В", 43, 57),
    ("БП 12", 58, 69),
    ("БП 13", 70, 81),
    ("БП 14", 82, 93),
    ("Г 5", 94, 97),
    ("Г 4", 98, 101),
    ("Г 3", 102, 105),
    ("Г 2", 106, 109),
    ("Г 1", 110, 113),
    ("Д 1", 114, 117),
    ("Д 2", 118, 121),
    ("Д 3", 122, 125),
    ("Д 4", 126, 129),
]

HEADER_ROW = 7
COL_FLOOR = 2          # B — этаж
FIRST_DAY_COL = 3      # C — 1-е число
LAST_DAY_COL = 32      # AF — 30/31-е число

# Отметка -> (код операции, человекочитаемое название, этап санации)
OPERATIONS = {
    "ОС": ("ОС", "освобождение", 1),
    "ОЧ": ("ОЧ", "очистка", 1),
    "ОЧН": ("ОЧН", "очистка ночь", 1),
    "МС": ("МС", "мойка сутки", 2),
    "МН": ("МН", "мойка ночь", 2),
    "МД": ("МД", "мойка день", 2),
    "ПР": ("ПР", "приёмка птичника", 3),
    "ДС": ("ДС", "дезинсекция", None),
    "ДЗ": ("ДЗ", "дезинфекция", None),
    "ГГ": ("ГГ", "газация глутаркой", None),
    "ГФ": ("ГФ", "газация формалином", None),
    "ОД": ("ОД", "обработка дорог", None),
    "ПДГ": ("ПДГ", "подготовка", 4),
}

# Отметки, которые осознанно игнорируем.
IGNORED = {"Р", "ЗН", "ЗО", "ЗС", "СО", "П", "ПН", "Ш", "С"}


def split_marks(raw):
    """'ЗО/ДЗ\\ГГ' -> ['ЗО', 'ДЗ', 'ГГ']"""
    return [p.strip().upper() for p in re.split(r"[\\/|,]+", str(raw)) if p.strip()]


def read_day_columns(ws):
    """Колонка -> дата из строки-шапки."""
    days = {}
    for col in range(FIRST_DAY_COL, LAST_DAY_COL + 1):
        value = ws.cell(HEADER_ROW, col).value
        if isinstance(value, datetime):
            days[col] = value.date()
    return days


def parse(path, sheet=None):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[sheet] if sheet else wb.worksheets[0]
    days = read_day_columns(ws)

    houses = []
    unknown = set()

    for shop, row_from, row_to in SHOP_BLOCKS:
        for row in range(row_from, row_to + 1):
            floor = ws.cell(row, COL_FLOOR).value
            if floor is None:
                continue
            events = []
            for col, day in sorted(days.items()):
                raw = ws.cell(row, col).value
                if raw is None or not str(raw).strip():
                    continue
                for mark in split_marks(raw):
                    if mark in OPERATIONS:
                        code, name, stage = OPERATIONS[mark]
                        events.append({
                            "date": day.isoformat(),
                            "code": code,
                            "name": name,
                            "stage": stage,
                            "cell": str(raw).strip(),
                        })
                    elif mark not in IGNORED:
                        unknown.add(mark)
            if events:
                houses.append({
                    "shop": shop,
                    "floor": floor,
                    "house": "{} / этаж {}".format(shop, floor),
                    "row": row,
                    "events": events,
                })

    return {
        "source": str(path),
        "sheet": ws.title,
        "period": {
            "from": min(days.values()).isoformat(),
            "to": max(days.values()).isoformat(),
        },
        "houses": houses,
        "unknown_marks": sorted(unknown),
    }


def write_csv(data, path):
    with open(path, "w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.writer(fh, delimiter=";")
        writer.writerow(["Цех", "Этаж", "Птичник", "Дата", "Код", "Операция",
                         "Этап санации", "Отметка в графике"])
        for house in data["houses"]:
            for e in house["events"]:
                writer.writerow([house["shop"], house["floor"], house["house"],
                                 e["date"], e["code"], e["name"],
                                 e["stage"] or "", e["cell"]])


def print_report(data):
    print("График: {} ({} — {})".format(
        data["sheet"], data["period"]["from"], data["period"]["to"]))
    print("Птичников с отметками: {}\n".format(len(data["houses"])))
    for house in data["houses"]:
        print(house["house"])
        for e in house["events"]:
            stage = " · санация {}".format(e["stage"]) if e["stage"] else ""
            print("    {}  {:<4} {}{}".format(e["date"], e["code"], e["name"], stage))
        print()
    if data["unknown_marks"]:
        print("Нераспознанные отметки:", ", ".join(data["unknown_marks"]))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("xlsx", help="файл графика санитарного разрыва")
    ap.add_argument("--sheet", help="имя листа (по умолчанию первый)")
    ap.add_argument("--json", metavar="FILE", help="сохранить результат в JSON")
    ap.add_argument("--csv", metavar="FILE", help="сохранить результат в CSV")
    ap.add_argument("--quiet", action="store_true", help="не печатать отчёт в консоль")
    args = ap.parse_args(argv)

    data = parse(args.xlsx, args.sheet)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        print("JSON записан:", args.json)
    if args.csv:
        write_csv(data, args.csv)
        print("CSV записан:", args.csv)
    if not args.quiet:
        print_report(data)
    return 0


if __name__ == "__main__":
    sys.exit(main())
