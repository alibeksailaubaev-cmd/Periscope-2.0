import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  Phone, ClipboardCheck, DoorOpen, Truck, ShieldCheck, Package, Boxes, Home,
  Siren, Bug, FileText, GraduationCap, Megaphone, BadgeCheck, FlaskConical,
  Droplets, Warehouse, Layers, Car, Users, AlertTriangle, Gauge, ChevronDown,
  X, ArrowRight, TrendingUp, ShieldAlert, UserPlus, Radar, Sun, Moon,
  Building2, Clock, Check, Activity,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   1. ДИЗАЙН-ТОКЕНЫ  —  тёмная (неон/glassmorphism) и светлая (premium) темы
   ═══════════════════════════════════════════════════════════════════════════ */

const THEMES = {
  dark: {
    key: "dark",
    bg: "#05070f",
    text: "#e9eefb",
    muted: "#8f9bb8",
    faint: "#5d6884",
    panel: "rgba(255,255,255,0.045)",
    panelHi: "rgba(255,255,255,0.075)",
    solid: "rgba(11,15,28,0.86)",
    border: "rgba(255,255,255,0.10)",
    borderHi: "rgba(255,255,255,0.20)",
    grid: "rgba(255,255,255,0.06)",
    blue: "#4f8cff",
    violet: "#a06bff",
    cyan: "#22d3ee",
    red: "#ff4d5e",
    amber: "#ffb020",
    teal: "#2dd4bf",
    shadow: "0 30px 70px -28px rgba(0,0,0,0.9)",
    glowA: "rgba(79,140,255,0.30)",
    glowB: "rgba(160,107,255,0.26)",
    glowC: "rgba(255,77,94,0.22)",
    blobs: [
      "radial-gradient(closest-side, rgba(79,140,255,0.55), transparent)",
      "radial-gradient(closest-side, rgba(160,107,255,0.45), transparent)",
      "radial-gradient(closest-side, rgba(34,211,238,0.32), transparent)",
      "radial-gradient(closest-side, rgba(255,77,94,0.28), transparent)",
    ],
    vignette:
      "radial-gradient(120% 90% at 50% -10%, rgba(79,140,255,0.16), transparent 60%), radial-gradient(90% 80% at 100% 100%, rgba(160,107,255,0.12), transparent 60%)",
  },
  light: {
    key: "light",
    bg: "#f4f7fd",
    text: "#0d1526",
    muted: "#5c6a86",
    faint: "#8794ab",
    panel: "rgba(255,255,255,0.72)",
    panelHi: "rgba(255,255,255,0.92)",
    solid: "rgba(255,255,255,0.94)",
    border: "rgba(13,21,38,0.09)",
    borderHi: "rgba(13,21,38,0.18)",
    grid: "rgba(13,21,38,0.07)",
    blue: "#2f6bf0",
    violet: "#7c46e8",
    cyan: "#0aa6c4",
    red: "#e0384c",
    amber: "#d1860f",
    teal: "#0f9b8a",
    shadow: "0 28px 60px -30px rgba(20,35,80,0.35)",
    glowA: "rgba(47,107,240,0.20)",
    glowB: "rgba(124,70,232,0.18)",
    glowC: "rgba(224,56,76,0.16)",
    blobs: [
      "radial-gradient(closest-side, rgba(120,170,255,0.60), transparent)",
      "radial-gradient(closest-side, rgba(186,150,255,0.52), transparent)",
      "radial-gradient(closest-side, rgba(130,235,250,0.42), transparent)",
      "radial-gradient(closest-side, rgba(255,166,180,0.38), transparent)",
    ],
    vignette:
      "radial-gradient(120% 90% at 50% -10%, rgba(120,170,255,0.28), transparent 62%), radial-gradient(90% 80% at 100% 100%, rgba(186,150,255,0.22), transparent 60%)",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. ДАННЫЕ  —  20 направлений отдела биобезопасности
   Все производные показатели (нагрузка, покрытие, дефицит штата) считаются
   из этой таблицы, поэтому цифры в интерфейсе всегда согласованы между собой.
   ═══════════════════════════════════════════════════════════════════════════ */

const GROUPS = {
  reg:   { id: "reg",   title: "Регламентные процессы", icon: ClipboardCheck, tone: "blue"   },
  daily: { id: "daily", title: "Ежедневные проверки",   icon: Radar,          tone: "cyan"   },
  crit:  { id: "crit",  title: "Критические задачи",    icon: Siren,          tone: "red"    },
};

// hours  — нормо-часы в неделю, необходимые для полного закрытия направления
// covered — сколько из них реально закрывают 2 действующих сотрудника
const TASKS = [
  { id: "coord",     name: "Согласование",                    icon: Phone,         group: "reg",   contour: "external", hours: 22, covered: 22, freq: "непрерывно",   note: "Транспорт, подрядчики, службы предприятия — входящий поток заявок" },
  { id: "audit",     name: "Аудит соответствия",              icon: ClipboardCheck, group: "reg",  contour: "external", hours: 8,  covered: 4,  freq: "еженедельно",  note: "Внешние и внутренние проверки требований биобезопасности" },
  { id: "entry",     name: "Входной поток людей",             icon: DoorOpen,      group: "daily", contour: "external", hours: 12, covered: 6,  freq: "ежедневно",    note: "Проходная, санобработка при входе на территорию" },
  { id: "transport", name: "Мойка и дезинфекция транспорта",  icon: Truck,         group: "daily", contour: "external", hours: 11, covered: 5,  freq: "ежедневно",    note: "Дезбарьер на въезде, контроль качества обработки" },
  { id: "barriers",  name: "Дезбарьеры и дезковрики",         icon: ShieldCheck,   group: "daily", contour: "external", hours: 6,  covered: 3,  freq: "ежедневно",    note: "Заправка, замена растворов, контроль концентрации" },
  { id: "raw",       name: "Входной контроль сырья и ТМЦ",    icon: Package,       group: "daily", contour: "external", hours: 9,  covered: 4,  freq: "ежедневно",    note: "Проверка партий и тары до разгрузки" },
  { id: "suppliers", name: "Поставщики и подрядчики",         icon: Boxes,         group: "crit",  contour: "external", hours: 5,  covered: 3,  freq: "по событию",   note: "Допуск, документы, санитарный статус контрагентов" },
  { id: "lph",       name: "ЛПХ сотрудников",                 icon: Home,          group: "crit",  contour: "external", hours: 7,  covered: 1,  freq: "ежемесячно",   note: "Личные подсобные хозяйства — риск заноса инфекции извне" },
  { id: "epizoot",   name: "Эпизодситуация в регионе",        icon: Siren,         group: "crit",  contour: "external", hours: 8,  covered: 2,  freq: "мониторинг",   note: "Реагирование на вспышки, усиление режима на границе" },
  { id: "pestout",   name: "Внешний пест-контроль периметра", icon: Bug,           group: "crit",  contour: "external", hours: 3,  covered: 0,  freq: "еженедельно",  note: "Барьер от грызунов и насекомых по периметру территории" },

  { id: "report",    name: "Отчётность",                      icon: FileText,      group: "reg",   contour: "internal", hours: 16, covered: 16, freq: "ежедневно",    note: "Журналы, сводки, обязательная документация" },
  { id: "training",  name: "Обучение персонала",              icon: GraduationCap, group: "reg",   contour: "internal", hours: 5,  covered: 1,  freq: "ежемесячно",   note: "Очное обучение нормам биобезопасности" },
  { id: "brief",     name: "Инструктажи на местах",           icon: Megaphone,     group: "reg",   contour: "internal", hours: 4,  covered: 1,  freq: "еженедельно",  note: "Регулярные инструктажи по цехам и участкам" },
  { id: "verify",    name: "Верификация приёмки мойки",       icon: BadgeCheck,    group: "reg",   contour: "internal", hours: 6,  covered: 3,  freq: "ежедневно",    note: "Проверка качества мойки оборудования после обработки" },
  { id: "lab",       name: "Тестирование, лабораторные пробы",icon: FlaskConical,  group: "reg",   contour: "internal", hours: 5,  covered: 1,  freq: "еженедельно",  note: "Смывы и пробы внутри контура, работа с лабораторией" },
  { id: "chem",      name: "Учёт дезсредств",                 icon: Droplets,      group: "reg",   contour: "internal", hours: 4,  covered: 3,  freq: "еженедельно",  note: "Остатки, расход, сроки годности на складе" },
  { id: "pestin",    name: "Внутренний пест-контроль",        icon: Bug,           group: "daily", contour: "internal", hours: 5,  covered: 2,  freq: "еженедельно",  note: "Ловушки и мониторинг внутри производственных помещений" },
  { id: "hangar",    name: "Ангар — санитарный режим",        icon: Warehouse,     group: "daily", contour: "internal", hours: 6,  covered: 3,  freq: "ежедневно",    note: "Контроль состояния и режима внутри производственного ангара" },
  { id: "husk",      name: "Склады лузги",                    icon: Layers,        group: "daily", contour: "internal", hours: 4,  covered: 0,  freq: "еженедельно",  note: "Санитарный контроль зон хранения подстилочного материала" },
  { id: "atc",       name: "АТЦ — мойка и осмотр",            icon: Car,           group: "crit",  contour: "internal", hours: 2,  covered: 0,  freq: "еженедельно",  note: "Автотранспортный цех: плановый осмотр и обработка техники" },
];

const STAFF = 2;                 // текущий штат
const HOURS_PER_STAFF = 40;      // нормо-часов в неделю на одного специалиста

const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

const METRICS = (() => {
  const demandWeek = sum(TASKS, (t) => t.hours);                     // 148
  const capacityWeek = STAFF * HOURS_PER_STAFF;                      // 80
  const ext = TASKS.filter((t) => t.contour === "external");
  const int = TASKS.filter((t) => t.contour === "internal");
  const extDemand = sum(ext, (t) => t.hours);                        // 91
  const extCovered = sum(ext, (t) => t.covered);                     // 50
  const load = Math.round((demandWeek / capacityWeek) * 100);        // 185 %
  const extCoverage = Math.round((extCovered / extDemand) * 100);    // 55 %
  const requiredStaff = Math.ceil(demandWeek / HOURS_PER_STAFF);     // 4
  return {
    demandWeek, capacityWeek, load, extCoverage, requiredStaff, extDemand, extCovered,
    gap: requiredStaff - STAFF,                                      // +2
    deficitHours: demandWeek - capacityWeek,                         // 68
    extCount: ext.length, intCount: int.length,
    uncovered: TASKS.filter((t) => t.covered === 0).length,
    critUncovered: TASKS.filter((t) => t.group === "crit" && t.covered / t.hours < 0.5).length,
  };
})();

/* Периоды: день = неделя / 5 рабочих дней, месяц = неделя × 4.2 (21 раб. день) */
const PERIODS = {
  day: {
    id: "day", label: "День", k: 1 / 5,
    categories: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
    demand:   [2.8, 4.1, 4.6, 3.2, 2.4, 4.4, 4.7, 3.4],
    capacity: [2, 2, 2, 2, 2, 2, 2, 2],
    unit: "нормо-часов",
  },
  week: {
    id: "week", label: "Неделя", k: 1,
    categories: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    demand:   [28, 30, 26, 29, 27, 5, 3],
    capacity: [16, 16, 16, 16, 16, 0, 0],
    unit: "нормо-часов",
  },
  month: {
    id: "month", label: "Месяц", k: 4.2,
    categories: ["Неделя 1", "Неделя 2", "Неделя 3", "Неделя 4", "Неделя 5"],
    demand:   [150, 158, 142, 155, 17],
    capacity: [80, 80, 80, 80, 16],
    unit: "нормо-часов",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   3. ХЕЛПЕРЫ
   ═══════════════════════════════════════════════════════════════════════════ */

const EASE = [0.22, 1, 0.36, 1];

function useCountUp(value, duration = 850) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(a + (value - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

const fmt = (n, d = 0) =>
  n.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });

/* ═══════════════════════════════════════════════════════════════════════════
   4. ФОН  —  «живая» премиальная подложка (аврора + сетка + сканирующий луч)
   ═══════════════════════════════════════════════════════════════════════════ */

function AuroraBackground({ T }) {
  const blobs = [
    { i: 0, size: 620, top: "-12%", left: "-8%",  dur: 26, dx: 90,  dy: 60 },
    { i: 1, size: 700, top: "18%",  left: "62%",  dur: 32, dx: -110, dy: 80 },
    { i: 2, size: 520, top: "58%",  left: "6%",   dur: 29, dx: 130, dy: -70 },
    { i: 3, size: 460, top: "72%",  left: "68%",  dur: 35, dx: -80, dy: -90 },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ background: T.bg }}>
      <div className="absolute inset-0" style={{ background: T.vignette }} />
      {blobs.map((b) => (
        <motion.div
          key={b.i}
          className="absolute rounded-full"
          style={{
            width: b.size, height: b.size, top: b.top, left: b.left,
            background: T.blobs[b.i],
            filter: "blur(70px)",
            opacity: T.key === "dark" ? 0.75 : 0.9,
          }}
          animate={{ x: [0, b.dx, 0], y: [0, b.dy, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      {/* техническая сетка */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${T.grid} 1px, transparent 1px), linear-gradient(90deg, ${T.grid} 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(110% 80% at 50% 0%, #000 30%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(110% 80% at 50% 0%, #000 30%, transparent 85%)",
        }}
      />
      {/* медленный сканирующий луч */}
      <motion.div
        className="absolute inset-x-0 h-[38vh]"
        style={{
          background: `linear-gradient(180deg, transparent, ${T.glowA}, transparent)`,
          filter: "blur(30px)", opacity: 0.5,
        }}
        animate={{ y: ["-40vh", "120vh"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. БАЗОВЫЕ UI-ПРИМИТИВЫ
   ═══════════════════════════════════════════════════════════════════════════ */

function Glass({ T, children, className = "", style = {}, hover = false, ...rest }) {
  return (
    <motion.div
      className={`relative rounded-2xl backdrop-blur-xl ${className}`}
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        boxShadow: T.shadow,
        ...style,
      }}
      whileHover={hover ? { y: -4, boxShadow: `0 26px 50px -22px ${T.glowA}` } : undefined}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

function PulseDot({ color, size = 9 }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ background: color }}
        animate={{ scale: [1, 2.6, 1], opacity: [0.55, 0, 0.55] }}
        transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut" }}
      />
      <span
        className="relative rounded-full"
        style={{ width: size, height: size, background: color, boxShadow: `0 0 12px ${color}` }}
      />
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. ХЕДЕР
   ═══════════════════════════════════════════════════════════════════════════ */

function Header({ T, period, setPeriod, theme, setTheme, onOpenCase }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex items-start gap-4">
        <motion.div
          whileHover={{ rotate: -6, scale: 1.06 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${T.blue}, ${T.violet})`,
            boxShadow: `0 12px 30px -8px ${T.glowA}`,
          }}
        >
          <ShieldAlert size={22} color="#fff" />
        </motion.div>
        <div>
          <div
            className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.22em]"
            style={{ color: T.faint }}
          >
            Отдел биобезопасности · Executive dashboard
          </div>
          <h1
            className="text-[22px] font-semibold leading-tight tracking-tight sm:text-[27px]"
            style={{ color: T.text }}
          >
            Мониторинг биобезопасности и нагрузка персонала
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-2.5 rounded-full px-3 py-1.5"
              style={{
                background: T.key === "dark" ? "rgba(255,77,94,0.10)" : "rgba(224,56,76,0.09)",
                border: `1px solid ${T.red}55`,
              }}
            >
              <PulseDot color={T.red} />
              <span className="text-[12px] font-semibold" style={{ color: T.red }}>
                Критическая перегрузка
              </span>
              <span className="font-mono text-[10px] tracking-wider" style={{ color: T.red, opacity: 0.7 }}>
                CRITICAL RISK
              </span>
            </div>
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[10.5px]"
              style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}
            >
              <Clock size={12} /> обновлено сейчас
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* переключатель периода */}
        <div
          className="flex rounded-xl p-1 backdrop-blur-xl"
          style={{ background: T.panel, border: `1px solid ${T.border}` }}
        >
          {Object.values(PERIODS).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="relative rounded-lg px-3.5 py-1.5 text-[12.5px] font-medium transition-colors"
              style={{ color: period === p.id ? "#fff" : T.muted }}
            >
              {period === p.id && (
                <motion.span
                  layoutId="period-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${T.blue}, ${T.violet})`,
                    boxShadow: `0 8px 22px -8px ${T.glowA}`,
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">{p.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="grid h-[38px] w-[38px] place-items-center rounded-xl backdrop-blur-xl transition-colors"
          style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}
          title="Сменить тему"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </motion.span>
          </AnimatePresence>
        </button>

        <motion.button
          onClick={onOpenCase}
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white"
          style={{
            background: `linear-gradient(135deg, ${T.red}, ${T.violet})`,
            boxShadow: `0 16px 36px -14px ${T.glowC}`,
          }}
        >
          <TrendingUp size={15} />
          Аргументация для руководства
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. KPI-КАРТОЧКИ
   ═══════════════════════════════════════════════════════════════════════════ */

function StatCard({ T, item, index }) {
  const Icon = item.icon;
  const v = useCountUp(item.value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.08 * index, duration: 0.6, ease: EASE }}
      whileHover={{ y: -6 }}
      className="relative flex-1 overflow-hidden rounded-2xl p-5 backdrop-blur-xl"
      style={{
        minWidth: 200,
        background: T.panel,
        border: `1px solid ${T.border}`,
        boxShadow: T.shadow,
      }}
    >
      <motion.div
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full"
        style={{ background: item.color, filter: "blur(46px)", opacity: 0.22 }}
        animate={{ scale: [1, 1.18, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
      />
      <div className="relative flex items-center gap-2.5">
        <div
          className="grid h-8 w-8 place-items-center rounded-lg"
          style={{ background: `${item.color}1f`, color: item.color }}
        >
          <Icon size={15} />
        </div>
        <span className="text-[12px]" style={{ color: T.muted }}>{item.label}</span>
      </div>
      <div className="relative mt-3 flex items-baseline gap-1.5">
        <span
          className="text-[34px] font-semibold leading-none tracking-tight"
          style={{ color: item.color, textShadow: T.key === "dark" ? `0 0 26px ${item.color}55` : "none" }}
        >
          {item.prefix || ""}{fmt(v, item.decimals || 0)}
        </span>
        <span className="text-[13px] font-medium" style={{ color: T.faint }}>{item.suffix}</span>
      </div>
      <div className="relative mt-2 text-[11.5px] leading-snug" style={{ color: T.faint }}>
        {item.note}
      </div>
      {item.progress != null && (
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: T.grid }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: item.color, boxShadow: `0 0 14px ${item.color}` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, item.progress)}%` }}
            transition={{ delay: 0.3 + index * 0.08, duration: 1, ease: EASE }}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. ЯДРО: ИНТЕРАКТИВНАЯ СХЕМА КОНТУРОВ
   Внешний контур — весь объём задач; внутренний — реальный ресурс (2 чел.).
   Задачи непрерывно «слетаются» с внешнего контура и садятся на двух людей.
   ═══════════════════════════════════════════════════════════════════════════ */

const VB = { w: 760, h: 540 };
const CC = { x: 380, y: 252 };
const R_RING = 208;   // декоративное стеклянное кольцо
const R_NODE = 170;   // радиус расстановки задач
const R_CORE = 108;   // внутренний контур

const nodePos = (i, n, r = R_NODE) => {
  const a = (i / n) * 2 * Math.PI - Math.PI / 2;
  return { x: CC.x + r * Math.cos(a), y: CC.y + r * Math.sin(a) };
};

function Person({ T, x, y, active, tilt, stack, delay = 0 }) {
  const shirt = active ? T.red : T.blue;
  return (
    <motion.g
      animate={{ y: [0, -3, 0], rotate: active ? tilt : 0 }}
      transition={{
        y: { duration: 3.4, repeat: Infinity, ease: "easeInOut", delay },
        rotate: { type: "spring", stiffness: 200, damping: 14 },
      }}
      style={{ originX: `${x}px`, originY: `${y + 30}px` }}
    >
      {/* стопка задач на плечах */}
      {Array.from({ length: stack }).map((_, i) => (
        <motion.rect
          key={i}
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, type: "spring", stiffness: 260, damping: 18 }}
          x={x - 20 + (i % 2 ? 3 : -3)}
          y={y - 54 - i * 8}
          width={40}
          height={7}
          rx={3}
          fill={i > 3 ? T.red : T.amber}
          opacity={0.9}
        />
      ))}
      {/* тень */}
      <ellipse cx={x} cy={y + 44} rx={24} ry={5} fill="#000" opacity={T.key === "dark" ? 0.35 : 0.12} />
      {/* тело */}
      <path
        d={`M ${x - 19} ${y + 42} L ${x - 17} ${y + 2} Q ${x} ${y - 12} ${x + 17} ${y + 2} L ${x + 19} ${y + 42} Z`}
        fill={shirt}
        opacity={0.95}
      />
      {/* голова */}
      <circle cx={x} cy={y - 24} r={14} fill={T.key === "dark" ? "#e6c9a8" : "#e9c39c"} />
      <path d={`M ${x - 14} ${y - 28} Q ${x} ${y - 46} ${x + 14} ${y - 28} Q ${x + 8} ${y - 38} ${x} ${y - 38} Q ${x - 8} ${y - 38} ${x - 14} ${y - 28} Z`} fill={T.key === "dark" ? "#2b2a3a" : "#3a3346"} />
      {/* аварийный ореол при перегрузке */}
      {active && (
        <motion.circle
          cx={x} cy={y - 4} r={38} fill="none" stroke={T.red} strokeWidth={1.4}
          initial={{ scale: 0.85, opacity: 0.6 }}
          animate={{ scale: [0.85, 1.25], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay }}
          style={{ originX: `${x}px`, originY: `${y - 4}px` }}
        />
      )}
    </motion.g>
  );
}

function ContourStage({ T, open, setOpen }) {
  const extOpen = open === "external";
  const intOpen = open === "internal";
  const n = TASKS.length;

  const toneOf = (t) =>
    t.group === "crit" ? T.red : t.group === "daily" ? T.cyan : T.blue;

  const targets = [
    { x: CC.x - 46, y: CC.y + 8 },
    { x: CC.x + 46, y: CC.y + 8 },
  ];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        className="mx-auto block w-full"
        style={{ maxWidth: 860, maxHeight: 580 }}
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={intOpen ? T.red : T.blue} stopOpacity={T.key === "dark" ? 0.32 : 0.18} />
            <stop offset="100%" stopColor={intOpen ? T.red : T.blue} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={T.blue} />
            <stop offset="50%" stopColor={T.violet} />
            <stop offset="100%" stopColor={T.cyan} />
          </linearGradient>
          <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* ── ВНЕШНИЙ КОНТУР ───────────────────────────────────────────── */}
        <motion.circle
          cx={CC.x} cy={CC.y} r={R_RING}
          fill="none" stroke="url(#ringGrad)"
          strokeWidth={extOpen ? 2.4 : 1.2}
          strokeDasharray="4 10"
          opacity={extOpen ? 1 : 0.55}
          animate={{ rotate: 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
        />
        <motion.circle
          cx={CC.x} cy={CC.y} r={R_RING - 16}
          fill="none" stroke="url(#ringGrad)" strokeWidth={extOpen ? 3 : 1.5}
          opacity={extOpen ? 0.9 : 0.28}
          filter={extOpen ? "url(#soft)" : undefined}
          animate={{ scale: extOpen ? [1, 1.015, 1] : 1 }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
        />
        {/* кликабельная зона внешнего контура */}
        <circle
          cx={CC.x} cy={CC.y} r={(R_RING + R_CORE) / 2}
          fill="none" stroke="transparent" strokeWidth={R_RING - R_CORE}
          pointerEvents="stroke" style={{ cursor: "pointer" }}
          onClick={() => setOpen(extOpen ? null : "external")}
        />

        {/* линии связи задача → ресурс */}
        {TASKS.map((t, i) => {
          const p = nodePos(i, n);
          const tg = targets[i % 2];
          return (
            <motion.line
              key={`l-${t.id}`}
              x1={p.x} y1={p.y} x2={tg.x} y2={tg.y}
              stroke={toneOf(t)}
              strokeWidth={0.8}
              strokeDasharray="3 7"
              opacity={intOpen ? 0.4 : extOpen ? 0.24 : 0.12}
              animate={{ strokeDashoffset: [0, -40] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            />
          );
        })}

        {/* узлы-задачи */}
        {TASKS.map((t, i) => {
          const p = nodePos(i, n);
          const c = toneOf(t);
          const dim = intOpen ? 0.45 : 1;
          return (
            <motion.g
              key={t.id}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: dim, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.035, type: "spring", stiffness: 220, damping: 18 }}
              style={{ cursor: "pointer" }}
              onClick={() => setOpen(extOpen ? null : "external")}
            >
              <motion.circle
                cx={p.x} cy={p.y} r={extOpen ? 9 : 6.5}
                fill={c}
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.11 }}
                style={{ filter: T.key === "dark" ? `drop-shadow(0 0 7px ${c})` : "none" }}
              />
              <circle cx={p.x} cy={p.y} r={13} fill="none" stroke={c} strokeWidth={0.8} opacity={0.35} />
            </motion.g>
          );
        })}

        {/* летящие задачи: садятся на двух сотрудников */}
        {TASKS.map((t, i) => {
          const p = nodePos(i, n);
          const tg = targets[i % 2];
          const c = toneOf(t);
          const speed = intOpen ? 1.5 : 2.3;
          return (
            <motion.g
              key={`f-${t.id}`}
              initial={{ x: p.x, y: p.y, opacity: 0 }}
              animate={{
                x: [p.x, (p.x + tg.x) / 2 + (i % 2 ? 18 : -18), tg.x],
                y: [p.y, (p.y + tg.y) / 2 - 22, tg.y - 46],
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1, 0.7],
              }}
              transition={{
                duration: speed,
                repeat: Infinity,
                repeatDelay: intOpen ? 0.9 : 2.0,
                delay: i * (intOpen ? 0.13 : 0.22),
                ease: "easeInOut",
                times: [0, 0.5, 1],
                opacity: { duration: speed, repeat: Infinity, repeatDelay: intOpen ? 0.9 : 2.0, delay: i * (intOpen ? 0.13 : 0.22), times: [0, 0.15, 0.8, 1] },
              }}
            >
              <rect x={-9} y={-4} width={18} height={8} rx={3} fill={c} opacity={0.95}
                    style={{ filter: T.key === "dark" ? `drop-shadow(0 0 6px ${c})` : "none" }} />
            </motion.g>
          );
        })}

        {/* ── ВНУТРЕННИЙ КОНТУР ────────────────────────────────────────── */}
        <circle cx={CC.x} cy={CC.y} r={R_CORE + 46} fill="url(#coreGlow)" pointerEvents="none" />
        <motion.circle
          cx={CC.x} cy={CC.y} r={R_CORE}
          fill={T.key === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.68)"}
          stroke={intOpen ? T.red : T.borderHi}
          strokeWidth={intOpen ? 2.4 : 1.2}
          animate={intOpen ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={{ duration: 2.2, repeat: intOpen ? Infinity : 0, ease: "easeInOut" }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y}px`, cursor: "pointer" }}
          onClick={() => setOpen(intOpen ? null : "internal")}
        />
        {intOpen && (
          <motion.circle
            cx={CC.x} cy={CC.y} r={R_CORE}
            fill="none" stroke={T.red} strokeWidth={1.6}
            initial={{ scale: 1, opacity: 0.55 }}
            animate={{ scale: [1, 1.24], opacity: [0.55, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
            pointerEvents="none"
          />
        )}

        {/* два сотрудника */}
        <g pointerEvents="none">
          <Person T={T} x={CC.x - 46} y={CC.y + 8} active={intOpen} tilt={4} stack={intOpen ? 6 : 3} delay={0} />
          <Person T={T} x={CC.x + 46} y={CC.y + 8} active={intOpen} tilt={-4} stack={intOpen ? 6 : 3} delay={0.5} />
        </g>

        {/* шкала загрузки внутри контура */}
        <g pointerEvents="none">
          <rect x={CC.x - 74} y={CC.y + 64} width={148} height={8} rx={4} fill={T.grid} />
          <motion.rect
            x={CC.x - 74} y={CC.y + 64} height={8} rx={4}
            fill={T.teal}
            initial={{ width: 0 }} animate={{ width: 80 }}
            transition={{ delay: 0.6, duration: 1, ease: EASE }}
          />
          <motion.rect
            x={CC.x + 6} y={CC.y + 64} height={8} rx={4}
            fill={T.red}
            initial={{ width: 0 }} animate={{ width: 68, opacity: [1, 0.55, 1] }}
            transition={{
              width: { delay: 1.2, duration: 1, ease: EASE },
              opacity: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
            }}
            style={{ filter: T.key === "dark" ? `drop-shadow(0 0 8px ${T.red})` : "none" }}
          />
          <text x={CC.x} y={CC.y + 90} textAnchor="middle" fontSize="11" fontWeight="600" fill={T.red}>
            загрузка {METRICS.load}%
          </text>
        </g>

        {/* подписи */}
        <text x={CC.x} y={26} textAnchor="middle" fontSize="12" fontWeight="700"
              letterSpacing="2.4" fill={extOpen ? T.violet : T.faint}>
          ВНЕШНИЙ КОНТУР · {TASKS.length} НАПРАВЛЕНИЙ
        </text>
        <text x={CC.x} y={44} textAnchor="middle" fontSize="10.5" fill={T.faint}>
          {METRICS.demandWeek} нормо-часов в неделю · нажмите, чтобы раскрыть
        </text>
        <text x={CC.x} y={CC.y - R_CORE - 14} textAnchor="middle" fontSize="10"
              fontWeight="700" letterSpacing="1.4" fill={intOpen ? T.red : T.faint}>
          РЕСУРС · {STAFF} ЧЕЛ.
        </text>
        <text x={CC.x} y={VB.h - 34} textAnchor="middle" fontSize="11" fill={T.faint}>
          дефицит {METRICS.deficitHours} нормо-часов в неделю — задачи не исчезают, они копятся
        </text>
      </svg>

      {/* виджет перегрузки рядом с сотрудниками */}
      <AnimatePresence>
        {intOpen && (
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="absolute right-2 top-8 w-[248px] rounded-2xl p-4 backdrop-blur-2xl sm:right-6"
            style={{
              background: T.solid,
              border: `1px solid ${T.red}66`,
              boxShadow: `0 24px 50px -20px ${T.glowC}`,
            }}
          >
            <div className="flex items-center gap-2">
              <Gauge size={15} color={T.red} />
              <span className="text-[12px] font-semibold" style={{ color: T.red }}>
                Виджет перегрузки
              </span>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[30px] font-semibold leading-none" style={{ color: T.red }}>
                {METRICS.load}%
              </span>
              <span className="pb-1 text-[11px]" style={{ color: T.muted }}>загрузка</span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: T.grid }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${T.teal}, ${T.red})` }}
                initial={{ width: 0 }} animate={{ width: "100%" }}
                transition={{ duration: 0.9, ease: EASE }}
              />
            </div>
            <div className="mt-3 flex items-start gap-2 text-[11.5px] leading-snug" style={{ color: T.muted }}>
              <AlertTriangle size={13} color={T.amber} className="mt-0.5 shrink-0" />
              Риск пропуска критических задач: {METRICS.critUncovered} из{" "}
              {TASKS.filter((t) => t.group === "crit").length} критических направлений закрыты менее чем наполовину.
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { l: "ресурс", v: `${METRICS.capacityWeek} ч`, c: T.teal },
                { l: "требуется", v: `${METRICS.demandWeek} ч`, c: T.red },
              ].map((x) => (
                <div key={x.l} className="rounded-lg px-2.5 py-1.5"
                     style={{ background: T.panel, border: `1px solid ${T.border}` }}>
                  <div className="font-mono text-[9.5px] uppercase tracking-wider" style={{ color: T.faint }}>{x.l}</div>
                  <div className="text-[14px] font-semibold" style={{ color: x.c }}>{x.v}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* подсказка */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-x-0 bottom-1 text-center font-mono text-[10.5px] tracking-[0.16em]"
            style={{ color: T.faint }}
          >
            НАЖМИТЕ НА КОНТУР, ЧТОБЫ РАЗВЕРНУТЬ
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. КАСКАДНЫЙ СПИСОК ВНЕШНЕГО КОНТУРА
   ═══════════════════════════════════════════════════════════════════════════ */

function CascadeList({ T }) {
  const toneMap = { blue: T.blue, cyan: T.cyan, red: T.red };
  let idx = 0;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="overflow-hidden"
    >
      <div className="space-y-5 pt-5">
        {Object.values(GROUPS).map((g) => {
          const items = TASKS.filter((t) => t.group === g.id);
          const GIcon = g.icon;
          const tone = toneMap[g.tone];
          const gh = sum(items, (t) => t.hours);
          const gc = sum(items, (t) => t.covered);
          return (
            <div key={g.id}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-lg"
                     style={{ background: `${tone}1f`, color: tone }}>
                  <GIcon size={14} />
                </div>
                <span className="text-[13.5px] font-semibold" style={{ color: T.text }}>{g.title}</span>
                <span className="font-mono text-[10.5px]" style={{ color: T.faint }}>
                  {items.length} · {gh} ч/нед · закрыто {Math.round((gc / gh) * 100)}%
                </span>
                <div className="h-px flex-1" style={{ background: T.border }} />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((t) => {
                  const Icon = t.icon;
                  const pct = Math.round((t.covered / t.hours) * 100);
                  const state = pct >= 80 ? T.teal : pct >= 40 ? T.amber : T.red;
                  const delay = 0.035 * idx++;
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay, duration: 0.42, ease: EASE }}
                      whileHover={{ y: -3, boxShadow: `0 18px 34px -20px ${tone}` }}
                      className="rounded-xl p-3.5 backdrop-blur-xl"
                      style={{ background: T.panel, border: `1px solid ${T.border}` }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                             style={{ background: `${tone}1a`, color: tone }}>
                          <Icon size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12.5px] font-semibold leading-tight" style={{ color: T.text }}>
                            {t.name}
                          </div>
                          <div className="mt-0.5 text-[11px] leading-snug" style={{ color: T.faint }}>
                            {t.note}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: T.grid }}>
                          <motion.div
                            className="h-full rounded-full" style={{ background: state }}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ delay: delay + 0.15, duration: 0.7, ease: EASE }}
                          />
                        </div>
                        <span className="font-mono text-[10px]" style={{ color: state }}>{pct}%</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="rounded-md px-1.5 py-0.5 font-mono text-[9.5px]"
                              style={{ background: T.panelHi, color: T.faint }}>
                          {t.freq}
                        </span>
                        <span className="rounded-md px-1.5 py-0.5 font-mono text-[9.5px]"
                              style={{ background: T.panelHi, color: T.faint }}>
                          {t.hours} ч/нед
                        </span>
                        <span className="rounded-md px-1.5 py-0.5 font-mono text-[9.5px]"
                              style={{ background: `${tone}18`, color: tone }}>
                          {t.contour === "external" ? "внешний" : "внутренний"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   9b. СПИСОК ВНУТРЕННЕГО КОНТУРА — что фактически садится на двух сотрудников
   ═══════════════════════════════════════════════════════════════════════════ */

function ResourceList({ T }) {
  const ranked = [...TASKS].sort((a, b) => a.covered / a.hours - b.covered / b.hours);
  const columns = [
    {
      key: "fail",
      title: "Проваливается или ведётся формально",
      icon: AlertTriangle,
      color: T.red,
      items: ranked.filter((t) => t.covered / t.hours < 0.5),
    },
    {
      key: "ok",
      title: "Реально закрывают 2 сотрудника",
      icon: Check,
      color: T.teal,
      items: ranked.filter((t) => t.covered / t.hours >= 0.5),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="overflow-hidden"
    >
      <div className="grid gap-3 pt-5 sm:grid-cols-3">
        {[
          { t: "Что происходит", d: `Весь объём в ${METRICS.demandWeek} нормо-часов садится на двух человек — это ${METRICS.load}% загрузки.`, c: T.red, i: Users },
          { t: "Чем это оборачивается", d: `${METRICS.uncovered} направления не выполняются вовсе, ещё часть — формально и с задержкой.`, c: T.amber, i: AlertTriangle },
          { t: "Что закрывает вопрос", d: `+${METRICS.gap} штатные единицы: загрузка возвращается в норму, внешний контур закрывается полностью.`, c: T.teal, i: UserPlus },
        ].map((x, i) => {
          const Icon = x.i;
          return (
            <motion.div
              key={x.t}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i, duration: 0.45, ease: EASE }}
              className="rounded-2xl p-4"
              style={{ background: T.panel, border: `1px solid ${T.border}` }}
            >
              <div className="flex items-center gap-2">
                <Icon size={15} color={x.c} />
                <span className="text-[12.5px] font-semibold" style={{ color: T.text }}>{x.t}</span>
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: T.muted }}>{x.d}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {columns.map((col, ci) => {
          const CIcon = col.icon;
          const colHours = sum(col.items, (t) => t.hours);
          const colDone = sum(col.items, (t) => t.covered);
          return (
            <div key={col.key}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-lg"
                     style={{ background: `${col.color}1f`, color: col.color }}>
                  <CIcon size={14} />
                </div>
                <span className="text-[13px] font-semibold" style={{ color: T.text }}>{col.title}</span>
                <span className="font-mono text-[10.5px]" style={{ color: T.faint }}>
                  {col.items.length} направлений · закрыто {colDone} из {colHours} ч/нед
                </span>
                <div className="h-px flex-1" style={{ background: T.border }} />
              </div>
              <div className="space-y-2">
                {col.items.map((t, i) => {
                  const Icon = t.icon;
                  const pct = Math.round((t.covered / t.hours) * 100);
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: ci === 0 ? -16 : 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.18 + i * 0.045, duration: 0.4, ease: EASE }}
                      whileHover={{ x: ci === 0 ? 3 : -3 }}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                      style={{ background: T.panel, border: `1px solid ${T.border}` }}
                    >
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                           style={{ background: `${col.color}1a`, color: col.color }}>
                        <Icon size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-medium" style={{ color: T.text }}>
                          {t.name}
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full" style={{ background: T.grid }}>
                          <motion.div
                            className="h-full rounded-full" style={{ background: col.color }}
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.25 + i * 0.045, duration: 0.6, ease: EASE }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-[11px] font-semibold" style={{ color: col.color }}>
                          {pct}%
                        </div>
                        <div className="font-mono text-[9.5px]" style={{ color: T.faint }}>
                          {t.hours} ч
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. АНАЛИТИКА HIGHCHARTS
   ═══════════════════════════════════════════════════════════════════════════ */

function ChartPanel({ T, period, open }) {
  const P = PERIODS[period];

  const options = useMemo(() => {
    const hex = (c, a) => {
      const h = c.replace("#", "");
      const r = parseInt(h.substring(0, 2), 16);
      const g = parseInt(h.substring(2, 4), 16);
      const b = parseInt(h.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${a})`;
    };
    const grad = (c, top = 0.55) => ({
      linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
      stops: [[0, hex(c, top)], [1, hex(c, 0)]],
    });

    const extOpen = open === "external";
    const intOpen = open === "internal";

    const extShare = METRICS.extDemand ? METRICS.extDemand / METRICS.demandWeek : 0.615;

    const series = [
      {
        type: "areaspline",
        name: "Общий входящий объём задач",
        data: P.demand,
        color: T.violet,
        lineWidth: extOpen ? 3.4 : 2.6,
        fillColor: grad(T.violet, extOpen ? 0.24 : 0.34),
        zIndex: 3,
        marker: { symbol: "circle", radius: 3 },
        shadow: T.key === "dark" ? { color: T.violet, width: 12, opacity: 0.35 } : false,
      },
    ];

    if (extOpen) {
      // разбивка общего объёма по трём группам внешнего контура
      const groupTone = { reg: T.blue, daily: T.cyan, crit: T.red };
      Object.values(GROUPS).forEach((g) => {
        const share = sum(TASKS.filter((t) => t.group === g.id), (t) => t.hours) / METRICS.demandWeek;
        series.push({
          type: "column",
          name: g.title,
          data: P.demand.map((v) => +(v * share).toFixed(1)),
          color: grad(groupTone[g.id], 0.9),
          stacking: "normal",
          stack: "groups",
          borderWidth: 0,
          borderRadius: 3,
          pointPadding: 0.16,
          groupPadding: 0.12,
          zIndex: 1,
        });
      });
    }

    series.push({
        type: "areaspline",
        name: `Максимальная ёмкость ${STAFF} сотрудников`,
        data: P.capacity,
        color: T.teal,
        lineWidth: intOpen ? 4 : 2.6,
        dashStyle: "ShortDash",
        fillColor: grad(T.teal, intOpen ? 0.4 : 0.18),
        zIndex: 4,
      marker: { symbol: "circle", radius: intOpen ? 4.5 : 3 },
    });

    if (intOpen) {
      series.push({
        type: "column",
        name: "Перегрузка сверх ёмкости",
        data: P.demand.map((v, i) => +Math.max(0, v - P.capacity[i]).toFixed(1)),
        color: grad(T.red, 0.85),
        borderWidth: 0,
        borderRadius: 4,
        pointPadding: 0.22,
        zIndex: 1,
      });
    }

    return {
      chart: {
        backgroundColor: "transparent",
        height: 340,
        style: { fontFamily: "inherit" },
        spacing: [10, 4, 6, 0],
        animation: { duration: 700 },
      },
      credits: { enabled: false },
      title: { text: null },
      xAxis: {
        categories: P.categories,
        lineColor: T.border,
        tickColor: "transparent",
        labels: { style: { color: T.faint, fontSize: "11px" } },
        crosshair: { color: T.border, width: 1, dashStyle: "Dash" },
      },
      yAxis: {
        title: { text: P.unit, style: { color: T.faint, fontSize: "10px" } },
        gridLineColor: T.grid,
        labels: { style: { color: T.faint, fontSize: "11px" } },
      },
      legend: {
        itemStyle: { color: T.muted, fontWeight: "500", fontSize: "11.5px" },
        itemHoverStyle: { color: T.text },
        symbolRadius: 3,
        align: "left",
        margin: 18,
      },
      tooltip: {
        shared: true,
        backgroundColor: T.solid,
        borderColor: T.borderHi,
        borderRadius: 12,
        shadow: false,
        style: { color: T.text, fontSize: "12px" },
        valueSuffix: " ч",
      },
      plotOptions: {
        series: {
          animation: { duration: 800 },
          states: { hover: { lineWidthPlus: 1 }, inactive: { opacity: 0.35 } },
        },
        areaspline: { threshold: null },
      },
      series,
    };
  }, [T, P, open]);

  return (
    <HighchartsReact
      highcharts={Highcharts}
      options={options}
      updateArgs={[true, true, true]}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. МОДАЛЬНОЕ ОКНО «АРГУМЕНТАЦИЯ ДЛЯ РУКОВОДСТВА»
   ═══════════════════════════════════════════════════════════════════════════ */

function CaseModal({ T, onClose }) {
  const args = [
    {
      icon: Layers,
      color: T.violet,
      title: "Объём не соответствует ресурсу",
      text: `${TASKS.length} направлений требуют ${METRICS.demandWeek} нормо-часов в неделю. Физическая ёмкость ${STAFF} специалистов — ${METRICS.capacityWeek} часов. Дефицит ${METRICS.deficitHours} часов еженедельно.`,
    },
    {
      icon: ShieldAlert,
      color: T.red,
      title: "Внешний контур закрыт на 55%",
      text: `Текущие ${STAFF} сотрудника покрывают только ${METRICS.extCoverage}% обязательного внешнего контура — границы, на которой риск должен останавливаться до входа на территорию.`,
    },
    {
      icon: AlertTriangle,
      color: T.amber,
      title: "Риск не отложенный, а накопительный",
      text: `${METRICS.uncovered} направлений не закрыты вовсе. Пропущенная проверка не исчезает — она превращается в вероятность заноса инфекции и остановки производства.`,
    },
    {
      icon: UserPlus,
      color: T.teal,
      title: `Требуется +${METRICS.gap} штатные единицы`,
      text: `Расширение штата до ${METRICS.requiredStaff} человек снижает загрузку до ~${Math.round((METRICS.demandWeek / (METRICS.requiredStaff * HOURS_PER_STAFF)) * 100)}% и исключает системные сбои — с запасом на отпуска и больничные.`,
    },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: "rgba(3,5,12,0.62)", backdropFilter: "blur(10px)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative max-h-[88vh] w-full max-w-[720px] overflow-y-auto rounded-3xl p-7 backdrop-blur-2xl"
        style={{ background: T.solid, border: `1px solid ${T.borderHi}`, boxShadow: T.shadow }}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-lg"
          style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}
        >
          <X size={15} />
        </button>

        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em]"
             style={{ color: T.faint }}>
          <PulseDot color={T.red} size={7} /> обоснование расширения штата
        </div>
        <h2 className="mt-2.5 text-[24px] font-semibold leading-tight" style={{ color: T.text }}>
          Аргументация для руководства
        </h2>

        <div
          className="mt-5 rounded-2xl p-5"
          style={{
            background: `linear-gradient(135deg, ${T.glowC}, ${T.glowB})`,
            border: `1px solid ${T.red}44`,
          }}
        >
          <p className="text-[15px] leading-relaxed" style={{ color: T.text }}>
            Текущие <b>{STAFF} сотрудника</b> покрывают только{" "}
            <b style={{ color: T.red }}>{METRICS.extCoverage}%</b> обязательного внешнего контура.
            Требуется расширение штата минимум на{" "}
            <b style={{ color: T.teal }}>{METRICS.gap} единицы</b> для исключения сбоев.
          </p>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between font-mono text-[10.5px]" style={{ color: T.muted }}>
              <span>покрытие внешнего контура</span>
              <span>{METRICS.extCoverage}% из 100%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full" style={{ background: T.grid }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${T.amber}, ${T.red})` }}
                initial={{ width: 0 }} animate={{ width: `${METRICS.extCoverage}%` }}
                transition={{ delay: 0.25, duration: 1, ease: EASE }}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {args.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.09, duration: 0.45, ease: EASE }}
                className="flex gap-3.5 rounded-2xl p-4"
                style={{ background: T.panel, border: `1px solid ${T.border}` }}
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                     style={{ background: `${a.color}1f`, color: a.color }}>
                  <Icon size={17} />
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold" style={{ color: T.text }}>
                    {String(i + 1).padStart(2, "0")} · {a.title}
                  </div>
                  <div className="mt-1 text-[12.5px] leading-relaxed" style={{ color: T.muted }}>
                    {a.text}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <motion.button
            whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold text-white"
            style={{
              background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`,
              boxShadow: `0 18px 36px -16px ${T.glowA}`,
            }}
          >
            <Check size={15} /> Согласовать +{METRICS.gap} ставки
          </motion.button>
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-3 text-[13px] font-medium"
            style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}
          >
            Вернуться к дашборду
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   12. ГЛАВНЫЙ КОМПОНЕНТ
   ═══════════════════════════════════════════════════════════════════════════ */

export default function BiosecurityExecutiveDashboard() {
  const [theme, setTheme] = useState("dark");
  const [period, setPeriod] = useState("week");
  const [open, setOpen] = useState(null);        // null | 'external' | 'internal'
  const [showCase, setShowCase] = useState(false);
  const T = THEMES[theme];

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && (setShowCase(false), setOpen(null));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const P = PERIODS[period];
  const demand = Math.round(METRICS.demandWeek * P.k);
  const capacity = Math.round(METRICS.capacityWeek * P.k);

  const stats = [
    { label: "Загрузка сотрудников", value: METRICS.load, suffix: "%", color: T.red, progress: 100, icon: Gauge,
      note: `при норме 100% — переработка ${METRICS.load - 100} п.п.` },
    { label: "Покрытие внешнего контура", value: METRICS.extCoverage, suffix: "%", color: T.amber, progress: METRICS.extCoverage, icon: ShieldCheck,
      note: `${METRICS.extCount} направлений на границе территории` },
    { label: `Объём задач · ${P.label.toLowerCase()}`, value: demand, suffix: "ч", color: T.violet, progress: 100, icon: Activity,
      note: `ёмкость ${STAFF} сотрудников — ${capacity} ч` },
    { label: "Дефицит штата", value: METRICS.gap, prefix: "+", suffix: "ед.", color: T.teal, progress: (METRICS.gap / METRICS.requiredStaff) * 100, icon: UserPlus,
      note: `требуется ${METRICS.requiredStaff} специалиста вместо ${STAFF}` },
  ];

  return (
    <div className="relative min-h-screen w-full" style={{ color: T.text }}>
      <AuroraBackground T={T} />

      <div className="relative mx-auto max-w-[1280px] px-4 py-8 sm:px-7 sm:py-10">
        <Header
          T={T} period={period} setPeriod={setPeriod}
          theme={theme} setTheme={setTheme}
          onOpenCase={() => setShowCase(true)}
        />

        {/* KPI */}
        <div className="mt-7 flex flex-wrap gap-4">
          {stats.map((s, i) => <StatCard key={s.label} T={T} item={s} index={i} />)}
        </div>

        {/* ЯДРО: СХЕМА КОНТУРОВ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
          className="mt-5 rounded-3xl p-5 backdrop-blur-xl sm:p-7"
          style={{ background: T.panel, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
        >
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.2em]" style={{ color: T.faint }}>
                Ядро модели
              </div>
              <h2 className="mt-1 text-[18px] font-semibold" style={{ color: T.text }}>
                Схема контуров: объём задач против фактического ресурса
              </h2>
            </div>
            <div className="flex gap-2">
              {[
                { id: "external", label: `Внешний контур · ${TASKS.length}`, c: T.violet, icon: Building2 },
                { id: "internal", label: `Ресурс · ${STAFF} чел.`, c: T.red, icon: Users },
              ].map((b) => {
                const Icon = b.icon;
                const active = open === b.id;
                return (
                  <motion.button
                    key={b.id}
                    onClick={() => setOpen(active ? null : b.id)}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                    className="relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-medium"
                    style={{
                      background: active ? `${b.c}1f` : T.panel,
                      border: `1px solid ${active ? b.c : T.border}`,
                      color: active ? b.c : T.muted,
                      boxShadow: active ? `0 14px 30px -18px ${b.c}` : "none",
                    }}
                  >
                    <Icon size={14} /> {b.label}
                    <ChevronDown
                      size={13}
                      style={{ transform: active ? "rotate(180deg)" : "none", transition: "transform .3s" }}
                    />
                  </motion.button>
                );
              })}
            </div>
          </div>

          <ContourStage T={T} open={open} setOpen={setOpen} />

          <AnimatePresence initial={false}>
            {open === "external" && <CascadeList key="cascade" T={T} />}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {open === "internal" && <ResourceList key="resource" T={T} />}
          </AnimatePresence>
        </motion.div>

        {/* АНАЛИТИКА */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7, ease: EASE }}
          className="mt-5 rounded-3xl p-5 backdrop-blur-xl sm:p-7"
          style={{ background: T.panel, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
        >
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.2em]" style={{ color: T.faint }}>
                Аналитика нагрузки
              </div>
              <h2 className="mt-1 text-[18px] font-semibold" style={{ color: T.text }}>
                Входящий объём против физической ёмкости · {P.label.toLowerCase()}
              </h2>
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11.5px]"
                 style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}>
              <ArrowRight size={13} color={T.violet} />
              {open === "external"
                ? "режим: внешний контур — показан обязательный минимум"
                : open === "internal"
                ? "режим: ресурс — показана перегрузка сверх ёмкости"
                : "нажмите на контур выше, чтобы график перестроился"}
            </div>
          </div>

          <ChartPanel T={T} period={period} open={open} />

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { l: "Пиковая перегрузка", v: `${Math.max(...P.demand.map((d, i) => (P.capacity[i] ? Math.round((d / P.capacity[i]) * 100) : 0)))}%`, c: T.red },
              { l: "Недоработано за период", v: `${Math.round((METRICS.demandWeek - METRICS.capacityWeek) * P.k)} ч`, c: T.amber },
              { l: "Загрузка после +2 ставок", v: `${Math.round((METRICS.demandWeek / (METRICS.requiredStaff * HOURS_PER_STAFF)) * 100)}%`, c: T.teal },
            ].map((x, i) => (
              <motion.div
                key={x.l}
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.07, duration: 0.5 }}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: T.panel, border: `1px solid ${T.border}` }}
              >
                <span className="text-[12px]" style={{ color: T.muted }}>{x.l}</span>
                <span className="text-[17px] font-semibold" style={{ color: x.c }}>{x.v}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[11px]"
             style={{ color: T.faint }}>
          <span>
            Расчёт по {TASKS.length} направлениям · норма {HOURS_PER_STAFF} ч/нед на специалиста ·
            все показатели вычисляются из единой таблицы задач
          </span>
          <span className="font-mono">Отдел биобезопасности · v5.2</span>
        </div>
      </div>

      <AnimatePresence>
        {showCase && <CaseModal T={T} onClose={() => setShowCase(false)} />}
      </AnimatePresence>
    </div>
  );
}
