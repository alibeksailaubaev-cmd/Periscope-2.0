# -*- coding: utf-8 -*-
"""Фоснитацид: потребность по каждой площадке, печатные формы."""
import math, re, shutil, zipfile
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.properties import PageSetupProperties

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
SITES = ["Г","Д","Б","Е","А","Ж","В","БП-12","БП-13","БП-14"]
DEZ = "Фоснитацид"
V_CONC, V_NORM, V_MULT, V_CAN, V_FACT = 10.0, 0.5, 1.0, 23.0, 1.0

F="Arial"; GREEN="1F6F54"
f_h1=Font(name=F,size=14,bold=True,color=GREEN); f_h2=Font(name=F,size=12,bold=True,color=GREEN)
f_sub=Font(name=F,size=9,color="666666"); f_hdr=Font(name=F,size=9,bold=True,color="FFFFFF")
f_b=Font(name=F,size=10); f_bb=Font(name=F,size=10,bold=True)
f_big=Font(name=F,size=18,bold=True,color=GREEN); f_bigr=Font(name=F,size=18,bold=True,color="C00000")
f_in=Font(name=F,size=12,bold=True,color="0000FF")
fl_hdr=PatternFill("solid",fgColor=GREEN); fl_tot=PatternFill("solid",fgColor="E8F1ED")
fl_alt=PatternFill("solid",fgColor="F7FAF9"); fl_in=PatternFill("solid",fgColor="FFF2A8")
fl_kpi=PatternFill("solid",fgColor="FBF9F3"); fl_grp=PatternFill("solid",fgColor="D6E6DF")
th=Side(style="thin",color="9FB8AE"); md=Side(style="medium",color=GREEN)
bd=Border(left=th,right=th,top=th,bottom=th)
bdt=Border(left=th,right=th,top=md,bottom=md)
ctr=Alignment(horizontal="center",vertical="center",wrap_text=True)
lft=Alignment(horizontal="left",vertical="center",wrap_text=True)
INT="#,##0"; D1="#,##0.0"; D2="#,##0.00"; PCT='0" %"'; DEF='#,##0;[Red]-#,##0'

CACHE={}
def put(ws,r,c,f_,v,fmt=None,font=f_b,fill=None,al=ctr,b=bd):
    x=ws.cell(r,c,f_); CACHE[(ws.title,x.coordinate)]=v
    if fmt: x.number_format=fmt
    x.font=font
    if fill: x.fill=fill
    x.alignment=al
    if b: x.border=b
    return x
def txt(ws,r,c,v,fmt=None,font=f_b,fill=None,al=ctr,b=bd):
    x=ws.cell(r,c,v)
    if fmt: x.number_format=fmt
    x.font=font
    if fill: x.fill=fill
    x.alignment=al
    if b: x.border=b
    return x

wb=Workbook(); wb.calculation.fullCalcOnLoad=True
sh_tot=wb.active; sh_tot.title="ИТОГ"
site_sheets={s: wb.create_sheet(s) for s in SITES}
sh_par=wb.create_sheet("Параметры"); sh_scn=wb.create_sheet("Сценарии")
for s in wb.worksheets: s.sheet_view.showGridLines=False

# ============================ ПАРАМЕТРЫ ====================================
p=sh_par
for c_,w in [("A",3),("B",42),("C",16),("D",64)]: p.column_dimensions[c_].width=w
p["B2"]="ПАРАМЕТРЫ РАСЧЕТА"; p["B2"].font=f_h1
p["B3"]="Меняйте только жёлтые ячейки — все листы пересчитаются сами."; p["B3"].font=f_sub
for j,h in enumerate(["Параметр","Значение","Пояснение"]): txt(p,5,2+j,h,font=f_hdr,fill=fl_hdr)
p.row_dimensions[5].height=22
PAR=[("Наименование дезсредства",DEZ,None,False,"Наименование по заданию."),
     ("Способ обработки","Мойка (влажная дезинфекция)",None,False,"Подтверждено заказчиком."),
     ("Концентрация раствора, %",V_CONC,D1,True,"10-процентный рабочий раствор."),
     ("Норма расхода раствора, л/м²",V_NORM,"0.00",True,
      "Типовая норма мойки по гладким поверхностям. Для шероховатого бетона и кирпича — 1,0 л/м². См. лист «Сценарии»."),
     ("Кратность обработки",V_MULT,INT,True,"1 = один раз за санразрыв."),
     ("Объём канистры, л",V_CAN,D1,True,"1 канистра = 23 л концентрата."),
     ("Выдаётся сейчас на корпус, канистр",V_FACT,D1,True,"Действующая практика — 1 канистра на любой корпус.")]
