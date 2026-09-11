# -*- coding: utf-8 -*-
"""Построение графика санитарного разрыва на следующий месяц.

Опирается на график предыдущего месяца:

  * шаблон цикла (последовательность отметок и интервалы между ними) берётся
    из самих птичников — по завершённым циклам этого цеха;
  * незакрытые на конец месяца циклы продолжаются по шаблону;
  * после заселения (ЗС) птица растёт заданное число дней, затем начинается
    новый цикл с освобождения (ОС/ОЧН).

    python3 src/make_next_month.py data/grafik-sanrazryva-2026-09.xlsx \
        --month 2026-10 --days 40 --out data/grafik-sanrazryva-2026-10.xlsx
"""

import argparse
import calendar
import collections
import os
import sys
from datetime import date, timedelta

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_schedule import SHOP_BLOCKS, HEADER_ROW, COL_FLOOR, FIRST_DAY_COL  # noqa: E402

START_MARK = "ОС"       # с чего начинается цикл
END_MARK = "ЗС"         # чем заканчивается

HEAD_FILL = PatternFill("solid", fgColor="D9E2F3")
THIN = Side(style="thin", color="B0B0B0")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)


def read_month(path, sheet=None):
    """[(цех, этаж, строка, [(дата, отметка)])] — все отметки как есть."""
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[sheet] if sheet else wb.worksheets[0]

    days = {}
    for col in range(FIRST_DAY_COL, FIRST_DAY_COL + 31):
        value = ws.cell(HEADER_ROW, col).value
        if hasattr(value, "date"):
            days[col] = value.date()

    houses = []
    for shop, row_from, row_to in SHOP_BLOCKS:
        for row in range(row_from, row_to + 1):
            floor = ws.cell(row, COL_FLOOR).value
            if floor is None:
                continue
            marks = []
            for col, day in sorted(days.items()):
                value = ws.cell(row, col).value
                if value is not None and str(value).strip():
                    marks.append((day, str(value).strip()))
            houses.append({"shop": shop, "floor": floor, "row": row, "marks": marks})
    return houses, sorted(days.values())


def cycle_template(marks, start_date):
    """[(сдвиг в днях, отметка)] от начала цикла."""
    return [((day - start_date).days, mark) for day, mark in marks]


def build_templates(houses):
    """Цех -> шаблон цикла. Берём самый частый завершённый цикл цеха."""
    per_shop = collections.defaultdict(collections.Counter)
    overall = collections.Counter()

    for house in houses:
        marks = house["marks"]
        starts = [i for i, (_, m) in enumerate(marks) if START_MARK in m]
        for i in starts:
            tail = marks[i:]
            ends = [j for j, (_, m) in enumerate(tail) if m == END_MARK]
            if not ends:
                continue
            cycle = tail[:ends[0] + 1]
            template = tuple(cycle_template(cycle, cycle[0][0]))
            per_shop[house["shop"]][template] += 1
            overall[template] += 1

    fallback = overall.most_common(1)[0][0] if overall else None
    return ({shop: counter.most_common(1)[0][0] for shop, counter in per_shop.items()},
            fallback)


def open_cycle(house):
    """Незакрытый цикл: дата начала и уже проставленные отметки, иначе None."""
    marks = house["marks"]
    starts = [i for i, (_, m) in enumerate(marks) if START_MARK in m]
    if not starts:
        return None
    tail = marks[starts[-1]:]
    if any(m == END_MARK for _, m in tail):
        return None
    return tail[0][0], tail


def last_settlement(house):
    """Дата последнего заселения в месяце."""
    days = [day for day, mark in house["marks"] if mark == END_MARK]
    return max(days) if days else None


def generate(houses, templates, fallback, month_from, month_to, grow_days):
    """Птичник -> {дата: отметка} на новый месяц."""
    plan = {}
    unknown = []

    for house in houses:
        template = templates[0].get(house["shop"], fallback)
        if template is None:
            continue
        cycle_len = template[-1][0]
        marks = {}

        # 1. Продолжаем цикл, не закрытый к концу прошлого месяца.
        settled = last_settlement(house)
        opened = open_cycle(house)
        if opened:
            start, done = opened
            done_offsets = {(day - start).days for day, _ in done}
            for offset, mark in template:
                day = start + timedelta(days=offset)
                if offset in done_offsets or day < month_from:
                    continue
                if day <= month_to:
                    marks[day] = mark
            settled = start + timedelta(days=cycle_len)

        if settled is None:
            unknown.append("{} / этаж {}".format(house["shop"], house["floor"]))
            continue

        # 2. Новые циклы: через grow_days после заселения.
        start = settled + timedelta(days=grow_days)
        while start <= month_to:
            for offset, mark in template:
                day = start + timedelta(days=offset)
                if month_from <= day <= month_to:
                    marks[day] = mark
            start = start + timedelta(days=cycle_len + grow_days)

        if marks:
            plan[(house["shop"], house["floor"])] = marks

    return plan, unknown


