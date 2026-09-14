# -*- coding: utf-8 -*-
"""Расчет потребности дезсредства "Фоснитацид" (мойка) — упрощенные таблицы."""
import math, re, shutil, zipfile
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

OUT = "/home/user/Periscope-2.0/Расчет_дезсредства_Фоснитацид.xlsx"

DATA = [
    ("№3","Г",[("1-4",4410,1458.72),("1-3",4410,1458.72),("1-2",4410,1458.72),("1-1",4485,1483.54),
               ("2-4",4401,1486.31),("2-3",4401,1486.31),("2-2",4401,1486.31),("2-1",4473,1483.54),
               ("3-4",4488,1488.26),("3-3",4488,1488.26),("3-2",4488,1488.26),("3-1",4560,1498.53)]),
    ("№4","Г",[("4-4",4536,1517.78),("4-3",4536,1517.78),("4-2",4536,1517.78),("4-1",4599,1517.78),
               ("5-4",4530,1513.84),("5-3",4530,1513.84),("5-2",4530,1513.84),("5-1",4593,1513.84)]),
    ("№5","Д",[("1-4",4500,1501.4),("1-3",4503,1502.4),("1-2",4497,1499.7),("1-1",4500,1500.4),
               ("2-4",4527,1510.1),("2-3",4533,1511.3),("2-2",4530,1510.1),("2-1",4530,1510.9)]),
    ("№6","Д",[("3-4",4596,1532.6),("3-3",4590,1530.5),("3-2",4590,1532.3),("3-1",4593,1531.1),
               ("4-4",4704,1568.4),("4-3",4710,1570.4),("4-2",4722,1571.9),("4-1",4725,1574.8)]),
    ("№7","Б",[("1",3456,1162.9),("2",3456,1162.9),("3",3456,1150.4),("4",3456,1150.9),("5",3456,1108.4),
               ("6",3240,1117.0),("7",3240,1091.5),("8",3240,1088.6),("9",3240,1102.9),("10",3456,1082.4)]),
    ("№8","Е",[("1",3240,1081.7),("2",3240,1088.0),("3",3240,1086.2),("4",3240,1087.4),("5",3456,1119.5),
               ("6",3240,1119.5),("7",3240,1087.4),("8",3240,1085.0),("9",3240,1087.4),("10",3456,1086.2)]),
    ("№9","А",[("1",3456,1114.5),("2",3240,1061.5),("3",3240,1061.5),("4",3240,1061.5),("5",3240,1061.5),
               ("6",3456,1114.5),("7",3240,1098.2),("8",3240,1098.2),("9",3240,1098.2),("10",3240,1098.2)]),
    ("№10","Ж",[("1",3456,1122.9),("2",3456,1123.0),("3",3456,1123.0),("4",3456,1123.0),("5",3456,1123.0)]),
    ("№11","В",[(str(i),6912,1680.0) for i in range(1,4)]+[(str(i),6912,1610.0) for i in range(4,7)]+
               [(str(i),6912,1620.0) for i in range(7,13)]+[(str(i),7560,1680.0) for i in range(13,16)]),
    ("№12","БП-12",[(str(i),7560,1670.0) for i in range(1,13)]),
    ("№13","БП-13",[(str(i),7560,1670.0) for i in range(1,13)]),
    ("№14","БП-14",[(str(i),7560,1670.0) for i in range(1,13)]),
]
SITE_ORDER = ["Г","Д","БП-14","А","Б","Е","Ж","БП-13","В","БП-12"]
V_CONC, V_NORM, V_MULT, V_CAN, V_FACT = 10.0, 0.5, 1.0, 23.0, 1.0