r=6; PR={}
for lab,val,fmt,isin,note in PAR:
    txt(p,r,2,lab,font=f_bb,al=lft)
    txt(p,r,3,val,fmt,font=(f_in if isin else f_bb),fill=(fl_in if isin else fl_tot))
    txt(p,r,4,note,font=f_sub,al=lft); p.row_dimensions[r].height=30; PR[lab]=r; r+=1
CONC=f"'Параметры'!$C${PR['Концентрация раствора, %']}"
NORM=f"'Параметры'!$C${PR['Норма расхода раствора, л/м²']}"
MULT=f"'Параметры'!$C${PR['Кратность обработки']}"
CAN =f"'Параметры'!$C${PR['Объём канистры, л']}"
FACT=f"'Параметры'!$C${PR['Выдаётся сейчас на корпус, канистр']}"
r+=2
txt(p,r,2,"КАК СЧИТАЕТСЯ (пример: птичник 1 680 м²)",font=f_h2,al=lft,b=None); r+=1
for line in ["Шаг 1.  Раствор:      1 680 м² × 0,5 л/м²   =  840 л раствора",
             "Шаг 2.  Фоснитацид:   840 л × 10 %          =  84 л  (+ 756 л воды)",
             "Шаг 3.  Канистры:     84 л ÷ 23 л = 3,65    →  4 канистры (вверх)"]:
    txt(p,r,2,line,font=Font(name="Consolas",size=10),al=lft,b=None)
    p.merge_cells(start_row=r,start_column=2,end_row=r,end_column=4); r+=1

# ======================= ЛИСТЫ ПЛОЩАДОК ====================================
COLS=[("№\nп/п",5),("Пло­щадка",9),("Бройлер­ный\nучасток",10),("№\nптични­ка",8),
      ("Объём,\nм³",9),("Площадь,\nм²",10),("Наименование\nдезсредства",15),
      ("Кон­цен­тра­ция",8),("ТРЕБУЕТСЯ,\nлитров",11),("Канистр\nпо 23 л, шт",10)]
