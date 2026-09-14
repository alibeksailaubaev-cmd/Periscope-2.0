# -*- coding: utf-8 -*-
"""Расчет потребности дезсредства "Фоснитацид" по площади корпусов.
Пишет формулы + кэшированные значения (LibreOffice в окружении недоступен)."""
import math, os, re, shutil, zipfile
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT = "/home/user/Periscope-2.0/Расчет_дезсредства_Фоснитацид.xlsx"

DATA = [
    ("№3", "Г", [("1-4",4410,1458.72),("1-3",4410,1458.72),("1-2",4410,1458.72),
                 ("1-1",4485,1483.54),("2-4",4401,1486.31),("2-3",4401,1486.31),
                 ("2-2",4401,1486.31),("2-1",4473,1483.54),("3-4",4488,1488.26),
                 ("3-3",4488,1488.26),("3-2",4488,1488.26),("3-1",4560,1498.53)]),
    ("№4", "Г", [("4-4",4536,1517.78),("4-3",4536,1517.78),("4-2",4536,1517.78),
                 ("4-1",4599,1517.78),("5-4",4530,1513.84),("5-3",4530,1513.84),
                 ("5-2",4530,1513.84),("5-1",4593,1513.84)]),
    ("№5", "Д", [("1-4",4500,1501.4),("1-3",4503,1502.4),("1-2",4497,1499.7),
                 ("1-1",4500,1500.4),("2-4",4527,1510.1),("2-3",4533,1511.3),
                 ("2-2",4530,1510.1),("2-1",4530,1510.9)]),
    ("№6", "Д", [("3-4",4596,1532.6),("3-3",4590,1530.5),("3-2",4590,1532.3),
                 ("3-1",4593,1531.1),("4-4",4704,1568.4),("4-3",4710,1570.4),
                 ("4-2",4722,1571.9),("4-1",4725,1574.8)]),
    ("№7", "Б", [("1",3456,1162.9),("2",3456,1162.9),("3",3456,1150.4),("4",3456,1150.9),
                 ("5",3456,1108.4),("6",3240,1117.0),("7",3240,1091.5),("8",3240,1088.6),
                 ("9",3240,1102.9),("10",3456,1082.4)]),
    ("№8", "Е", [("1",3240,1081.7),("2",3240,1088.0),("3",3240,1086.2),("4",3240,1087.4),
                 ("5",3456,1119.5),("6",3240,1119.5),("7",3240,1087.4),("8",3240,1085.0),
                 ("9",3240,1087.4),("10",3456,1086.2)]),
    ("№9", "А", [("1",3456,1114.5),("2",3240,1061.5),("3",3240,1061.5),("4",3240,1061.5),
                 ("5",3240,1061.5),("6",3456,1114.5),("7",3240,1098.2),("8",3240,1098.2),
                 ("9",3240,1098.2),("10",3240,1098.2)]),
    ("№10","Ж", [("1",3456,1122.9),("2",3456,1123.0),("3",3456,1123.0),("4",3456,1123.0),
                 ("5",3456,1123.0)]),
    ("№11","В",  [(str(i),6912,1680.0) for i in range(1,4)] +
                 [(str(i),6912,1610.0) for i in range(4,7)] +
                 [(str(i),6912,1620.0) for i in range(7,13)] +
                 [(str(i),7560,1680.0) for i in range(13,16)]),
    ("№12","БП-12",[(str(i),7560,1670.0) for i in range(1,13)]),
    ("№13","БП-13",[(str(i),7560,1670.0) for i in range(1,13)]),
    ("№14","БП-14",[(str(i),7560,1670.0) for i in range(1,13)]),
]
SITE_ORDER = ["Г","Д","БП-14","А","Б","Е","Ж","БП-13","В","БП-12"]

# --- параметры (значения по умолчанию) -------------------------------------
V_CONC, V_NORM, V_MULT, V_CAN, V_FACT = 10.0, 0.5, 1.0, 23.0, 1.0