F = "Arial"
GREEN, LIGHT, CREAM = "1F6F54", "E8F1ED", "FBF9F3"
f_h1  = Font(name=F, size=16, bold=True, color="1F6F54")
f_h2  = Font(name=F, size=12, bold=True, color="1F6F54")
f_sub = Font(name=F, size=10, color="666666")
f_hdr = Font(name=F, size=11, bold=True, color="FFFFFF")
f_b   = Font(name=F, size=11)
f_bb  = Font(name=F, size=11, bold=True)
f_big = Font(name=F, size=20, bold=True, color="1F6F54")
f_bigr= Font(name=F, size=20, bold=True, color="C00000")
f_in  = Font(name=F, size=12, bold=True, color="0000FF")
fl_hdr  = PatternFill("solid", fgColor=GREEN)
fl_tot  = PatternFill("solid", fgColor=LIGHT)
fl_alt  = PatternFill("solid", fgColor="F7FAF9")
fl_in   = PatternFill("solid", fgColor="FFF2A8")
fl_kpi  = PatternFill("solid", fgColor=CREAM)
th = Side(style="thin", color="C5D5CE"); md = Side(style="medium", color=GREEN)
bd  = Border(left=th, right=th, top=th, bottom=th)
bdt = Border(left=th, right=th, top=md, bottom=th)
ctr = Alignment(horizontal="center", vertical="center", wrap_text=True)
lft = Alignment(horizontal="left", vertical="center", wrap_text=True)
INT = "#,##0"; DEC = "#,##0.0"; DEF = '#,##0;[Red]-#,##0'; NRM = "0.00"

CACHE = {}
def put(ws, r, c, formula, val, fmt=None, font=f_b, fill=None, al=ctr, b=bd):
    cell = ws.cell(r, c, formula); CACHE[(ws.title, cell.coordinate)] = val
    if fmt: cell.number_format = fmt
    cell.font = font
    if fill: cell.fill = fill
    cell.alignment = al
    if b: cell.border = b
    return cell
def txt(ws, r, c, v, fmt=None, font=f_b, fill=None, al=ctr, b=bd):
    cell = ws.cell(r, c, v)
    if fmt: cell.number_format = fmt
    cell.font = font
    if fill: cell.fill = fill
    cell.alignment = al
    if b: cell.border = b
    return cell

wb = Workbook(); wb.calculation.fullCalcOnLoad = True
sh_tot = wb.active; sh_tot.title = "ИТОГ"
sh_det = wb.create_sheet("По корпусам")
sh_par = wb.create_sheet("Параметры")
sh_scn = wb.create_sheet("Сценарии")
for s in wb.worksheets: s.sheet_view.showGridLines = False

# ======================= ПАРАМЕТРЫ ========================================
p = sh_par
for col, w in [("A",3),("B",44),("C",16),("D",66)]: p.column_dimensions[col].width = w
p["B2"] = "ПАРАМЕТРЫ РАСЧЕТА"; p["B2"].font = f_h1
p["B3"] = "Меняйте только жёлтые ячейки — весь файл пересчитается сам."; p["B3"].font = f_sub
for j, h in enumerate(["Параметр","Значение","Пояснение"]):
    txt(p, 5, 2+j, h, font=f_hdr, fill=fl_hdr)
p.row_dimensions[5].height = 24
PAR = [
    ("Дезсредство", "Фоснитацид", None, False, "Наименование по заданию."),
    ("Способ обработки", "Мойка (влажная дезинфекция)", None, False, "Подтверждено заказчиком."),
    ("Концентрация раствора, %", V_CONC, DEC, True, "10-процентный рабочий раствор."),
    ("Норма расхода раствора, л/м²", V_NORM, NRM, True,
     "Типовая норма мойки по гладким поверхностям. Для шероховатого бетона и кирпича — 1,0 л/м². См. лист «Сценарии»."),
    ("Кратность обработки", V_MULT, INT, True, "1 = один раз за санразрыв."),
    ("Объём канистры, л", V_CAN, DEC, True, "1 канистра = 23 л концентрата."),
    ("Выдаётся сейчас на корпус, канистр", V_FACT, DEC, True, "Действующая практика — 1 канистра на любой корпус."),
]
r = 6; PR = {}
for lab, val, fmt, isin, note in PAR:
    txt(p, r, 2, lab, font=f_bb, al=lft)
    txt(p, r, 3, val, fmt, font=(f_in if isin else f_bb), fill=(fl_in if isin else fl_tot))
    txt(p, r, 4, note, font=f_sub, al=lft)
    p.row_dimensions[r].height = 32; PR[lab] = r; r += 1