site_info={}
for site in SITES:
    ws=site_sheets[site]
    blocks=[(u,k) for u,s,k in DATA if s==site]
    uch=", ".join(u for u,_ in blocks)
    n=sum(len(k) for _,k in blocks)
    for j,(h,w) in enumerate(COLS,1): ws.column_dimensions[get_column_letter(j)].width=w
    ws["A1"]=f"БРОЙЛЕРНАЯ ПЛОЩАДКА «{site}»"; ws["A1"].font=f_h1
    ws.merge_cells("A1:J1"); ws["A1"].alignment=Alignment(horizontal="center",vertical="center")
    ws.row_dimensions[1].height=24
    ws["A2"]=(f"Бройлерный участок {uch}   ·   Птичников: {n}   ·   Дезсредство: {DEZ}   ·   "
              f"Концентрация раствора: 10 %   ·   Периодичность: 1 раз согласно графику санразрыва")
    ws["A2"].font=f_sub; ws.merge_cells("A2:J2")
    ws["A2"].alignment=Alignment(horizontal="center",vertical="center")
    ws.row_dimensions[2].height=16
    HR=4
    for j,(h,_) in enumerate(COLS,1): txt(ws,HR,j,h,font=f_hdr,fill=fl_hdr)
    ws.row_dimensions[HR].height=42
    row=HR+1; f0=row; idx=1; vals=[]
    for u,korp in blocks:
        if len(blocks)>1:
            txt(ws,row,1,f"Бройлерный участок {u}",font=f_bb,fill=fl_grp,al=lft)
            for j in range(2,11): txt(ws,row,j,"",fill=fl_grp)
            ws.merge_cells(start_row=row,start_column=1,end_row=row,end_column=10)
            ws.row_dimensions[row].height=18; row+=1
        for num,vol,area in korp:
            fl=fl_alt if idx%2==0 else None
            conc=area*V_NORM*V_MULT*V_CONC/100; kan=math.ceil(conc/V_CAN-1e-9)
            txt(ws,row,1,idx,INT,fill=fl); txt(ws,row,2,site,font=f_bb,fill=fl)
            txt(ws,row,3,u,fill=fl); txt(ws,row,4,num,font=f_bb,fill=fl)
            txt(ws,row,5,vol,INT,fill=fl); txt(ws,row,6,area,D2,fill=fl)
            txt(ws,row,7,DEZ,fill=fl)
            put(ws,row,8,f"={CONC}",V_CONC,PCT,fill=fl)
            put(ws,row,9,f"=F{row}*{NORM}*{MULT}*{CONC}/100",conc,D1,font=f_bb,fill=fl)
            put(ws,row,10,f"=ROUNDUP(I{row}/{CAN},0)",kan,INT,font=f_bb,fill=fl)
            vals.append((row,vol,area,conc,kan)); idx+=1; row+=1
    l0=row-1; TR=row
    txt(ws,TR,1,"ИТОГО",font=f_bb,fill=fl_tot,b=bdt)
    for j in (2,3,7,8): txt(ws,TR,j,"",fill=fl_tot,b=bdt)
    put(ws,TR,4,f"=COUNT(A{f0}:A{l0})",len(vals),INT,font=f_bb,fill=fl_tot,b=bdt)
    for col,fmt,i in [(5,INT,1),(6,D2,2),(9,D1,3),(10,INT,4)]:
        L=get_column_letter(col)
        rng="+".join(f"{L}{rw}" for rw,*_ in vals) if len(blocks)>1 else f"SUM({L}{f0}:{L}{l0})"
        formula=f"={rng}" if len(blocks)>1 else f"={rng}"
        put(ws,TR,col,formula,sum(x[i] for x in vals),fmt,font=f_bb,fill=fl_tot,b=bdt)
    ws.row_dimensions[TR].height=20
    nr=TR+2
    txt(ws,nr,1,f"Расчёт: Площадь, м²  ×  0,5 л/м²  ×  10 %  =  требуется литров {DEZ}а.  "
                f"Канистры округляются вверх (1 канистра = 23 л).",font=f_sub,al=lft,b=None)
    ws.merge_cells(start_row=nr,start_column=1,end_row=nr,end_column=10)
    sg=nr+2
    txt(ws,sg,1,"Составил: ________________________",font=f_b,al=lft,b=None)
    ws.merge_cells(start_row=sg,start_column=1,end_row=sg,end_column=4)
    txt(ws,sg,6,"Проверил: ________________________",font=f_b,al=lft,b=None)
    ws.merge_cells(start_row=sg,start_column=6,end_row=sg,end_column=10)
    # печать
    ws.page_setup.orientation="portrait"; ws.page_setup.paperSize=ws.PAPERSIZE_A4
    ws.sheet_properties.pageSetUpPr=PageSetupProperties(fitToPage=True)
    ws.page_setup.fitToWidth=1; ws.page_setup.fitToHeight=0
    ws.print_title_rows=f"{HR}:{HR}"; ws.print_area=f"A1:J{sg}"
    ws.page_margins.left=ws.page_margins.right=0.4
    ws.page_margins.top=ws.page_margins.bottom=0.5
    ws.freeze_panes=f"A{HR+1}"
    ws.oddFooter.right.text="Стр. &P из &N"; ws.oddFooter.left.text=f"Площадка «{site}» · {DEZ}"
    site_info[site]=dict(sheet=ws.title,n=len(vals),tr=TR,
                         area=sum(x[2] for x in vals),vol=sum(x[1] for x in vals),
                         conc=sum(x[3] for x in vals),kan=sum(x[4] for x in vals))

# ============================== ИТОГ =======================================
o=sh_tot
for c_,w in [("A",4),("B",14),("C",11),("D",13),("E",13),("F",13),("G",14),("H",13),("I",14)]:
    o.column_dimensions[c_].width=w
o["B2"]=f"{DEZ.upper()} — ПОТРЕБНОСТЬ ПО ПЛОЩАДКАМ"; o["B2"].font=f_h1
o["B3"]=("Мойка (влажная дезинфекция) · норма 0,5 л/м² · раствор 10 % · канистра 23 л · "
         "1 раз согласно графику санразрыва"); o["B3"].font=f_sub

TOT_N=sum(v["n"] for v in site_info.values()); TOT_A=sum(v["area"] for v in site_info.values())
TOT_C=sum(v["conc"] for v in site_info.values()); TOT_K=sum(v["kan"] for v in site_info.values())
sum_ref=lambda col: "+".join(f"'{site_info[s]['sheet']}'!{col}{site_info[s]['tr']}" for s in SITES)

KPI=[("Всего птичников",f"={sum_ref('D')}",TOT_N,INT,False),
     ("Общая площадь, м²",f"={sum_ref('F')}",TOT_A,INT,False),
     (f"Требуется {DEZ}а, л",f"={sum_ref('I')}",TOT_C,INT,False),
     ("Требуется канистр",f"={sum_ref('J')}",TOT_K,INT,False),
     ("Выдаётся сейчас, канистр",f"={TOT_N}*{FACT}",TOT_N*V_FACT,INT,False),
     ("Не хватает, канистр","=B9-D9",TOT_K-TOT_N*V_FACT,INT,True)]