FONT = "Arial"
f_title = Font(name=FONT, size=14, bold=True)
f_sub   = Font(name=FONT, size=9, italic=True, color="555555")
f_hdr   = Font(name=FONT, size=10, bold=True, color="FFFFFF")
f_body  = Font(name=FONT, size=10)
f_bold  = Font(name=FONT, size=10, bold=True)
f_input = Font(name=FONT, size=11, bold=True, color="0000FF")
fill_hdr   = PatternFill("solid", fgColor="1F6F54")
fill_input = PatternFill("solid", fgColor="FFFF00")
fill_tot   = PatternFill("solid", fgColor="DCE9E3")
fill_alt   = PatternFill("solid", fgColor="F4F8F6")
thin = Side(style="thin", color="B7C7C0")
bord = Border(left=thin, right=thin, top=thin, bottom=thin)
c_ctr  = Alignment(horizontal="center", vertical="center", wrap_text=True)
c_left = Alignment(horizontal="left", vertical="center", wrap_text=True)
N0, N1, N2, N3 = "#,##0", "#,##0.0", "#,##0.00", "0.000"

CACHE = {}   # (sheet_title, coord) -> computed value

def put(ws, row, col, formula, value, fmt=None, font=f_body, fill=None, align=c_ctr, border=True):
    c = ws.cell(row, col, formula)
    CACHE[(ws.title, c.coordinate)] = value
    if fmt: c.number_format = fmt
    c.font = font
    if fill: c.fill = fill
    c.alignment = align
    if border: c.border = bord
    return c

def txt(ws, row, col, value, fmt=None, font=f_body, fill=None, align=c_ctr, border=True):
    c = ws.cell(row, col, value)
    if fmt: c.number_format = fmt
    c.font = font
    if fill: c.fill = fill
    c.alignment = align
    if border: c.border = bord
    return c

wb = Workbook()
wb.calculation.fullCalcOnLoad = True

# ========================= ЛИСТ 1: ПАРАМЕТРЫ ===============================
ws = wb.active; ws.title = "Параметры"; ws.sheet_view.showGridLines = False
for col, w in [("A",3),("B",54),("C",18),("D",70)]: ws.column_dimensions[col].width = w
ws["B2"] = "РАСЧЕТ ПОТРЕБНОСТИ ДЕЗСРЕДСТВА «ФОСНИТАЦИД» ПО ПЛОЩАДИ КОРПУСОВ"; ws["B2"].font = f_title
ws["B3"] = "Желтые ячейки — вводимые параметры. Меняете одну ячейку — весь файл пересчитывается."; ws["B3"].font = f_sub

params = [
    ("Наименование дезсредства", "Фоснитацид", None, False, "По заданию заказчика."),
    ("Концентрация рабочего раствора, %", V_CONC, N1, True, "10-процентный рабочий раствор (по заданию)."),
    ("Норма расхода рабочего раствора, л/м²", V_NORM, N3, True,
     "Способ обработки — МОЙКА (влажная дезинфекция), подтверждено заказчиком. Принята типовая норма "
     "влажной дезинфекции гладких поверхностей 0,5 л/м². Для шероховатых поверхностей (бетон, кирпич) "
     "применяется 1,0 л/м² — см. лист «Сценарии норм расхода»."),
    ("Кратность обработки за 1 санразрыв", V_MULT, N0, True, "Периодичность — 1 раз согласно графику санразрыва."),
    ("Объем канистры, л", V_CAN, N1, True, "1 канистра = 23 л концентрата (по заданию)."),
    ("Фактическая выдача на 1 корпус, канистр", V_FACT, N1, True,
     "Действующая практика: 1 канистра на корпус независимо от его площади."),
]
r = 5; PR = {}
for label, val, fmt, is_in, note in params:
    txt(ws, r, 2, label, font=f_bold, align=c_left, border=False)
    txt(ws, r, 3, val, fmt, font=(f_input if is_in else Font(name=FONT, size=11, bold=True)),
        fill=(fill_input if is_in else None))
    txt(ws, r, 4, note, font=f_sub, align=Alignment(horizontal="left", vertical="center", wrap_text=True), border=False)
    ws.row_dimensions[r].height = 34
    PR[label] = r; r += 1