CONC = f"'Параметры'!$C${PR['Концентрация раствора, %']}"
NORM = f"'Параметры'!$C${PR['Норма расхода раствора, л/м²']}"
MULT = f"'Параметры'!$C${PR['Кратность обработки']}"
CAN  = f"'Параметры'!$C${PR['Объём канистры, л']}"
FACT = f"'Параметры'!$C${PR['Выдаётся сейчас на корпус, канистр']}"

r += 2
txt(p, r, 2, "КАК СЧИТАЕТСЯ (пример: корпус 1 680 м²)", font=f_h2, al=lft, b=None); r += 1
for line in ["Шаг 1.  Раствор:      1 680 м²  ×  0,5 л/м²        =  840 л раствора",
             "Шаг 2.  Фоснитацид:   840 л  ×  10 %                =  84 л  (+ 756 л воды)",
             "Шаг 3.  Канистры:     84 л  ÷  23 л  =  3,65        →  4 канистры (округление вверх)"]:
    c = txt(p, r, 2, line, font=Font(name="Consolas", size=10), al=lft, b=None)
    p.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4); r += 1

# ======================= ПО КОРПУСАМ ======================================
d = sh_det
d["A1"] = "РАСЧЕТ ПО КАЖДОМУ КОРПУСУ"; d["A1"].font = f_h1
d["A2"] = "Сколько Фоснитацида нужно на один корпус при мойке"; d["A2"].font = f_sub
HDR = [("Пло­щадка",11),("Уча­сток",9),("№ корпуса",10),("Площадь, м²",12),
       ("Раствор (вода + средство), л",15),("Фоснитацид, л",13),
       ("НУЖНО канистр",13),("Выдаётся сейчас, канистр",13),("Не хватает, канистр",13)]
HR = 4
for j,(h,w) in enumerate(HDR,1):
    txt(d, HR, j, h, font=f_hdr, fill=fl_hdr); d.column_dimensions[get_column_letter(j)].width = w
d.row_dimensions[HR].height = 46

row = HR+1; first = row; rows_vals = []
for uch, site, korp in DATA:
    for num, vol, area in korp:
        fl = fl_alt if (row-first) % 2 else None
        rast = area*V_NORM*V_MULT; conc = rast*V_CONC/100
        need = math.ceil(conc/V_CAN - 1e-9); short = need - V_FACT
        txt(d,row,1,site,font=f_bb,fill=fl); txt(d,row,2,uch,fill=fl); txt(d,row,3,num,fill=fl)
        txt(d,row,4,area,INT,fill=fl)
        put(d,row,5,f"=D{row}*{NORM}*{MULT}",rast,INT,fill=fl)
        put(d,row,6,f"=E{row}*{CONC}/100",conc,DEC,fill=fl)
        put(d,row,7,f"=ROUNDUP(F{row}/{CAN},0)",need,INT,font=f_bb,fill=fl)
        put(d,row,8,f"={FACT}",V_FACT,INT,fill=fl)
        put(d,row,9,f"=G{row}-H{row}",short,DEF,fill=fl)
        rows_vals.append((site,area,rast,conc,need,V_FACT)); row += 1