def write_schedule(source, plan, month_from, month_to, out_path, title):
    """Записываем новый месяц в той же раскладке, что и исходный график."""
    wb = openpyxl.load_workbook(source)
    ws = wb.worksheets[0]
    ws.title = title

    days = [month_from + timedelta(days=i) for i in range((month_to - month_from).days + 1)]

    # Объединённые ячейки старой раскладки мешают записи — снимаем объединение.
    for merged in list(ws.merged_cells.ranges):
        if merged.min_col >= FIRST_DAY_COL:
            ws.unmerge_cells(str(merged))

    # Чистим область дней с запасом и убираем зеркальные колонки старой раскладки.
    for row in range(HEADER_ROW, 130):
        for col in range(FIRST_DAY_COL, FIRST_DAY_COL + 33):
            ws.cell(row, col).value = None

    for i, day in enumerate(days):
        cell = ws.cell(HEADER_ROW, FIRST_DAY_COL + i)
        cell.value = day
        cell.number_format = "DD.MM"

    # Зеркальные колонки «Этаж» и «Цех» ставим сразу за последним днём.
    mirror_floor = FIRST_DAY_COL + len(days)
    mirror_shop = mirror_floor + 1
    ws.cell(HEADER_ROW, mirror_floor).value = "Этаж"
    ws.cell(HEADER_ROW, mirror_shop).value = "Цех"

    for shop, row_from, row_to in SHOP_BLOCKS:
        for row in range(row_from, row_to + 1):
            floor = ws.cell(row, COL_FLOOR).value
            if floor is None:
                continue
            ws.cell(row, mirror_floor).value = floor
            if row == row_from:
                ws.cell(row, mirror_shop).value = shop
            marks = plan.get((shop, floor), {})
            for day, mark in marks.items():
                ws.cell(row, FIRST_DAY_COL + (day - month_from).days).value = mark

    for cell in ("A6",):
        if ws[cell].value:
            ws[cell] = 'График  санитарного разрыва  производственных цехов  на   {}  ' \
                       'АО "Усть-Каменогорская птицефабрика"'.format(title)

    wb.save(out_path)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("xlsx", help="график предыдущего месяца")
    ap.add_argument("--month", required=True, help="новый месяц в виде ГГГГ-ММ")
    ap.add_argument("--days", type=int, default=40, help="длительность выращивания, дней")
    ap.add_argument("--sheet", help="лист исходного графика")
    ap.add_argument("--out", required=True)
    ap.add_argument("--title", help="имя листа нового графика")
    args = ap.parse_args(argv)

    year, month = (int(x) for x in args.month.split("-"))
    month_from = date(year, month, 1)
    month_to = date(year, month, calendar.monthrange(year, month)[1])

    houses, _ = read_month(args.xlsx, args.sheet)
    templates = build_templates(houses)
    plan, unknown = generate(houses, templates, templates[1],
                             month_from, month_to, args.days)

    title = args.title or "{} {}".format(
        ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август",
         "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"][month - 1], str(year)[2:])
    write_schedule(args.xlsx, plan, month_from, month_to, args.out, title)

    print("График построен:", args.out)
    print("  период: {} — {}, выращивание {} дней".format(month_from, month_to, args.days))
    print("  птичников с отметками: {} из {}".format(len(plan), len(houses)))
    print("  шаблон цикла (общий): " + "  ".join(
        "+{}:{}".format(o, m) for o, m in templates[1]))
    for shop, template in sorted(templates[0].items()):
        if template != templates[1]:
            print("  шаблон цеха {}: ".format(shop) + "  ".join(
                "+{}:{}".format(o, m) for o, m in template))
    for house in unknown:
        print("  ВНИМАНИЕ: нет данных для планирования: {}".format(house))
    return 0


if __name__ == "__main__":
    sys.exit(main())