P = "Параметры"
CONC = f"'{P}'!$C${PR['Концентрация рабочего раствора, %']}"
NORM = f"'{P}'!$C${PR['Норма расхода рабочего раствора, л/м²']}"
MULT = f"'{P}'!$C${PR['Кратность обработки за 1 санразрыв']}"
CAN  = f"'{P}'!$C${PR['Объем канистры, л']}"
FACT = f"'{P}'!$C${PR['Фактическая выдача на 1 корпус, канистр']}"

r += 1
txt(ws, r, 2, "МЕТОДИКА РАСЧЕТА", font=Font(name=FONT, size=11, bold=True), align=c_left, border=False); r += 1
for m in ["1.  Рабочий раствор на корпус, л  =  Площадь корпуса, м²  ×  Норма расхода, л/м²  ×  Кратность",
          "2.  Концентрат (Фоснитацид) на корпус, л  =  Рабочий раствор, л  ×  Концентрация, %  /  100",
          "3.  Канистр на корпус, шт  =  ОКРВВЕРХ( Концентрат, л  /  Объем канистры, 23 л )",
          "4.  Отклонение, л  =  Фактическая выдача, л  −  Расчетная потребность в концентрате, л"]:
    txt(ws, r, 2, m, align=c_left, border=False); ws.row_dimensions[r].height = 16; r += 1

r += 1
txt(ws, r, 2, "СОСТАВ ПЛОЩАДОК (сверено с ведомостью заказчика)", font=Font(name=FONT, size=11, bold=True), align=c_left, border=False); r += 1
hdr_r = r
for j, h in enumerate(["Площадка","Бройлерные участки","Кол-во корпусов"]):
    txt(ws, r, 2+j, h, font=f_hdr, fill=fill_hdr)
r += 1
n_start = r
for site in SITE_ORDER:
    uch = ", ".join(u for u, s, _ in DATA if s == site)
    cnt = sum(len(k) for u, s, k in DATA if s == site)
    txt(ws, r, 2, site, align=c_left); txt(ws, r, 3, uch, align=c_left); txt(ws, r, 4, cnt, N0)
    r += 1
txt(ws, r, 2, "ИТОГО", font=f_bold, fill=fill_tot, align=c_left)
txt(ws, r, 3, "", fill=fill_tot)
put(ws, r, 4, f"=SUM(D{n_start}:D{r-1})", sum(len(k) for _,_,k in DATA), N0, font=f_bold, fill=fill_tot)

# ===================== ЛИСТ 2: РАСЧЕТ ПО КОРПУСАМ ==========================
d = wb.create_sheet("Расчет по корпусам")
D_HDR = [("Площадка",11),("Бройлерный участок",13),("№ корпуса",10),("Объем, м³",10),
         ("Площадь, м²",11),("Норма расхода, л/м²",12),("Рабочий раствор, л",13),
         ("Потребность концентрата, л",14),("Канистр расчетно, шт",12),
         ("К выдаче, канистр (округл.)",13),("Факт. выдача сейчас, л",13),
         ("Отклонение (факт − норма), л",14),("Норма, покрываемая 1 канистрой, л/м²",15)]
for j,(h,w) in enumerate(D_HDR, 1):
    txt(d, 1, j, h, font=f_hdr, fill=fill_hdr); d.column_dimensions[get_column_letter(j)].width = w
d.row_dimensions[1].height = 50