last = row-1; T = row
S=lambda i: sum(x[i] for x in rows_vals)
txt(d,T,1,"ИТОГО",font=f_bb,fill=fl_tot,b=bdt); txt(d,T,2,"",fill=fl_tot,b=bdt)
put(d,T,3,f"=COUNTA(C{first}:C{last})",len(rows_vals),INT,font=f_bb,fill=fl_tot,b=bdt)
for col,fmt,i in [(4,INT,1),(5,INT,2),(6,DEC,3),(7,INT,4),(8,INT,5)]:
    L=get_column_letter(col); put(d,T,col,f"=SUM({L}{first}:{L}{last})",S(i),fmt,font=f_bb,fill=fl_tot,b=bdt)
put(d,T,9,f"=G{T}-H{T}",S(4)-S(5),DEF,font=f_bb,fill=fl_tot,b=bdt)
d.freeze_panes = f"D{HR+1}"; d.auto_filter.ref = f"A{HR}:I{last}"
nr = T+2
txt(d,nr,1,"Площадь каждого корпуса взята из ведомости заказчика. Столбцы «Раствор», «Фоснитацид», "
           "«НУЖНО канистр» считаются формулами от листа «Параметры».",font=f_sub,al=lft,b=None)
d.merge_cells(start_row=nr,start_column=1,end_row=nr,end_column=9)

DET="По корпусам"
A_RNG=f"'{DET}'!$D${first}:$D${last}"; S_RNG=f"'{DET}'!$A${first}:$A${last}"
N_RNG=f"'{DET}'!$G${first}:$G${last}"; F_RNG=f"'{DET}'!$H${first}:$H${last}"

# ======================= ИТОГ =============================================
o = sh_tot
for col,w in [("A",4),("B",26),("C",13),("D",14),("E",15),("F",14),("G",14),("H",15)]:
    o.column_dimensions[col].width = w
o["B2"] = "ФОСНИТАЦИД — ПОТРЕБНОСТЬ НА ОДНУ МОЙКУ"; o["B2"].font = f_h1
o["B3"] = "10 площадок, 122 корпуса. Норма мойки 0,5 л/м², раствор 10 %, канистра 23 л."; o["B3"].font = f_sub

KPI = [("Всего корпусов", f"='{DET}'!$C${T}", len(rows_vals), INT, False),
       ("Общая площадь, м²", f"='{DET}'!$D${T}", S(1), INT, False),
       ("Нужно Фоснитацида, л", f"='{DET}'!$F${T}", S(3), INT, False),
       ("НУЖНО КАНИСТР", f"='{DET}'!$G${T}", S(4), INT, False),
       ("Выдаётся сейчас, канистр", f"='{DET}'!$H${T}", S(5), INT, False),
       ("НЕ ХВАТАЕТ, канистр", f"='{DET}'!$I${T}", S(4)-S(5), INT, True)]