for i,(lab,f_,v,fmt,red) in enumerate(KPI):
    c0=2+(i%3)*2; r0=5+(i//3)*3
    txt(o,r0,c0,lab,font=Font(name=F,size=9,bold=True,color="666666"),fill=fl_kpi)
    o.merge_cells(start_row=r0,start_column=c0,end_row=r0,end_column=c0+1)
    put(o,r0+1,c0,f_,v,fmt,font=(f_bigr if red else f_big),fill=fl_kpi)
    o.merge_cells(start_row=r0+1,start_column=c0,end_row=r0+1,end_column=c0+1)
    o.row_dimensions[r0+1].height=28

hr=12
o.cell(hr-1,2,"ПО КАЖДОЙ ПЛОЩАДКЕ").font=f_h2
SH=["Площадка","Птични­ков","Объём, м³","Площадь, м²","Дезсредство","Концен­трация",
    "ТРЕБУЕТСЯ, литров","Канистр, шт","Лист для печати"]
for j,h in enumerate(SH,2): txt(o,hr,j,h,font=f_hdr,fill=fl_hdr)
o.row_dimensions[hr].height=40
rr=hr+1; sf=rr
for s in SITES:
    v=site_info[s]; sr=f"'{v['sheet']}'"; tr=v["tr"]; fl=fl_alt if (rr-sf)%2 else None
    txt(o,rr,2,s,font=f_bb,fill=fl)
    put(o,rr,3,f"={sr}!D{tr}",v["n"],INT,fill=fl)
    put(o,rr,4,f"={sr}!E{tr}",v["vol"],INT,fill=fl)
    put(o,rr,5,f"={sr}!F{tr}",v["area"],"#,##0.0",fill=fl)
    txt(o,rr,6,DEZ,fill=fl)
    put(o,rr,7,f"={CONC}",V_CONC,PCT,fill=fl)
    put(o,rr,8,f"={sr}!I{tr}",v["conc"],D1,font=f_bb,fill=fl)
    put(o,rr,9,f"={sr}!J{tr}",v["kan"],INT,font=f_bb,fill=fl)
    txt(o,rr,10,f"лист «{s}»",font=Font(name=F,size=9,color="1F6F54"),fill=fl)
    rr+=1
sl=rr-1
txt(o,rr,2,"ИТОГО",font=f_bb,fill=fl_tot,b=bdt)
for col,fmt,key in [(3,INT,"n"),(4,INT,"vol"),(5,"#,##0.0","area"),(8,D1,"conc"),(9,INT,"kan")]:
    L=get_column_letter(col)
    put(o,rr,col,f"=SUM({L}{sf}:{L}{sl})",sum(site_info[s][key] for s in SITES),fmt,font=f_bb,fill=fl_tot,b=bdt)
for j in (6,7,10): txt(o,rr,j,"",fill=fl_tot,b=bdt)

k=rr+2
o.cell(k,2,"СКОЛЬКО УХОДИТ НА ОДИН ПТИЧНИК").font=f_h2; k+=1
for j,h in enumerate(["Площадки","Площадь птичника, м²","Требуется литров","Канистр"],2):
    txt(o,k,j,h,font=f_hdr,fill=fl_hdr)
o.row_dimensions[k].height=30; k+=1
for g in [("Г, Д, В, БП-12, БП-13, БП-14","1 459 – 1 680","73 – 84 л","4"),
          ("А, Б, Е, Ж","1 061 – 1 163","53 – 58 л","3")]:
    for j,val in enumerate(g,2):
        txt(o,k,j,val,font=(f_bb if j==5 else f_b),al=(lft if j==2 else ctr))
    o.merge_cells(start_row=k,start_column=2,end_row=k,end_column=3); k+=1
k+=1
txt(o,k,2,"Сейчас выдаётся 1 канистра (23 л) на любой птичник независимо от площади. "
          "По расчёту требуется 3 канистры для площадок А, Б, Е, Ж и 4 канистры для остальных.",
    font=f_sub,al=lft,b=None)
o.merge_cells(start_row=k,start_column=2,end_row=k+1,end_column=10)

# ============================ СЦЕНАРИИ =====================================
c=sh_scn
for c_,w in [("A",3),("B",14),("C",16),("D",18),("E",14),("F",14),("G",48)]: c.column_dimensions[c_].width=w
c["B2"]="СЦЕНАРИИ НОРМ РАСХОДА"; c["B2"].font=f_h1
c["B3"]="Способ обработки — мойка. Рабочий диапазон норм 0,3–1,0 л/м²."; c["B3"].font=f_sub
hr=5
for j,h in enumerate(["Норма, л/м²","Раствор всего, л","Требуется всего, л","Канистр","Сейчас, канистр","Комментарий"],2):
    txt(c,hr,j,h,font=f_hdr,fill=fl_hdr)
c.row_dimensions[hr].height=34
areas=[a for _,_,k in DATA for _,_,a in k]
for i,(norm,com) in enumerate([(0.15,"Соответствует текущей выдаче 1 канистры. Аэрозольный режим — НЕ ваш случай"),
                               (0.30,"Мойка, минимальный режим"),
                               (0.50,"МОЙКА, гладкие поверхности — ПРИНЯТО В РАСЧЁТЕ"),
                               (0.75,"Мойка, промежуточный режим"),
                               (1.00,"Мойка шероховатых поверхностей (бетон, кирпич)")]):
    rr=hr+1+i; hl=abs(norm-V_NORM)<1e-9
    fb=f_bb if hl else f_b; fi=fl_tot if hl else None
    rast=TOT_A*norm*V_MULT; conc=rast*V_CONC/100
    kan=sum(math.ceil(a*norm*V_MULT*V_CONC/100/V_CAN-1e-9) for a in areas)
    txt(c,rr,2,norm,"0.00",font=fb,fill=fi)
    put(c,rr,3,f"={TOT_A}*B{rr}*{MULT}",rast,INT,font=fb,fill=fi)
    put(c,rr,4,f"=C{rr}*{CONC}/100",conc,INT,font=fb,fill=fi)
    txt(c,rr,5,kan,INT,font=fb,fill=fi)
    put(c,rr,6,f"={TOT_N}*{FACT}",TOT_N*V_FACT,INT,font=fb,fill=fi)
    txt(c,rr,7,com,font=fb,fill=fi,al=lft); c.row_dimensions[rr].height=20
rr=hr+7
txt(c,rr,2,"Текущая выдача 23 л на птичник соответствует норме всего 0,158 л/м² — втрое ниже минимального "
           "режима мойки. Столбец «Канистр» здесь считается для справки и не пересчитывается от «Параметров».",
    font=f_sub,al=lft,b=None)
c.merge_cells(start_row=rr,start_column=2,end_row=rr+2,end_column=7)

wb.save(OUT)

def inject(path,cache,titles):
    tmp=path+".tmp"; zin=zipfile.ZipFile(path); byi={i+1:t for i,t in enumerate(titles)}
    with zipfile.ZipFile(tmp,"w",zipfile.ZIP_DEFLATED) as zo:
        for it in zin.infolist():
            data=zin.read(it.filename)
            m=re.match(r"xl/worksheets/sheet(\d+)\.xml$",it.filename)
            if m:
                title=byi[int(m.group(1))]; xml=data.decode("utf-8")
                def fix(mo):
                    whole,ref,at,body=mo.group(0),mo.group(1),mo.group(2),mo.group(3)
                    if "<f>" not in body: return whole
                    v=cache.get((title,ref))
                    if v is None: return whole
                    fv=float(v); sv=str(int(fv)) if fv==int(fv) else repr(fv)
                    nb,n=re.subn(r"<v\s*/>|<v></v>",f"<v>{sv}</v>",body,count=1)
                    if n==0:
                        if re.search(r"<v>[^<]",body): return whole
                        nb=body+f"<v>{sv}</v>"
                    return f'<c r="{ref}"{at}>{nb}</c>'
                xml=re.sub(r'<c r="([A-Z]+\d+)"([^>]*?)(?<!/)>(.*?)</c>',fix,xml,flags=re.S)
                data=xml.encode("utf-8")
            zo.writestr(it,data)
    zin.close(); shutil.move(tmp,path)

inject(OUT,CACHE,[w.title for w in wb.worksheets])
print("OK ->",OUT)
print("листов:",len(wb.worksheets),"| птичников:",TOT_N,"| площадь:",round(TOT_A,2),
      "| требуется л:",round(TOT_C,1),"| канистр:",TOT_K)
for s in SITES:
    v=site_info[s]
    print("  %-7s птичников %-3d площадь %9.2f  требуется %8.1f л  канистр %3d"%(s,v["n"],v["area"],v["conc"],v["kan"]))