row = 2; first = row
rows_vals = []
for uch, site, korp in DATA:
    for num, vol, area in korp:
        fl = fill_alt if row % 2 == 0 else None
        rast = area * V_NORM * V_MULT
        conc_l = rast * V_CONC / 100
        can_x = conc_l / V_CAN
        can_r = math.ceil(can_x - 1e-9)
        fact_l = V_FACT * V_CAN
        txt(d, row, 1, site, fill=fl); txt(d, row, 2, uch, fill=fl); txt(d, row, 3, num, fill=fl)
        txt(d, row, 4, vol, N0, fill=fl); txt(d, row, 5, area, N2, fill=fl)
        put(d, row, 6,  f"={NORM}", V_NORM, N3, fill=fl)
        put(d, row, 7,  f"=E{row}*F{row}*{MULT}", rast, N1, fill=fl)
        put(d, row, 8,  f"=G{row}*{CONC}/100", conc_l, N1, fill=fl)
        put(d, row, 9,  f"=H{row}/{CAN}", can_x, N2, fill=fl)
        put(d, row, 10, f"=ROUNDUP(H{row}/{CAN},0)", can_r, N0, fill=fl)
        put(d, row, 11, f"={FACT}*{CAN}", fact_l, N1, fill=fl)
        put(d, row, 12, f"=K{row}-H{row}", fact_l - conc_l, N1, fill=fl)
        put(d, row, 13, f"={FACT}*{CAN}*100/{CONC}/E{row}/{MULT}",
            V_FACT*V_CAN*100/V_CONC/area/V_MULT, N3, fill=fl)
        rows_vals.append((site, vol, area, rast, conc_l, can_x, can_r, fact_l))
        row += 1
last = row - 1; t = row

TOT = lambda i: sum(x[i] for x in rows_vals)
txt(d, t, 1, "ИТОГО", font=f_bold, fill=fill_tot)
txt(d, t, 2, "", fill=fill_tot)
put(d, t, 3, f"=COUNTA(C{first}:C{last})", len(rows_vals), N0, font=f_bold, fill=fill_tot)
for col, fmt, idx in [(4,N0,1),(5,N2,2),(7,N1,3),(8,N1,4),(9,N2,5),(10,N0,6),(11,N1,7)]:
    L = get_column_letter(col)
    put(d, t, col, f"=SUM({L}{first}:{L}{last})", TOT(idx), fmt, font=f_bold, fill=fill_tot)
put(d, t, 12, f"=SUM(L{first}:L{last})", TOT(7)-TOT(4), N1, font=f_bold, fill=fill_tot)
tot_area = TOT(2); n_korp = len(rows_vals)
put(d, t, 13, f"={FACT}*{CAN}*100/{CONC}/(E{t}/C{t})/{MULT}",
    V_FACT*V_CAN*100/V_CONC/(tot_area/len(rows_vals))/V_MULT, N3, font=f_bold, fill=fill_tot)
txt(d, t, 6, "", fill=fill_tot)

d.freeze_panes = "D2"
d.auto_filter.ref = f"A1:M{last}"
nr = t + 2
txt(d, nr, 1, "Источник: объем (м³) и площадь (м²) каждого корпуса — по ведомости заказчика (фото технического паспорта). "
              "Столбцы F–M рассчитываются формулами от листа «Параметры».", font=f_sub, align=c_left, border=False)
d.merge_cells(start_row=nr, start_column=1, end_row=nr, end_column=13)

DET = "Расчет по корпусам"
AREA_RNG = f"'{DET}'!$E${first}:$E${last}"
SITE_RNG = f"'{DET}'!$A${first}:$A${last}"
VOL_RNG  = f"'{DET}'!$D${first}:$D${last}"
CANR_RNG = f"'{DET}'!$J${first}:$J${last}"

# ===================== ЛИСТ 3: СВОДКА ПО ПЛОЩАДКАМ =========================
s = wb.create_sheet("Сводка по площадкам"); s.sheet_view.showGridLines = False
s["A1"] = "СВОДКА ПОТРЕБНОСТИ В ДЕЗСРЕДСТВЕ «ФОСНИТАЦИД» ПО ПЛОЩАДКАМ"; s["A1"].font = f_title
s["A2"] = "на одну обработку по графику санразрыва"; s["A2"].font = f_sub
S_HDR = [("Площадка",12),("Кол-во корпусов, шт",11),("Общая площадь, м²",13),("Общий объем, м³",12),
         ("Рабочий раствор, л",13),("Потребность концентрата, л",14),("Требуется канистр, шт",12),
         ("Выдается сейчас, канистр",12),("Выдается сейчас, л",12),("Отклонение, л",12),("Отклонение, канистр",12)]