for i,(lab,f_,v,fmt,red) in enumerate(KPI):
    c0 = 2 + (i % 3)*2; r0 = 5 + (i//3)*3
    lc = txt(o, r0, c0, lab, font=Font(name=F,size=10,bold=True,color="666666"), fill=fl_kpi, b=bd)
    o.merge_cells(start_row=r0, start_column=c0, end_row=r0, end_column=c0+1)
    put(o, r0+1, c0, f_, v, fmt, font=(f_bigr if red else f_big), fill=fl_kpi, b=bd)
    o.merge_cells(start_row=r0+1, start_column=c0, end_row=r0+1, end_column=c0+1)
    o.row_dimensions[r0+1].height = 30

hr = 12
o.cell(hr-1, 2, "ПО ПЛОЩАДКАМ").font = f_h2
SH = ["Площадка","Корпусов","Площадь, м²","Раствор, л","Фоснитацид, л","НУЖНО канистр","Сейчас, канистр","Не хватает, канистр"]
for j,h in enumerate(SH,2): txt(o, hr, j, h, font=f_hdr, fill=fl_hdr)
o.row_dimensions[hr].height = 40
rr = hr+1; sf = rr; agg=[]
for site in SITE_ORDER:
    sub=[x for x in rows_vals if x[0]==site]
    cnt=len(sub); a=sum(x[1] for x in sub); rast=a*V_NORM*V_MULT; conc=rast*V_CONC/100
    need=sum(x[4] for x in sub); fact=cnt*V_FACT
    fl = fl_alt if (rr-sf)%2 else None
    txt(o,rr,2,site,font=f_bb,fill=fl)
    put(o,rr,3,f"=COUNTIF({S_RNG},$B{rr})",cnt,INT,fill=fl)
    put(o,rr,4,f"=SUMIF({S_RNG},$B{rr},{A_RNG})",a,INT,fill=fl)
    put(o,rr,5,f"=D{rr}*{NORM}*{MULT}",rast,INT,fill=fl)
    put(o,rr,6,f"=E{rr}*{CONC}/100",conc,INT,fill=fl)
    put(o,rr,7,f"=SUMIF({S_RNG},$B{rr},{N_RNG})",need,INT,font=f_bb,fill=fl)
    put(o,rr,8,f"=SUMIF({S_RNG},$B{rr},{F_RNG})",fact,INT,fill=fl)
    put(o,rr,9,f"=G{rr}-H{rr}",need-fact,DEF,fill=fl)
    agg.append((cnt,a,rast,conc,need,fact)); rr+=1
sl=rr-1
txt(o,rr,2,"ИТОГО",font=f_bb,fill=fl_tot,b=bdt)
for col,fmt,i in [(3,INT,0),(4,INT,1),(5,INT,2),(6,INT,3),(7,INT,4),(8,INT,5)]:
    L=get_column_letter(col); put(o,rr,col,f"=SUM({L}{sf}:{L}{sl})",sum(x[i] for x in agg),fmt,font=f_bb,fill=fl_tot,b=bdt)
put(o,rr,9,f"=G{rr}-H{rr}",sum(x[4] for x in agg)-sum(x[5] for x in agg),DEF,font=f_bb,fill=fl_tot,b=bdt)

k = rr+2
o.cell(k,2,"НА ОДИН КОРПУС").font = f_h2; k+=1
for j,h in enumerate(["Площадки","Площадь корпуса, м²","Фоснитацид на корпус, л","Канистр на корпус"],2):
    txt(o,k,j,h,font=f_hdr,fill=fl_hdr)
o.row_dimensions[k].height = 40
k+=1
groups=[("Г, Д, В, БП-12, БП-13, БП-14","1 459 – 1 680","73 – 84","4"),
        ("А, Б, Е, Ж","1 061 – 1 163","53 – 58","3")]
for g in groups:
    for j,v in enumerate(g,2):
        txt(o,k,j,v,font=(f_bb if j==5 else f_b),al=(lft if j==2 else ctr))
    o.merge_cells(start_row=k,start_column=2,end_row=k,end_column=3)
    o.row_dimensions[k].height = 22; k+=1
k+=1
txt(o,k,2,"Порог — 1 380 м²: корпуса больше этой площади требуют 4 канистры, меньше — 3. "
          "Канистры округляются вверх, дробную канистру выдать нельзя.",font=f_sub,al=lft,b=None)
o.merge_cells(start_row=k,start_column=2,end_row=k+1,end_column=9)

# ======================= СЦЕНАРИИ =========================================
c = sh_scn
for col,w in [("A",3),("B",15),("C",16),("D",16),("E",15),("F",16),("G",50)]: c.column_dimensions[col].width = w
c["B2"] = "СЦЕНАРИИ НОРМ РАСХОДА"; c["B2"].font = f_h1
c["B3"] = "Способ обработки — мойка. Рабочий диапазон норм 0,3–1,0 л/м²."; c["B3"].font = f_sub
hr = 5
for j,h in enumerate(["Норма, л/м²","Раствор всего, л","Фоснитацид всего, л","НУЖНО канистр","Сейчас, канистр","Комментарий"],2):
    txt(c,hr,j,h,font=f_hdr,fill=fl_hdr)
c.row_dimensions[hr].height = 40
TA=f"'{DET}'!$D${T}"; NK=f"'{DET}'!$C${T}"
scen=[(0.15,"Соответствует текущей выдаче 1 канистры. Аэрозольный режим — НЕ ваш случай"),
      (0.30,"Мойка, минимальный режим"),
      (0.50,"МОЙКА, гладкие поверхности — ПРИНЯТО В РАСЧЁТЕ"),
      (0.75,"Мойка, промежуточный режим"),
      (1.00,"Мойка шероховатых поверхностей (бетон, кирпич)")]
rr=hr+1
for norm,com in scen:
    hl = abs(norm-V_NORM)<1e-9
    fb = f_bb if hl else f_b; fi = fl_tot if hl else None
    rast=S(1)*norm*V_MULT; conc=rast*V_CONC/100
    need=sum(math.ceil(x[1]*norm*V_MULT*V_CONC/100/V_CAN-1e-9) for x in rows_vals)
    txt(c,rr,2,norm,NRM,font=fb,fill=fi)
    put(c,rr,3,f"={TA}*B{rr}*{MULT}",rast,INT,font=fb,fill=fi)
    put(c,rr,4,f"=C{rr}*{CONC}/100",conc,INT,font=fb,fill=fi)
    put(c,rr,5,f"=SUMPRODUCT(ROUNDUP({A_RNG}*$B{rr}*{MULT}*{CONC}/100/{CAN},0))",need,INT,font=fb,fill=fi)
    put(c,rr,6,f"={NK}*{FACT}",len(rows_vals)*V_FACT,INT,font=fb,fill=fi)
    txt(c,rr,7,com,font=fb,fill=fi,al=lft)
    c.row_dimensions[rr].height = 22; rr+=1
rr+=1
txt(c,rr,2,"Текущая выдача 23 л на корпус соответствует норме всего 0,158 л/м² — это втрое ниже "
           "минимального режима мойки. Если поверхности шероховатые (бетон, кирпич), норма по инструкции "
           "может быть 1,0 л/м².",font=f_sub,al=lft,b=None)
c.merge_cells(start_row=rr,start_column=2,end_row=rr+2,end_column=7)

wb.save(OUT)

def inject(path, cache, titles):
    tmp=path+".tmp"; zin=zipfile.ZipFile(path); byi={i+1:t for i,t in enumerate(titles)}
    with zipfile.ZipFile(tmp,"w",zipfile.ZIP_DEFLATED) as zo:
        for it in zin.infolist():
            data=zin.read(it.filename)
            m=re.match(r"xl/worksheets/sheet(\d+)\.xml$", it.filename)
            if m:
                title=byi[int(m.group(1))]; xml=data.decode("utf-8")
                def fix(mo):
                    whole,ref,at,body=mo.group(0),mo.group(1),mo.group(2),mo.group(3)
                    if "<f>" not in body: return whole
                    v=cache.get((title,ref))
                    if v is None: return whole
                    fv=float(v); sv=str(int(fv)) if fv==int(fv) else repr(fv)
                    nb,n=re.subn(r"<v\s*/>|<v></v>", f"<v>{sv}</v>", body, count=1)
                    if n==0:
                        if re.search(r"<v>[^<]", body): return whole
                        nb=body+f"<v>{sv}</v>"
                    return f'<c r="{ref}"{at}>{nb}</c>'
                xml=re.sub(r'<c r="([A-Z]+\d+)"([^>]*?)(?<!/)>(.*?)</c>', fix, xml, flags=re.S)
                data=xml.encode("utf-8")
            zo.writestr(it,data)
    zin.close(); shutil.move(tmp,path)

inject(OUT, CACHE, [w.title for w in wb.worksheets])
print("OK ->", OUT, "| корпусов:", len(rows_vals), "| канистр:", S(4), "| конц, л:", round(S(3),1))