hr = 4
for j,(h,w) in enumerate(S_HDR,1):
    txt(s, hr, j, h, font=f_hdr, fill=fill_hdr); s.column_dimensions[get_column_letter(j)].width = w
s.row_dimensions[hr].height = 50

rr = hr + 1; sf = rr; site_tot = []
for site in SITE_ORDER:
    sub = [x for x in rows_vals if x[0] == site]
    cnt = len(sub); a = sum(x[2] for x in sub); v = sum(x[1] for x in sub)
    rast = a * V_NORM * V_MULT; cl = rast * V_CONC / 100
    cr = sum(x[6] for x in sub); fc = cnt * V_FACT; flr = fc * V_CAN
    txt(s, rr, 1, site, font=f_bold)
    put(s, rr, 2, f"=COUNTIF({SITE_RNG},$A{rr})", cnt, N0)
    put(s, rr, 3, f"=SUMIF({SITE_RNG},$A{rr},{AREA_RNG})", a, N2)
    put(s, rr, 4, f"=SUMIF({SITE_RNG},$A{rr},{VOL_RNG})", v, N0)
    put(s, rr, 5, f"=C{rr}*{NORM}*{MULT}", rast, N1)
    put(s, rr, 6, f"=E{rr}*{CONC}/100", cl, N1)
    put(s, rr, 7, f"=SUMIF({SITE_RNG},$A{rr},{CANR_RNG})", cr, N0)
    put(s, rr, 8, f"=B{rr}*{FACT}", fc, N1)
    put(s, rr, 9, f"=H{rr}*{CAN}", flr, N1)
    put(s, rr, 10, f"=I{rr}-F{rr}", flr - cl, N1)
    put(s, rr, 11, f"=H{rr}-G{rr}", fc - cr, N1)
    site_tot.append((cnt, a, v, rast, cl, cr, fc, flr, flr-cl, fc-cr))
    rr += 1
sl = rr - 1
txt(s, rr, 1, "ИТОГО", font=f_bold, fill=fill_tot)
for col, fmt, idx in [(2,N0,0),(3,N2,1),(4,N0,2),(5,N1,3),(6,N1,4),(7,N0,5),(8,N1,6),(9,N1,7),(10,N1,8),(11,N1,9)]:
    L = get_column_letter(col)
    put(s, rr, col, f"=SUM({L}{sf}:{L}{sl})", sum(x[idx] for x in site_tot), fmt, font=f_bold, fill=fill_tot)
tr = rr

k = rr + 2
txt(s, k, 1, "КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ", font=Font(name=FONT, size=11, bold=True), align=c_left, border=False); k += 1
T = lambda i: sum(x[i] for x in site_tot)
kpis = [
    ("Всего корпусов, шт", f"=B{tr}", T(0), N0),
    ("Общая обрабатываемая площадь, м²", f"=C{tr}", T(1), N2),
    ("Потребность рабочего раствора на 1 обработку, л", f"=E{tr}", T(3), N1),
    ("ПОТРЕБНОСТЬ КОНЦЕНТРАТА НА 1 ОБРАБОТКУ, л", f"=F{tr}", T(4), N1),
    ("ПОТРЕБНОСТЬ, КАНИСТР (округление по каждому корпусу)", f"=G{tr}", T(5), N0),
    ("Выдается сейчас (1 канистра на корпус), л", f"=I{tr}", T(7), N1),
    ("Дефицит (−) / излишек (+) при текущей выдаче, л", f"=I{tr}-F{tr}", T(7)-T(4), N1),
    ("Дефицит (−) / излишек (+) при текущей выдаче, канистр", f"=H{tr}-G{tr}", T(6)-T(5), N1),
    ("Средняя площадь одного корпуса, м²", f"=C{tr}/B{tr}", T(1)/T(0), N2),
    ("Норма, фактически покрываемая 1 канистрой (в среднем), л/м²",
     f"={FACT}*{CAN}*100/{CONC}/(C{tr}/B{tr})/{MULT}", V_FACT*V_CAN*100/V_CONC/(T(1)/T(0))/V_MULT, N3),
]
for label, formula, val, fmt in kpis:
    txt(s, k, 1, label, font=f_bold, align=c_left, border=False)
    s.merge_cells(start_row=k, start_column=1, end_row=k, end_column=3)
    put(s, k, 4, formula, val, fmt, font=f_bold, fill=fill_tot)
    k += 1

# ===================== ЛИСТ 4: СЦЕНАРИИ ====================================
sc = wb.create_sheet("Сценарии норм расхода"); sc.sheet_view.showGridLines = False
sc["A1"] = "СЦЕНАРИИ: сколько нужно Фоснитацида при разных нормах расхода"; sc["A1"].font = f_title
sc["A2"] = ("Способ обработки — мойка (влажная дезинфекция). Рабочий диапазон норм для мойки: 0,3-1,0 л/м². "
            "Ниже — потребность на одну обработку всех корпусов при разных нормах.")
sc["A2"].font = f_sub; sc.merge_cells("A2:G2")
SC_HDR = [("Норма расхода, л/м²",15),("Рабочий раствор всего, л",15),("Концентрат всего, л",14),
          ("Канистр всего (округл. по корпусам), шт",17),("Выдается сейчас, канистр",14),
          ("Отклонение, канистр",14),("Комментарий",56)]
hr = 4
for j,(h,w) in enumerate(SC_HDR,1):
    txt(sc, hr, j, h, font=f_hdr, fill=fill_hdr); sc.column_dimensions[get_column_letter(j)].width = w
sc.row_dimensions[hr].height = 50
TOT_AREA_C = f"'{DET}'!$E${t}"; NKORP_C = f"'{DET}'!$C${t}"
scen = [(0.15,"Соответствует текущей выдаче 1 канистры на корпус. Аэрозольный режим — НЕ ваш случай"),
        (0.20,"Аэрозольная / мелкокапельная обработка — НЕ ваш случай"),
        (0.30,"Мойка, минимальный режим"),
        (0.50,"МОЙКА, гладкие поверхности — ПРИНЯТО В РАСЧЕТЕ"),
        (0.75,"Мойка, промежуточный режим"),
        (1.00,"Мойка шероховатых поверхностей (бетон, кирпич) / двукратная обработка")]
rr = hr + 1
for norm, comment in scen:
    hl = abs(norm - V_NORM) < 1e-9
    fb = f_bold if hl else f_body; fi = fill_tot if hl else None
    rast = tot_area * norm * V_MULT; cl = rast * V_CONC / 100
    canist = sum(math.ceil(x[2]*norm*V_MULT*V_CONC/100/V_CAN - 1e-9) for x in rows_vals)
    fc = n_korp * V_FACT
    txt(sc, rr, 1, norm, N3, font=fb, fill=fi)
    put(sc, rr, 2, f"={TOT_AREA_C}*A{rr}*{MULT}", rast, N1, font=fb, fill=fi)
    put(sc, rr, 3, f"=B{rr}*{CONC}/100", cl, N1, font=fb, fill=fi)
    put(sc, rr, 4, f"=SUMPRODUCT(ROUNDUP({AREA_RNG}*$A{rr}*{MULT}*{CONC}/100/{CAN},0))", canist, N0, font=fb, fill=fi)
    put(sc, rr, 5, f"={NKORP_C}*{FACT}", fc, N0, font=fb, fill=fi)
    put(sc, rr, 6, f"=E{rr}-D{rr}", fc - canist, N0, font=fb, fill=fi)
    txt(sc, rr, 7, comment, font=fb, fill=fi, align=c_left)
    rr += 1

rr += 1
txt(sc, rr, 1, "ОБРАТНЫЙ РАСЧЕТ", font=Font(name=FONT, size=11, bold=True), align=c_left, border=False); rr += 1
for label, formula, val, fmt in [
    ("Норма расхода, которую фактически покрывает 1 канистра (23 л), в среднем по хозяйству, л/м²",
     f"={FACT}*{CAN}*100/{CONC}/({TOT_AREA_C}/{NKORP_C})/{MULT}", V_FACT*V_CAN*100/V_CONC/(tot_area/n_korp)/V_MULT, N3),
    ("Средняя площадь одного корпуса, м²", f"={TOT_AREA_C}/{NKORP_C}", tot_area/n_korp, N2),
    ("Минимальная площадь корпуса, м² (участок №9 «А»)", f"=MIN({AREA_RNG})", min(x[2] for x in rows_vals), N2),
    ("Максимальная площадь корпуса, м² (участки «В», «БП»)", f"=MAX({AREA_RNG})", max(x[2] for x in rows_vals), N2),
]:
    txt(sc, rr, 1, label, font=f_bold, align=c_left, border=False)
    sc.merge_cells(start_row=rr, start_column=1, end_row=rr, end_column=6)
    put(sc, rr, 7, formula, val, fmt, font=f_bold, fill=fill_tot)
    rr += 1
rr += 1
txt(sc, rr, 1, "ВАЖНО: корпуса отличаются по площади более чем в 1,5 раза (1 061,5 м² на участке №9 «А» против 1 680 м² на «В» и 1 670 м² на «БП»). "
               "Поэтому единая выдача 1 канистры на корпус дает разную фактическую норму обработки — см. столбец M листа «Расчет по корпусам».",
    font=f_sub, align=Alignment(horizontal="left", vertical="top", wrap_text=True), border=False)
sc.merge_cells(start_row=rr, start_column=1, end_row=rr+1, end_column=7)

wb.save(OUT)

# ---------- инъекция кэшированных значений в XML ---------------------------
def inject(path, cache, titles):
    tmp = path + ".tmp"
    zin = zipfile.ZipFile(path)
    name_by_idx = {i+1: t for i, t in enumerate(titles)}
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            m = re.match(r"xl/worksheets/sheet(\d+)\.xml$", item.filename)
            if m:
                title = name_by_idx[int(m.group(1))]
                xml = data.decode("utf-8")
                def fix(mo):
                    whole, ref, attrs, body = mo.group(0), mo.group(1), mo.group(2), mo.group(3)
                    if "<f>" not in body:
                        return whole
                    val = cache.get((title, ref))
                    if val is None:
                        return whole
                    fv = float(val)
                    sval = str(int(fv)) if fv == int(fv) else repr(fv)
                    nb, n = re.subn(r"<v\s*/>|<v></v>", f"<v>{sval}</v>", body, count=1)
                    if n == 0:
                        if re.search(r"<v>[^<]", body):
                            return whole
                        nb = body + f"<v>{sval}</v>"
                    return f'<c r="{ref}"{attrs}>{nb}</c>'
                xml = re.sub(r'<c r="([A-Z]+\d+)"([^>]*?)(?<!/)>(.*?)</c>', fix, xml, flags=re.S)
                data = xml.encode("utf-8")
            zout.writestr(item, data)
    zin.close()
    shutil.move(tmp, path)

inject(OUT, CACHE, [w.title for w in wb.worksheets])

print("OK ->", OUT)
print("корпусов:", n_korp, "| общая площадь, м2:", round(tot_area, 2))
print("концентрат при 0.5 л/м2, л:", round(tot_area*0.5*0.1, 1),
      "| канистр:", sum(math.ceil(x[2]*0.5*0.1/23 - 1e-9) for x in rows_vals))
print("выдается сейчас, л:", n_korp*23)
print("средняя норма, покрываемая 23 л, л/м2:", round(23*100/10/(tot_area/n_korp), 4))
