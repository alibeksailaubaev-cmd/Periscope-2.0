import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import {
  Phone, ClipboardCheck, DoorOpen, Truck, ShieldCheck, Package, Boxes, Home,
  Siren, Bug, FileText, GraduationCap, Megaphone, BadgeCheck, FlaskConical,
  Droplets, Warehouse, Layers, Car, Users, AlertTriangle, Gauge, ChevronDown,
  X, ArrowRight, TrendingUp, ShieldAlert, UserPlus, Radar, Sun, Moon,
  Building2, Clock, Check, Activity, Egg, Bird, Route, MapPin,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   0. ФОН, СГЕНЕРИРОВАННЫЙ HIGGSFIELD (nano_banana_pro), вшит как data-URI —
   страница остаётся полностью автономной, без внешних запросов.
   ═══════════════════════════════════════════════════════════════════════════ */
const HF_BG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABMNDhEODBMRDxEVFBMXHTAfHRoaHToqLCMwRT1JR0Q9Q0FMVm1dTFFoUkFDX4JgaHF1e3x7SlyGkIV3j214e3b/2wBDARQVFR0ZHTgfHzh2T0NPdnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnb/wgARCALKBQADASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAECBf/EABUBAQEAAAAAAAAAAAAAAAAAAAAB/9oADAMBAAIQAxAAAAHshAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABCpQlCCoAAAAAAAAAAAAAAAAAAAAAACwoBCwKlAAAEsFlAAAEsKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAABQAAAQgqKqCwLAAAsBYFgsBYKgogAAAAAAAUiiUIoSwWUAQKgsCpQAAAAAAAAAAAAAAAAAACUAAAEoAAAAAAAAAAAAAgAAUEAASwWKAAAAIKgqCoLAWCoKgoBCgAAWIoAAAAAALAWAAAUJSAAAWUAJQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABLAAAAABCgAABCoAAAACUEKlAAAAAFgoAAipQAAAAAAAAAAAAABYKgWCgAAAAAAAAAAAAAAAAAAAAAAAAAAJQAAAQoAEAAAFELCwAAgAAAIAAAAAAAFgqCoKgoAKlAhZQAAAAAAAAAAAAAAABYKAAAAAAAAAAAAAAAAAlAAAAAAAAAAAAAACUAQAAAVLLAAEsAACAAQqUIKiqgqCoKlAAgABZQBYKIAoQFAAAAAAAAAAAAAAAWUJQBKAEoSiUAJQASiUAJQASiUJQAAiiUJQAlCKJQAlCUIolCKIAACKIKAiwAAgABAKAAAAAAAFICyoAAoBQIAUQAAAAAAAFAAAAAALAsCiKAAAAAAAAAAAAAAAJQAAAAAAAAAAAAAAlACAAAIAoQAEAAEAKEKgqCoKgsCpQAAACoigqUBKIAoAAAAAAAAAUAAAAABYFAAAAAAAAAAAAAAAACUAAABCgAAAAlAAAACUEsAUESxQsAQBAAgCgCAAAAAAABYKlAAAigWUBKIAoAAAAAAAAAUAAAAAsACgAAAAAAAAABLCgAAAAllAAAAAAAAAAAAAAJZRLAAFSxApLAQsBLAKILAAQFgqACoLAqUAAqCgCKBZUAogCgAAAAAAAAAABQAAAALKAAAAAACUAAAAAAAAAAAAAAAAAAAJQAAAQWUQAAEKEBABChAAgsAAAAAAABZQAACpQIoRZQCiAKlAAAAAAAAAAAAUABYAAKCKIoiiKIoiiKIoiiKIUiiKJQiiKIoiiKIoiiKIoiiKIolCKIoiiFIACLKEBAQEoBAAAAASiKAAAABSKAACgWARQAKgAAoihKJQAAigAAAAFAAAAFIoAAAAAAAAAAAAAAAJQAABKAAAAAAAAAEsFlIAQEqyQsShCoAAAAAAAAAAAAFlAAAKIWUFQACiABQAAAAAAAAAAAFAAAFICgAAAAAAAAAEFAAAAAAAAAAAAAAAAAABLAAQsSrlmrELAAAAAAAAAAAAAAAWUAAFAihFABZYAAUAAAAAAAAAAAAAUAAUJQAAAAAAAAABKAAAAACUAAASgAAAAAAAAgAAhmrmKIqwgAAAAUgAAAAAAAALKJZQABQWWBUAAWWAAKAAAAAAAAAAAAAFAAWUlgoAAACCwFlAAAEsKlAAAAJZQAAAQWUAAAQFgqCwAEKMwQoKgAgAUigACUIoiwAAAALBQAAAAoihBQAWAABQAAAAAAAAAAAAAFAAAAoAAEohSAWCgEKgsBYKQqAABZQgqCoLAWCoKgAAACiAZLlKCiCxQISiWUAAAAAAASiKJQAAAAAAUhRAFAWAALAWUAAAAAAAAAAAABQAACwWUAAILAAAAAAAAAAAAAAAAAAAACiCoFgIEkqxLKgqVYolIAAAAAWUSwAAAAAAAALAsFAIWUBKAIoAAAFgoACCkKlAAAAAAAAUAAABYKgoBBYAAAAAAAAAAAAAoAAQqCoLAAILEqyAiwBKIolAJQAABSUAAAgAACKIsoUlAAAIAUBUACFAAUASwUAAABCgAAAAAAABQAAAAKACWUgAAAAAAoQqUIKgqAAAAAAgWAQqKIQSgAAAAAgAFAKAgAAUiwAAAAAAAAALBQKAQWJQAFAAEsKAAAAAAAAAAAAFAAAAAAoAEAAAAKAILAAAAEKgAAACiCwBCwQSgBCpQAAAIAAKUAIAKAAAAAIoiiAFIsCgABZQECFAABQAASwoAAAAAAAABCgABQAAAAAFABAAACiAAAAQWAAKAEKgsAAgBCKAAAiwWUAACABVAACCiUACiKIsAAAAAAAAACgJBSUAAFgoAAEsKAAAAAAAABAqCpQFAAAAAAoIsAAEqosAAAIogAAqKIABKIsQAKgAAIoiiKJQAACAFAJSiUCwKIolACKIoiiKIAAUhSKIoSgJCiUAAACiKIoiwFIoiiKIsAAAAAAAAUoSgAAAAoAgAAqAAAEAAoAQsAARAoAQAAAAAAAAAACKAWJRRQAAAAAAAAAAAQUAAAAkWUAAAKJZQAABLBQAEKgAAAAAEKFAAqCkKlAAAKACACksAAEsAApLAAAARAolEAAAAAAAAAAAWAAFIUAUAIFIolCKIKAAAAAAAAFkigAABQAAAAASwUBAAAQqUIKgqCwtWUACAApZYAAAqUAgAqAAEAApLAAAEQAoCFIAAAAAAAAAAWJQFgUlAqIpQEoAAAASwCgAAAAAgpAAAAAKAQqUAAASwAAELACgAAAUBYLAoAAFlgAABZQCACoACACkAAABBAoACKBAAAAAAAAAWJQFhQKiUAAAUAAAABLAKAAAACKEAAAAAqUASwqUEKQsAAgsAiqgsCoKhagqUAAAWUAAWCiAAFlEogEsoBLABKqLABKJZSLECgAJQiiLAAAAAAAqJQKhVIqIoAAAABQAAAIsAoAAAAWIpIoASgAAAoiwAAAEAEKAJQhbKAAAALLBZQAACgAFAgAUAgAqASwACksAAJQEQAKAAAASwAAAUAgUlWJVgAAAAAAAAFAAASiCrAAAAFgEAAAAFJZQBAAAIBKEKhQAALAWUAAAAWCgAAoAKlAgBZQCASygEsAoBLAAAAAEiiCgAAAIsFlAAhZQWFlgAAAsBSAAAAAABQEsAAoAAAIqEoAAAAAAACAiiFILCgFgqCgACKgqUAAAWUAWUAAAogBZQCASqgEsAApKIAAAAAACBAoAAAIAUCoUgBQSiKIBZRKEsAAAAAUCACgAAAAAFiSpQAAAgqAkqxFsKJQQAqUAAWCwKAABZYAAWUAAssKAUCAFAgAIoAQAACiCwAAAABBYAsAACFgoFlhZYAWCoKgqCoFgqAAAAlACCwUKJQAlCCoKgqCoLAqQ0yNMisipKqCwAAAAAKgoAAFgqUAAsCiFgqUAAqUAqCiFgsogAqAAAhSACgJQShLAACUAIpJQAAUhQFgAAAAAAABAAAAASiC0AAAgqCwAABCoLAIqxCoAAAAAAAFlAAAAFlAAKAIAWUAApCgAogCpRKIAKiwAASiLAAKAAgAAAAQFAAWWRZQIoAAAAAAAEsAABBZQgCgUAgAAAEKgsASqgEKgAAAAAAAAAWUAAAAoAAFlAgBZQAACpQCiAFlEogAoCAAAAiwACgIsAAAAACiKQIoCoAAAAAAAAQAABBZSAC0BAAAAQABKsAAQsAAAAAAAABZRKAAAChKAAAFlgACgAAAoAKIAWUAgAoBAAAASwACgAEAAAUigIBFlAigAAAAAAAlgAAASwACgUQAAIABKsAAAQAAAAAAAFJQAAAFIoAAAAFJSAABQAAAoAWCiAFlEAAKASwAAAELACgAEsAAKlAgBRAFiKAAAAAAACAAAIAAoFELAEABKqAAAlAEsAAAKgsUShKAAAALLCpQAAsCyKAAAACgAAFAAFgqWAKlAIAAKAhSAAASwACgAAJQCFAAAJKAAAAAAAAACLABLAALQEsAEAAKgAAAAAAEolAAAAAUlCUAgsCgAAUiiKAABSAFJQAAAFAgABZQCAACgJQSwAAAllIsAoAAWAAAAFlgEAAAAAAAAASiASwCgUCASiAASqgAAAAAAABSKJQAACCgAAAUigAAsCgAAAAAAoihLCiAAAKACAAACgEsAAAJQAgBSKJQAAFIshZQEABQAAAAAAAEogIKAEAEogAoCLAAsBSLAAoigAUiolAAAAAoSgAAoAAAAAAAWUCAAAAUEAoAAEAAAAKAiwAAAAAAAAFIoCAAAAAAAAAAAAAAEsEqoACLABLAAKAASgAAAUigIAKIoiiUAAAACiUAAAACiUJQSgIAAABQARQAAiiLAAACUoCKIoiwAAAFIohSKJSAAAAAAAAAAAAAAAEoiwiqiiSiKIsJQiiKIqooioigUiiKIoAAAAAAKIoiiUAABSLAoioiiUEoAAAAAFIoiiKIoASwLAAAAAAKAllAJQAACAAAAAAAAAAAAAAAAAAAAIogpKIohSSiKIoAAKIoiiKAAAAAAAAAABSKAAgAAAAAAAAAABZQAAAACLCyiAAAAAAAAAAAAAAAAAAWAAAAUgAAAALAAAAAAAASiKIqooiiKIoiiKIoiiKIoiiKIoiiKiKJQSgAAAAAAAohSLAUSiUIsCwWUAAAAJQgqCoLAWCoLFIAAAUhSAFJYFgsCoLAWCoKgAsBYAAFgAWUJSUEAogBSAAAAAAAAAAA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";

/* ═══════════════════════════════════════════════════════════════════════════
   1. ДИЗАЙН-ТОКЕНЫ — светлая премиальная тема по умолчанию + тёмная
   ═══════════════════════════════════════════════════════════════════════════ */

const THEMES = {
  light: {
    key: "light",
    bg: "#f7f9fd",
    text: "#0b1220",
    muted: "#55637d",
    faint: "#8794ad",
    panel: "rgba(255,255,255,0.80)",
    panelHi: "rgba(255,255,255,0.95)",
    solid: "rgba(255,255,255,0.97)",
    border: "rgba(12,20,38,0.08)",
    borderHi: "rgba(12,20,38,0.17)",
    grid: "rgba(12,20,38,0.06)",
    blue: "#2f6bf0",
    violet: "#7c46e8",
    cyan: "#0e9fc0",
    red: "#e0384c",
    amber: "#c9821a",
    teal: "#0f9b8a",
    shadow: "0 22px 50px -30px rgba(20,35,80,0.35)",
    glowA: "rgba(47,107,240,0.22)",
    glowB: "rgba(124,70,232,0.20)",
    glowC: "rgba(224,56,76,0.18)",
    bgImageOpacity: 0.85,
    bgWash: "rgba(247,249,253,0.55)",
    blobs: [
      "radial-gradient(closest-side, rgba(120,170,255,0.42), transparent)",
      "radial-gradient(closest-side, rgba(186,150,255,0.36), transparent)",
      "radial-gradient(closest-side, rgba(130,235,250,0.30), transparent)",
      "radial-gradient(closest-side, rgba(255,176,190,0.26), transparent)",
    ],
    surface: "#ffffff",
    ground: "#eef2f9",
  },
  dark: {
    key: "dark",
    bg: "#05070f",
    text: "#e9eefb",
    muted: "#8f9bb8",
    faint: "#5d6884",
    panel: "rgba(255,255,255,0.045)",
    panelHi: "rgba(255,255,255,0.075)",
    solid: "rgba(11,15,28,0.90)",
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
    bgImageOpacity: 0.18,
    bgWash: "rgba(5,7,15,0.78)",
    blobs: [
      "radial-gradient(closest-side, rgba(79,140,255,0.50), transparent)",
      "radial-gradient(closest-side, rgba(160,107,255,0.42), transparent)",
      "radial-gradient(closest-side, rgba(34,211,238,0.30), transparent)",
      "radial-gradient(closest-side, rgba(255,77,94,0.26), transparent)",
    ],
    surface: "#111828",
    ground: "#0b1120",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. ДАННЫЕ. Все производные показатели считаются из таблицы TASKS,
   поэтому цифры в интерфейсе всегда согласованы между собой.
   ═══════════════════════════════════════════════════════════════════════════ */

const GROUPS = {
  reg:   { id: "reg",   title: "Регламентные процессы", icon: ClipboardCheck, tone: "blue" },
  daily: { id: "daily", title: "Ежедневные проверки",   icon: Radar,          tone: "cyan" },
  crit:  { id: "crit",  title: "Критические задачи",    icon: Siren,          tone: "red"  },
};

// hours — нормо-часы в неделю на полное закрытие; covered — сколько реально закрывают двое
const TASKS = [
  { id: "coord",     name: "Согласование",                     icon: Phone,          group: "reg",   contour: "external", hours: 22, covered: 22, freq: "непрерывно",  note: "Транспорт, подрядчики, службы предприятия — входящий поток заявок" },
  { id: "audit",     name: "Аудит соответствия",               icon: ClipboardCheck, group: "reg",   contour: "external", hours: 8,  covered: 4,  freq: "еженедельно", note: "Внешние и внутренние проверки требований биобезопасности" },
  { id: "entry",     name: "Входной поток людей",              icon: DoorOpen,       group: "daily", contour: "external", hours: 12, covered: 6,  freq: "ежедневно",   note: "Проходная, санобработка при входе на территорию" },
  { id: "transport", name: "Мойка и дезинфекция транспорта",   icon: Truck,          group: "daily", contour: "external", hours: 11, covered: 5,  freq: "ежедневно",   note: "Дезбарьер на въезде, контроль качества обработки" },
  { id: "barriers",  name: "Дезбарьеры и дезковрики",          icon: ShieldCheck,    group: "daily", contour: "external", hours: 6,  covered: 3,  freq: "ежедневно",   note: "Заправка, замена растворов, контроль концентрации" },
  { id: "raw",       name: "Входной контроль сырья и ТМЦ",     icon: Package,        group: "daily", contour: "external", hours: 9,  covered: 4,  freq: "ежедневно",   note: "Проверка партий и тары до разгрузки" },
  { id: "suppliers", name: "Поставщики и подрядчики",          icon: Boxes,          group: "crit",  contour: "external", hours: 5,  covered: 3,  freq: "по событию",  note: "Допуск, документы, санитарный статус контрагентов" },
  { id: "lph",       name: "ЛПХ сотрудников",                  icon: Home,           group: "crit",  contour: "external", hours: 7,  covered: 1,  freq: "ежемесячно",  note: "Личные подсобные хозяйства — риск заноса инфекции извне" },
  { id: "epizoot",   name: "Эпизодситуация в регионе",         icon: Siren,          group: "crit",  contour: "external", hours: 8,  covered: 2,  freq: "мониторинг",  note: "Реагирование на вспышки, усиление режима на границе" },
  { id: "pestout",   name: "Внешний пест-контроль периметра",  icon: Bug,            group: "crit",  contour: "external", hours: 3,  covered: 0,  freq: "еженедельно", note: "Барьер от грызунов и насекомых по периметру территории" },

  { id: "report",    name: "Отчётность",                       icon: FileText,       group: "reg",   contour: "internal", hours: 16, covered: 16, freq: "ежедневно",   note: "Журналы, сводки, обязательная документация" },
  { id: "training",  name: "Обучение персонала",               icon: GraduationCap,  group: "reg",   contour: "internal", hours: 5,  covered: 1,  freq: "ежемесячно",  note: "Очное обучение нормам биобезопасности" },
  { id: "brief",     name: "Инструктажи на местах",            icon: Megaphone,      group: "reg",   contour: "internal", hours: 4,  covered: 1,  freq: "еженедельно", note: "Регулярные инструктажи по цехам и участкам" },
  { id: "verify",    name: "Верификация приёмки мойки",        icon: BadgeCheck,     group: "reg",   contour: "internal", hours: 6,  covered: 3,  freq: "ежедневно",   note: "Проверка качества мойки оборудования после обработки" },
  { id: "lab",       name: "Тестирование, лабораторные пробы", icon: FlaskConical,   group: "reg",   contour: "internal", hours: 5,  covered: 1,  freq: "еженедельно", note: "Смывы и пробы внутри контура, работа с лабораторией" },
  { id: "chem",      name: "Учёт дезсредств",                  icon: Droplets,       group: "reg",   contour: "internal", hours: 4,  covered: 3,  freq: "еженедельно", note: "Остатки, расход, сроки годности на складе" },
  { id: "pestin",    name: "Внутренний пест-контроль",         icon: Bug,            group: "daily", contour: "internal", hours: 5,  covered: 2,  freq: "еженедельно", note: "Ловушки и мониторинг внутри производственных помещений" },
  { id: "hangar",    name: "Ангар — санитарный режим",         icon: Warehouse,      group: "daily", contour: "internal", hours: 6,  covered: 3,  freq: "ежедневно",   note: "Контроль состояния и режима внутри производственного ангара" },
  { id: "husk",      name: "Склады лузги",                     icon: Layers,         group: "daily", contour: "internal", hours: 4,  covered: 0,  freq: "еженедельно", note: "Санитарный контроль зон хранения подстилочного материала" },
  { id: "atc",       name: "АТЦ — мойка и осмотр",             icon: Car,            group: "crit",  contour: "internal", hours: 2,  covered: 0,  freq: "еженедельно", note: "Автотранспортный цех: плановый осмотр и обработка техники" },
];

const STAFF = 2;
const HOURS_PER_STAFF = 40;

const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

const EXTERNAL = TASKS.filter((t) => t.contour === "external");
const INTERNAL = TASKS.filter((t) => t.contour === "internal");

const METRICS = (() => {
  const demandWeek = sum(TASKS, (t) => t.hours);                  // 148
  const capacityWeek = STAFF * HOURS_PER_STAFF;                   // 80
  const extDemand = sum(EXTERNAL, (t) => t.hours);                // 91
  const extCovered = sum(EXTERNAL, (t) => t.covered);             // 50
  const intDemand = sum(INTERNAL, (t) => t.hours);                // 57
  const intCovered = sum(INTERNAL, (t) => t.covered);             // 30
  const requiredStaff = Math.ceil(demandWeek / HOURS_PER_STAFF);  // 4
  return {
    demandWeek, capacityWeek, extDemand, extCovered, intDemand, intCovered, requiredStaff,
    load: Math.round((demandWeek / capacityWeek) * 100),           // 185 %
    extCoverage: Math.round((extCovered / extDemand) * 100),       // 55 %
    intCoverage: Math.round((intCovered / intDemand) * 100),       // 53 %
    gap: requiredStaff - STAFF,                                    // +2
    deficitHours: demandWeek - capacityWeek,                       // 68
    uncovered: TASKS.filter((t) => t.covered === 0).length,
    critWeak: TASKS.filter((t) => t.group === "crit" && t.covered / t.hours < 0.5).length,
  };
})();

const CONTOURS = {
  external: {
    id: "external",
    title: "Внешний контур",
    sub: "граница территории — риск останавливается здесь",
    items: EXTERNAL,
    demand: METRICS.extDemand,
    covered: METRICS.extCovered,
    coverage: METRICS.extCoverage,
    icon: ShieldCheck,
  },
  internal: {
    id: "internal",
    title: "Внутренний контур",
    sub: "процессы и перемещения внутри объекта",
    items: INTERNAL,
    demand: METRICS.intDemand,
    covered: METRICS.intCovered,
    coverage: METRICS.intCoverage,
    icon: Building2,
  },
};

/* Периоды: день = неделя / 5 рабочих дней, месяц = неделя × 4.2 (21 рабочий день) */
const PERIODS = {
  day:   { id: "day",   label: "День",   k: 1 / 5, unit: "нормо-часов",
           categories: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
           demand: [2.8, 4.1, 4.6, 3.2, 2.4, 4.4, 4.7, 3.4],
           capacity: [2, 2, 2, 2, 2, 2, 2, 2] },
  week:  { id: "week",  label: "Неделя", k: 1, unit: "нормо-часов",
           categories: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
           demand: [28, 30, 26, 29, 27, 5, 3],
           capacity: [16, 16, 16, 16, 16, 0, 0] },
  month: { id: "month", label: "Месяц",  k: 4.2, unit: "нормо-часов",
           categories: ["Неделя 1", "Неделя 2", "Неделя 3", "Неделя 4", "Неделя 5"],
           demand: [150, 158, 142, 155, 17],
           capacity: [80, 80, 80, 80, 16] },
};

/* Карта внутреннего контура: объекты и маршруты перемещений */
const SITES = {
  warehouse: { id: "warehouse", name: "Склад",                 sub: "корма, подстилка, ТМЦ", x: 185, y: 285, w: 170, h: 104, icon: Warehouse },
  atc:       { id: "atc",       name: "АТЦ",                   sub: "транспортный цех",  x: 300, y: 470, w: 150, h: 80,  icon: Car },
  incubator: { id: "incubator", name: "Инкубатор",             sub: "суточный молодняк",     x: 545, y: 135, w: 136, h: 84,  icon: Egg },
  broiler:   { id: "broiler",   name: "Бройлерные площадки",   sub: "3 корпуса",             x: 825, y: 300, w: 200, h: 240, icon: Bird },
  office:    { id: "office",    name: "Офис",                  sub: `${STAFF} специалиста — постоянно здесь`, x: 575, y: 458, w: 210, h: 92, icon: Building2 },
};

const ROUTES = [
  { id: "r1", from: "warehouse", to: "incubator", label: "Склад → Инкубатор",              cargo: "корма и подстилка",        trips: 4, d: "M270,255 Q380,190 477,155", dur: 7.5 },
  { id: "r2", from: "warehouse", to: "atc",       label: "Склад → АТЦ",                    cargo: "запчасти и ТМЦ",           trips: 3, d: "M200,337 Q214,398 280,432", dur: 5.5 },
  { id: "r3", from: "warehouse", to: "broiler",   label: "Склад → Бройлерные площадки",    cargo: "корма, подстилка, инвентарь", trips: 6, d: "M270,305 Q500,345 725,300", dur: 9 },
  { id: "r4", from: "incubator", to: "broiler",   label: "Инкубатор → Бройлерные площадки", cargo: "суточный молодняк",       trips: 2, d: "M613,168 Q700,188 738,236", dur: 6 },
  { id: "r5", from: "atc",       to: "incubator", label: "АТЦ → Инкубатор",                cargo: "техника после обслуживания", trips: 2, d: "M330,430 Q382,292 500,180", dur: 8 },
];
const TRIPS_TOTAL = sum(ROUTES, (r) => r.trips);

/* Точки, где физически нужен специалист, но его нет */
const MARKERS = [
  { id: "warehouse", x: 262, y: 236 },
  { id: "incubator", x: 606, y: 96 },
  { id: "broiler",   x: 908, y: 190 },
  { id: "atc",       x: 366, y: 434 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   3. ХЕЛПЕРЫ
   ═══════════════════════════════════════════════════════════════════════════ */

const EASE = [0.22, 1, 0.36, 1];
const fmt = (n, d = 0) =>
  n.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });

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

/* ═══════════════════════════════════════════════════════════════════════════
   4. ФОН: изображение Higgsfield + живая аврора + техническая сетка
   ═══════════════════════════════════════════════════════════════════════════ */

function PremiumBackground({ T }) {
  const blobs = [
    { i: 0, size: 620, top: "-14%", left: "-8%", dur: 26, dx: 90,   dy: 60 },
    { i: 1, size: 720, top: "12%",  left: "60%", dur: 33, dx: -110, dy: 80 },
    { i: 2, size: 540, top: "56%",  left: "4%",  dur: 29, dx: 130,  dy: -70 },
    { i: 3, size: 480, top: "74%",  left: "66%", dur: 36, dx: -80,  dy: -90 },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ background: T.bg }}>
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${HF_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: T.bgImageOpacity,
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 48, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0" style={{ background: T.bgWash }} />
      {blobs.map((b) => (
        <motion.div
          key={b.i}
          className="absolute rounded-full"
          style={{
            width: b.size, height: b.size, top: b.top, left: b.left,
            background: T.blobs[b.i], filter: "blur(70px)",
          }}
          animate={{ x: [0, b.dx, 0], y: [0, b.dy, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${T.grid} 1px, transparent 1px), linear-gradient(90deg, ${T.grid} 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(115% 80% at 50% 0%, #000 25%, transparent 88%)",
          WebkitMaskImage: "radial-gradient(115% 80% at 50% 0%, #000 25%, transparent 88%)",
        }}
      />
      <motion.div
        className="absolute inset-x-0 h-[34vh]"
        style={{
          background: `linear-gradient(180deg, transparent, ${T.glowA}, transparent)`,
          filter: "blur(34px)", opacity: 0.45,
        }}
        animate={{ y: ["-38vh", "122vh"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. ПРИМИТИВЫ
   ═══════════════════════════════════════════════════════════════════════════ */

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

function SectionHead({ T, eyebrow, title, right }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="font-mono text-[10.5px] uppercase tracking-[0.2em]" style={{ color: T.faint }}>
          {eyebrow}
        </div>
        <h2 className="mt-1 text-[18px] font-semibold" style={{ color: T.text }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function Panel({ T, children, className = "", delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ delay, duration: 0.65, ease: EASE }}
      className={`rounded-3xl p-5 backdrop-blur-xl sm:p-7 ${className}`}
      style={{ background: T.panel, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
    >
      {children}
    </motion.section>
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
            boxShadow: `0 14px 32px -10px ${T.glowA}`,
          }}
        >
          <ShieldAlert size={22} color="#fff" />
        </motion.div>
        <div>
          <div className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.22em]" style={{ color: T.faint }}>
            Отдел биобезопасности · Executive dashboard
          </div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight sm:text-[27px]" style={{ color: T.text }}>
            Мониторинг биобезопасности и нагрузка персонала
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-2.5 rounded-full px-3 py-1.5"
              style={{ background: `${T.red}14`, border: `1px solid ${T.red}55` }}
            >
              <PulseDot color={T.red} />
              <span className="text-[12px] font-semibold" style={{ color: T.red }}>Критическая перегрузка</span>
              <span className="font-mono text-[10px] tracking-wider" style={{ color: T.red, opacity: 0.7 }}>CRITICAL RISK</span>
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
        <div className="flex rounded-xl p-1 backdrop-blur-xl" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
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
          className="grid h-[38px] w-[38px] place-items-center rounded-xl backdrop-blur-xl"
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
            boxShadow: `0 18px 38px -16px ${T.glowC}`,
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
   7. KPI
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
      style={{ minWidth: 200, background: T.panel, border: `1px solid ${T.border}`, boxShadow: T.shadow }}
    >
      <motion.div
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full"
        style={{ background: item.color, filter: "blur(46px)", opacity: 0.20 }}
        animate={{ scale: [1, 1.18, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: index * 0.4 }}
      />
      <div className="relative flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${item.color}1f`, color: item.color }}>
          <Icon size={15} />
        </div>
        <span className="text-[12px]" style={{ color: T.muted }}>{item.label}</span>
      </div>
      <div className="relative mt-3 flex items-baseline gap-1.5">
        <span
          className="text-[34px] font-semibold leading-none tracking-tight"
          style={{ color: item.color, textShadow: T.key === "dark" ? `0 0 26px ${item.color}55` : "none" }}
        >
          {item.prefix || ""}{fmt(v)}
        </span>
        <span className="text-[13px] font-medium" style={{ color: T.faint }}>{item.suffix}</span>
      </div>
      <div className="relative mt-2 text-[11.5px] leading-snug" style={{ color: T.faint }}>{item.note}</div>
      {item.progress != null && (
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: T.grid }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: item.color, boxShadow: T.key === "dark" ? `0 0 14px ${item.color}` : "none" }}
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
   8. ДВА КОНТУРА: слева внешний, справа внутренний
   ═══════════════════════════════════════════════════════════════════════════ */

/* Мини-сцена внешнего контура: поток извне упирается в границу */
function ExternalScene({ T, active }) {
  const c = active ? T.violet : T.muted;
  const incoming = [
    { i: 0, x: 42,  icon: "truck" },
    { i: 1, x: 118, icon: "person" },
    { i: 2, x: 196, icon: "box" },
    { i: 3, x: 264, icon: "bug" },
  ];
  return (
    <svg viewBox="0 0 320 150" className="w-full" style={{ height: 150 }}>
      {/* граница */}
      <line x1="10" y1="100" x2="310" y2="100" stroke={c} strokeWidth={active ? 2.4 : 1.6} strokeDasharray="7 6" opacity={0.9} />
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.circle
          key={i}
          cx={26 + i * 30} cy={100} r={active ? 4.6 : 3.4}
          fill={active ? T.violet : T.faint}
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.13 }}
        />
      ))}
      {/* поток извне */}
      {incoming.map((it) => (
        <motion.g
          key={it.i}
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: [-30, 52, 58, 52], opacity: [0, 1, 1, 0.15] }}
          transition={{
            duration: active ? 2.4 : 3.4,
            repeat: Infinity,
            delay: it.i * (active ? 0.42 : 0.7),
            ease: "easeInOut",
            times: [0, 0.55, 0.7, 1],
          }}
        >
          {it.icon === "truck" && (
            <g transform={`translate(${it.x - 12}, 22)`}>
              <rect x="0" y="4" width="17" height="11" rx="2.5" fill={T.blue} />
              <rect x="16" y="7" width="8" height="8" rx="2" fill={T.cyan} />
              <circle cx="6" cy="16.5" r="2.2" fill={T.text} opacity="0.55" />
              <circle cx="19" cy="16.5" r="2.2" fill={T.text} opacity="0.55" />
            </g>
          )}
          {it.icon === "person" && (
            <g transform={`translate(${it.x}, 26)`}>
              <circle cx="0" cy="0" r="5" fill={T.cyan} />
              <path d="M -6 18 L -5 6 Q 0 2 5 6 L 6 18 Z" fill={T.cyan} opacity="0.85" />
            </g>
          )}
          {it.icon === "box" && (
            <g transform={`translate(${it.x - 8}, 24)`}>
              <rect x="0" y="0" width="17" height="15" rx="2" fill={T.amber} opacity="0.9" />
              <line x1="8.5" y1="0" x2="8.5" y2="15" stroke="#fff" strokeWidth="1.4" opacity="0.7" />
            </g>
          )}
          {it.icon === "bug" && (
            <g transform={`translate(${it.x}, 28)`}>
              <ellipse cx="0" cy="0" rx="6" ry="8" fill={T.red} opacity="0.9" />
              <line x1="-8" y1="-5" x2="-3" y2="-2" stroke={T.red} strokeWidth="1.6" />
              <line x1="8" y1="-5" x2="3" y2="-2" stroke={T.red} strokeWidth="1.6" />
            </g>
          )}
        </motion.g>
      ))}
      {/* «остановлено на границе» */}
      <motion.rect
        x="10" y="88" width="300" height="14" rx="7"
        fill={active ? T.violet : T.faint}
        animate={{ opacity: active ? [0.10, 0.22, 0.10] : 0.07 }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <text x="160" y="128" textAnchor="middle" fontSize="10.5" fill={T.faint}>
        всё, что заходит на территорию, проходит здесь
      </text>
    </svg>
  );
}

/* Мини-сцена внутреннего контура: перемещения между объектами */
function InternalScene({ T, active }) {
  const c = active ? T.cyan : T.muted;
  const nodes = [
    { x: 48,  y: 46, label: "Склад" },
    { x: 160, y: 30, label: "Инкубатор" },
    { x: 268, y: 56, label: "Площадки" },
    { x: 108, y: 100, label: "АТЦ" },
    { x: 214, y: 104, label: "Ангар" },
  ];
  const links = [[0, 1], [0, 3], [0, 2], [1, 2], [3, 1], [3, 4]];
  return (
    <svg viewBox="0 0 320 150" className="w-full" style={{ height: 150 }}>
      {links.map(([a, b], i) => {
        const p1 = nodes[a], p2 = nodes[b];
        return (
          <g key={i}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={c} strokeWidth={1.1} strokeDasharray="4 5" opacity={0.5} />
            <motion.circle
              r={active ? 3.6 : 2.8}
              fill={active ? T.cyan : T.faint}
              initial={{ cx: p1.x, cy: p1.y, opacity: 0 }}
              animate={{ cx: [p1.x, p2.x], cy: [p1.y, p2.y], opacity: [0, 1, 1, 0] }}
              transition={{
                duration: active ? 1.8 : 2.8,
                repeat: Infinity,
                delay: i * (active ? 0.28 : 0.45),
                ease: "linear",
                opacity: { duration: active ? 1.8 : 2.8, repeat: Infinity, delay: i * (active ? 0.28 : 0.45), times: [0, 0.12, 0.85, 1] },
              }}
            />
          </g>
        );
      })}
      {nodes.map((n, i) => (
        <g key={n.label}>
          <rect x={n.x - 15} y={n.y - 10} width="30" height="20" rx="5"
                fill={active ? `${T.cyan}22` : T.grid} stroke={c} strokeWidth="1.1" />
          <text x={n.x} y={n.y + 22} textAnchor="middle" fontSize="8.5" fill={T.faint}>{n.label}</text>
        </g>
      ))}
      <text x="160" y="140" textAnchor="middle" fontSize="10.5" fill={T.faint}>
        {TRIPS_TOTAL} перемещений в сутки между зонами
      </text>
    </svg>
  );
}

function ContourCard({ T, contour, active, onClick, side }) {
  const C = CONTOURS[contour];
  const Icon = C.icon;
  const accent = contour === "external" ? T.violet : T.cyan;
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: side === "left" ? -26 : 26 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: EASE }}
      whileHover={{ y: -5 }}
      className="relative overflow-hidden rounded-2xl p-5 text-left backdrop-blur-xl"
      style={{
        background: active ? `${accent}0f` : T.panel,
        border: `1.5px solid ${active ? accent : T.border}`,
        boxShadow: active ? `0 26px 54px -26px ${accent}` : T.shadow,
      }}
    >
      {active && (
        <motion.div
          layoutId="contour-glow"
          className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full"
          style={{ background: accent, filter: "blur(60px)", opacity: 0.22 }}
        />
      )}
      <div className="relative flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${accent}1f`, color: accent }}>
          <Icon size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold" style={{ color: T.text }}>{C.title}</div>
          <div className="text-[11.5px]" style={{ color: T.faint }}>{C.sub}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[11px]" style={{ color: T.faint }}>направлений</div>
          <div className="text-[20px] font-semibold leading-none" style={{ color: accent }}>{C.items.length}</div>
        </div>
        <motion.span animate={{ rotate: active ? 180 : 0 }} transition={{ duration: 0.3 }} style={{ color: T.faint }}>
          <ChevronDown size={16} />
        </motion.span>
      </div>

      <div className="relative mt-2">
        {contour === "external" ? <ExternalScene T={T} active={active} /> : <InternalScene T={T} active={active} />}
      </div>

      <div className="relative mt-1 flex items-center gap-3">
        <div className="flex-1">
          <div className="mb-1 flex justify-between font-mono text-[10px]" style={{ color: T.faint }}>
            <span>покрытие</span>
            <span>{C.covered} из {C.demand} ч/нед</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: T.grid }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${T.amber}, ${T.red})` }}
              initial={{ width: 0 }}
              whileInView={{ width: `${C.coverage}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: EASE }}
            />
          </div>
        </div>
        <div className="text-[19px] font-semibold" style={{ color: C.coverage < 60 ? T.red : T.amber }}>
          {C.coverage}%
        </div>
      </div>
    </motion.button>
  );
}

function ContourTaskList({ T, contour }) {
  const C = CONTOURS[contour];
  const accent = contour === "external" ? T.violet : T.cyan;
  const toneMap = { blue: T.blue, cyan: T.cyan, red: T.red };
  const groups = Object.values(GROUPS)
    .map((g) => ({ ...g, items: C.items.filter((t) => t.group === g.id) }))
    .filter((g) => g.items.length);
  let idx = 0;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="overflow-hidden"
    >
      <div className="pt-5">
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <span className="rounded-lg px-2.5 py-1 text-[12px] font-semibold" style={{ background: `${accent}1a`, color: accent }}>
            {C.title}
          </span>
          <span className="text-[12px]" style={{ color: T.muted }}>
            {C.items.length} направлений · {C.demand} нормо-часов в неделю · закрыто {C.coverage}%
          </span>
        </div>

        <div className="space-y-5">
          {groups.map((g) => {
            const GIcon = g.icon;
            const tone = toneMap[g.tone];
            const gh = sum(g.items, (t) => t.hours);
            const gc = sum(g.items, (t) => t.covered);
            return (
              <div key={g.id}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${tone}1f`, color: tone }}>
                    <GIcon size={14} />
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color: T.text }}>{g.title}</span>
                  <span className="font-mono text-[10.5px]" style={{ color: T.faint }}>
                    {g.items.length} · {gh} ч/нед · закрыто {Math.round((gc / gh) * 100)}%
                  </span>
                  <div className="h-px flex-1" style={{ background: T.border }} />
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {g.items.map((t) => {
                    const Icon = t.icon;
                    const pct = Math.round((t.covered / t.hours) * 100);
                    const state = pct >= 80 ? T.teal : pct >= 40 ? T.amber : T.red;
                    const delay = 0.04 * idx++;
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -18, scale: 0.98 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ delay, duration: 0.42, ease: EASE }}
                        whileHover={{ y: -3, boxShadow: `0 18px 34px -22px ${tone}` }}
                        className="rounded-xl p-3.5 backdrop-blur-xl"
                        style={{ background: T.panelHi, border: `1px solid ${T.border}` }}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${tone}1a`, color: tone }}>
                            <Icon size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12.5px] font-semibold leading-tight" style={{ color: T.text }}>{t.name}</div>
                            <div className="mt-0.5 text-[11px] leading-snug" style={{ color: T.faint }}>{t.note}</div>
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
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md px-1.5 py-0.5 font-mono text-[9.5px]" style={{ background: T.grid, color: T.faint }}>{t.freq}</span>
                          <span className="rounded-md px-1.5 py-0.5 font-mono text-[9.5px]" style={{ background: T.grid, color: T.faint }}>{t.hours} ч/нед</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. СЦЕНА НАГРУЗКИ: все задачи слетаются и садятся на двух сотрудников
   ═══════════════════════════════════════════════════════════════════════════ */

const VB = { w: 760, h: 520 };
const CC = { x: 380, y: 246 };
const R_RING = 204;
const R_NODE = 168;
const R_CORE = 106;

const nodePos = (i, n, r = R_NODE) => {
  const a = (i / n) * 2 * Math.PI - Math.PI / 2;
  return { x: CC.x + r * Math.cos(a), y: CC.y + r * Math.sin(a) };
};

function Person({ T, x, y, tilt, stack, delay = 0 }) {
  return (
    <motion.g
      animate={{ y: [0, -3, 0], rotate: tilt }}
      transition={{
        y: { duration: 3.4, repeat: Infinity, ease: "easeInOut", delay },
        rotate: { type: "spring", stiffness: 200, damping: 14 },
      }}
      style={{ originX: `${x}px`, originY: `${y + 30}px` }}
    >
      {Array.from({ length: stack }).map((_, i) => (
        <motion.rect
          key={i}
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, type: "spring", stiffness: 260, damping: 18 }}
          x={x - 20 + (i % 2 ? 3 : -3)} y={y - 54 - i * 8}
          width={40} height={7} rx={3}
          fill={i > 3 ? T.red : T.amber} opacity={0.92}
        />
      ))}
      <ellipse cx={x} cy={y + 44} rx={24} ry={5} fill="#000" opacity={T.key === "dark" ? 0.35 : 0.10} />
      <path
        d={`M ${x - 19} ${y + 42} L ${x - 17} ${y + 2} Q ${x} ${y - 12} ${x + 17} ${y + 2} L ${x + 19} ${y + 42} Z`}
        fill={T.red} opacity={0.95}
      />
      <circle cx={x} cy={y - 24} r={14} fill="#e9c39c" />
      <path
        d={`M ${x - 14} ${y - 28} Q ${x} ${y - 46} ${x + 14} ${y - 28} Q ${x + 8} ${y - 38} ${x} ${y - 38} Q ${x - 8} ${y - 38} ${x - 14} ${y - 28} Z`}
        fill="#3a3346"
      />
      <motion.circle
        cx={x} cy={y - 4} r={38} fill="none" stroke={T.red} strokeWidth={1.3}
        initial={{ scale: 0.85, opacity: 0.5 }}
        animate={{ scale: [0.85, 1.25], opacity: [0.5, 0] }}
        transition={{ duration: 1.9, repeat: Infinity, ease: "easeOut", delay }}
        style={{ originX: `${x}px`, originY: `${y - 4}px` }}
      />
    </motion.g>
  );
}

function WorkloadStage({ T }) {
  const n = TASKS.length;
  const toneOf = (t) => (t.group === "crit" ? T.red : t.group === "daily" ? T.cyan : T.blue);
  const targets = [{ x: CC.x - 46, y: CC.y + 8 }, { x: CC.x + 46, y: CC.y + 8 }];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="mx-auto block w-full" style={{ maxWidth: 820 }}>
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={T.red} stopOpacity={T.key === "dark" ? 0.30 : 0.16} />
            <stop offset="100%" stopColor={T.red} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={T.blue} />
            <stop offset="50%" stopColor={T.violet} />
            <stop offset="100%" stopColor={T.cyan} />
          </linearGradient>
        </defs>

        <motion.circle
          cx={CC.x} cy={CC.y} r={R_RING}
          fill="none" stroke="url(#ringGrad)" strokeWidth={1.4} strokeDasharray="4 10" opacity={0.6}
          animate={{ rotate: 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
        />

        {TASKS.map((t, i) => {
          const p = nodePos(i, n);
          const tg = targets[i % 2];
          return (
            <line key={`l-${t.id}`} x1={p.x} y1={p.y} x2={tg.x} y2={tg.y}
                  stroke={toneOf(t)} strokeWidth={0.8} strokeDasharray="3 7" opacity={0.18} />
          );
        })}

        {TASKS.map((t, i) => {
          const p = nodePos(i, n);
          const c = toneOf(t);
          return (
            <motion.g
              key={t.id}
              initial={{ opacity: 0, scale: 0.4 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.03, type: "spring", stiffness: 220, damping: 18 }}
            >
              <motion.circle
                cx={p.x} cy={p.y} r={6.5} fill={c}
                animate={{ opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.11 }}
                style={{ filter: T.key === "dark" ? `drop-shadow(0 0 7px ${c})` : "none" }}
              />
              <circle cx={p.x} cy={p.y} r={13} fill="none" stroke={c} strokeWidth={0.8} opacity={0.3} />
            </motion.g>
          );
        })}

        {TASKS.map((t, i) => {
          const p = nodePos(i, n);
          const tg = targets[i % 2];
          const c = toneOf(t);
          const dur = 2.1;
          const delay = i * 0.16;
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
                duration: dur, repeat: Infinity, repeatDelay: 1.2, delay, ease: "easeInOut", times: [0, 0.5, 1],
                opacity: { duration: dur, repeat: Infinity, repeatDelay: 1.2, delay, times: [0, 0.15, 0.8, 1] },
              }}
            >
              <rect x={-9} y={-4} width={18} height={8} rx={3} fill={c} opacity={0.95}
                    style={{ filter: T.key === "dark" ? `drop-shadow(0 0 6px ${c})` : "none" }} />
            </motion.g>
          );
        })}

        <circle cx={CC.x} cy={CC.y} r={R_CORE + 46} fill="url(#coreGlow)" pointerEvents="none" />
        <motion.circle
          cx={CC.x} cy={CC.y} r={R_CORE}
          fill={T.key === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.72)"}
          stroke={T.red} strokeWidth={2.2}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
        />
        <motion.circle
          cx={CC.x} cy={CC.y} r={R_CORE} fill="none" stroke={T.red} strokeWidth={1.5}
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: [1, 1.24], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
        />

        <g pointerEvents="none">
          <Person T={T} x={CC.x - 46} y={CC.y + 8} tilt={4} stack={6} delay={0} />
          <Person T={T} x={CC.x + 46} y={CC.y + 8} tilt={-4} stack={6} delay={0.5} />
        </g>

        <g pointerEvents="none">
          <rect x={CC.x - 74} y={CC.y + 64} width={148} height={8} rx={4} fill={T.grid} />
          <motion.rect
            x={CC.x - 74} y={CC.y + 64} height={8} rx={4} fill={T.teal}
            initial={{ width: 0 }} whileInView={{ width: 80 }} viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 1, ease: EASE }}
          />
          <motion.rect
            x={CC.x + 6} y={CC.y + 64} height={8} rx={4} fill={T.red}
            initial={{ width: 0 }} animate={{ width: 68, opacity: [1, 0.55, 1] }}
            transition={{
              width: { delay: 1, duration: 1, ease: EASE },
              opacity: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
            }}
          />
          <text x={CC.x} y={CC.y + 90} textAnchor="middle" fontSize="11" fontWeight="600" fill={T.red}>
            загрузка {METRICS.load}%
          </text>
        </g>

        <text x={CC.x} y={22} textAnchor="middle" fontSize="11.5" fontWeight="700" letterSpacing="2.2" fill={T.faint}>
          {TASKS.length} НАПРАВЛЕНИЙ · {METRICS.demandWeek} НОРМО-ЧАСОВ
        </text>
        <text x={CC.x} y={CC.y - R_CORE - 14} textAnchor="middle" fontSize="10" fontWeight="700" letterSpacing="1.4" fill={T.red}>
          РЕСУРС · {STAFF} ЧЕЛ.
        </text>
        <text x={CC.x} y={VB.h - 16} textAnchor="middle" fontSize="11" fill={T.faint}>
          дефицит {METRICS.deficitHours} нормо-часов в неделю — задачи не исчезают, они копятся
        </text>
      </svg>

      <motion.div
        initial={{ opacity: 0, x: 24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.6, ease: EASE }}
        className="absolute right-0 top-4 w-[248px] rounded-2xl p-4 backdrop-blur-2xl"
        style={{ background: T.solid, border: `1px solid ${T.red}55`, boxShadow: `0 24px 50px -22px ${T.glowC}` }}
      >
        <div className="flex items-center gap-2">
          <Gauge size={15} color={T.red} />
          <span className="text-[12px] font-semibold" style={{ color: T.red }}>Виджет перегрузки</span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-[30px] font-semibold leading-none" style={{ color: T.red }}>{METRICS.load}%</span>
          <span className="pb-1 text-[11px]" style={{ color: T.muted }}>загрузка</span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: T.grid }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${T.teal}, ${T.red})` }}
            initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }}
            transition={{ duration: 0.9, ease: EASE }}
          />
        </div>
        <div className="mt-3 flex items-start gap-2 text-[11.5px] leading-snug" style={{ color: T.muted }}>
          <AlertTriangle size={13} color={T.amber} className="mt-0.5 shrink-0" />
          Риск пропуска критических задач: {METRICS.critWeak} из{" "}
          {TASKS.filter((t) => t.group === "crit").length} критических направлений закрыты менее чем наполовину.
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { l: "ресурс", v: `${METRICS.capacityWeek} ч`, c: T.teal },
            { l: "требуется", v: `${METRICS.demandWeek} ч`, c: T.red },
          ].map((x) => (
            <div key={x.l} className="rounded-lg px-2.5 py-1.5" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
              <div className="font-mono text-[9.5px] uppercase tracking-wider" style={{ color: T.faint }}>{x.l}</div>
              <div className="text-[14px] font-semibold" style={{ color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. КАРТА ПЕРЕМЕЩЕНИЙ ВНУТРЕННЕГО КОНТУРА
   ═══════════════════════════════════════════════════════════════════════════ */

function MiniTruck({ color, T }) {
  return (
    <g>
      <rect x={-17} y={-8} width={22} height={16} rx={3} fill={color} />
      <rect x={4} y={-7} width={12} height={14} rx={3} fill={T.key === "dark" ? "#dfe7f5" : "#25324a"} />
      <rect x={-15} y={-11} width={6} height={3} rx={1.5} fill="#1b2434" opacity={0.75} />
      <rect x={-15} y={8} width={6} height={3} rx={1.5} fill="#1b2434" opacity={0.75} />
      <rect x={6} y={-11} width={6} height={3} rx={1.5} fill="#1b2434" opacity={0.75} />
      <rect x={6} y={8} width={6} height={3} rx={1.5} fill="#1b2434" opacity={0.75} />
    </g>
  );
}

function SiteBlock({ T, site, accent, isOffice }) {
  const Icon = site.icon;
  const x = site.x - site.w / 2;
  const y = site.y - site.h / 2;
  return (
    <g>
      <rect x={x + 4} y={y + 6} width={site.w} height={site.h} rx={12}
            fill="#0b1220" opacity={T.key === "dark" ? 0.35 : 0.07} />
      <rect x={x} y={y} width={site.w} height={site.h} rx={12}
            fill={T.surface} stroke={isOffice ? T.red : accent} strokeWidth={isOffice ? 2 : 1.3} opacity={0.98} />
      <rect x={x} y={y} width={site.w} height={10} rx={5} fill={isOffice ? T.red : accent} opacity={0.5} />
      <foreignObject x={x + 10} y={y + 18} width={site.w - (isOffice ? 92 : 20)} height={site.h - 26}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            display: "grid", placeItems: "center",
            background: `${isOffice ? T.red : accent}1f`, color: isOffice ? T.red : accent,
          }}>
            <Icon size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, lineHeight: 1.15 }}>{site.name}</div>
            <div style={{ fontSize: 10, color: T.faint, lineHeight: 1.2 }}>{site.sub}</div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

function LogisticsMap({ T }) {
  const [hovered, setHovered] = useState(null);
  const accent = T.cyan;
  const office = SITES.office;
  const ghostTargets = [SITES.warehouse, SITES.incubator, SITES.broiler, SITES.atc];

  return (
    <div className="relative">
      <svg viewBox="0 0 1000 560" className="w-full" style={{ minWidth: 720 }}>
        {/* территория */}
        <rect x="24" y="24" width="952" height="512" rx="22"
              fill={T.ground} stroke={T.border} strokeWidth="1.4" />
        <rect x="24" y="24" width="952" height="512" rx="22"
              fill="none" stroke={accent} strokeWidth="1.2" strokeDasharray="8 8" opacity="0.35" />
        <text x="44" y="50" fontSize="10.5" fontWeight="700" letterSpacing="2" fill={T.faint}>
          ВНУТРЕННИЙ КОНТУР · ТЕРРИТОРИЯ ОБЪЕКТА
        </text>

        {/* маршруты */}
        {ROUTES.map((r) => {
          const on = hovered === r.id || hovered === null;
          return (
            <g key={r.id}>
              <path id={`path-${r.id}`} d={r.d} fill="none"
                    stroke={T.faint} strokeWidth={hovered === r.id ? 16 : 13}
                    strokeLinecap="round" opacity={on ? 0.18 : 0.07} />
              <path d={r.d} fill="none" stroke={hovered === r.id ? T.red : accent}
                    strokeWidth={1.6} strokeDasharray="7 8" opacity={on ? 0.75 : 0.2}>
                <animate attributeName="stroke-dashoffset" from="30" to="0" dur="1.6s" repeatCount="indefinite" />
              </path>
            </g>
          );
        })}

        {/* бройлерные корпуса */}
        {[215, 300, 385].map((y, i) => (
          <g key={y}>
            <rect x={729} y={y - 17 + 5} width={196} height={34} rx={9} fill="#0b1220" opacity={T.key === "dark" ? 0.3 : 0.06} />
            <rect x={725} y={y - 17} width={196} height={34} rx={9} fill={T.surface} stroke={accent} strokeWidth="1.2" />
            <rect x={725} y={y - 17} width={196} height={6} rx={3} fill={accent} opacity="0.45" />
            <text x={823} y={y + 9} textAnchor="middle" fontSize="11" fill={T.muted}>корпус {i + 1}</text>
          </g>
        ))}
        <text x={823} y={444} textAnchor="middle" fontSize="12.5" fontWeight="600" fill={T.text}>
          Бройлерные площадки
        </text>
        <text x={823} y={460} textAnchor="middle" fontSize="10" fill={T.faint}>3 корпуса</text>

        {/* объекты */}
        <SiteBlock T={T} site={SITES.warehouse} accent={accent} />
        <SiteBlock T={T} site={SITES.atc} accent={accent} />
        <SiteBlock T={T} site={SITES.incubator} accent={accent} />
        <SiteBlock T={T} site={SITES.office} accent={accent} isOffice />

        {/* маркеры «здесь нужен специалист» */}
        {MARKERS.map((m, i) => (
          <g key={`m-${m.id}`}>
            <motion.circle
              cx={m.x} cy={m.y} r={9} fill={T.red} opacity={0.92}
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}
              style={{ originX: `${m.x}px`, originY: `${m.y}px` }}
            />
            <text x={m.x} y={m.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">!</text>
            <motion.circle
              cx={m.x} cy={m.y} r={9} fill="none" stroke={T.red} strokeWidth={1.4}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              style={{ originX: `${m.x}px`, originY: `${m.y}px` }}
            />
          </g>
        ))}

        {/* два сотрудника внутри офиса */}
        {[office.x + 42, office.x + 78].map((px, i) => (
          <motion.g key={px}
                    animate={{ y: [0, -2.5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}>
            <circle cx={px} cy={office.y - 10} r={9} fill={T.red} />
            <path d={`M ${px - 11} ${office.y + 14} L ${px - 10} ${office.y} Q ${px} ${office.y - 5} ${px + 10} ${office.y} L ${px + 11} ${office.y + 14} Z`}
                  fill={T.red} opacity={0.92} />
          </motion.g>
        ))}

        {/* «разрываются»: силуэты уходят к объектам и растворяются */}
        {ghostTargets.map((s, i) => (
          <motion.g
            key={`g-${s.id}`}
            initial={{ x: office.x, y: office.y, opacity: 0 }}
            animate={{
              x: [office.x, (office.x + s.x) / 2, s.x],
              y: [office.y, (office.y + s.y) / 2, s.y],
              opacity: [0, 0.55, 0],
              scale: [1, 0.9, 0.75],
            }}
            transition={{ duration: 3.4, repeat: Infinity, delay: i * 0.85, ease: "easeInOut", times: [0, 0.5, 1] }}
          >
            <circle cx={0} cy={-12} r={8} fill={T.red} opacity={0.5} />
            <path d="M -10 10 L -9 -2 Q 0 -7 9 -2 L 10 10 Z" fill={T.red} opacity={0.4} />
          </motion.g>
        ))}

        {/* грузовики по маршрутам */}
        {ROUTES.map((r, ri) =>
          Array.from({ length: Math.min(2, Math.ceil(r.trips / 3)) }).map((_, k) => (
            <g key={`t-${r.id}-${k}`} opacity={hovered && hovered !== r.id ? 0.25 : 1}>
              <MiniTruck color={hovered === r.id ? T.red : T.blue} T={T} />
              <animateMotion
                dur={`${r.dur}s`}
                begin={`${ri * 0.9 + k * (r.dur / 2)}s`}
                repeatCount="indefinite"
                rotate="auto"
                path={r.d}
              />
            </g>
          ))
        )}

        {/* подписи маршрутов */}
        <text x="500" y="552" textAnchor="middle" fontSize="11" fill={T.faint}>
          {ROUTES.length} постоянных маршрута · {TRIPS_TOTAL} перемещений в сутки · каждое — пересечение зон
        </text>
      </svg>

      {/* легенда маршрутов */}
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {ROUTES.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.45, ease: EASE }}
            onMouseEnter={() => setHovered(r.id)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
            style={{
              background: hovered === r.id ? `${T.red}12` : T.panel,
              border: `1px solid ${hovered === r.id ? T.red : T.border}`,
              cursor: "default",
            }}
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                 style={{ background: `${hovered === r.id ? T.red : T.cyan}1a`, color: hovered === r.id ? T.red : T.cyan }}>
              <Route size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold" style={{ color: T.text }}>{r.label}</div>
              <div className="truncate text-[11px]" style={{ color: T.faint }}>{r.cargo}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[13px] font-semibold" style={{ color: T.text }}>{r.trips}</div>
              <div className="font-mono text-[9.5px]" style={{ color: T.faint }}>рейса/сут</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. АНАЛИТИКА HIGHCHARTS
   ═══════════════════════════════════════════════════════════════════════════ */

function ChartPanel({ T, period, open }) {
  const P = PERIODS[period];

  const options = useMemo(() => {
    const hex = (c, a) => {
      const h = c.replace("#", "");
      return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
    };
    const grad = (c, top = 0.55) => ({
      linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
      stops: [[0, hex(c, top)], [1, hex(c, 0)]],
    });

    const extOpen = open === "external";
    const intOpen = open === "internal";

    const series = [
      {
        type: "areaspline",
        name: "Общий входящий объём задач",
        data: P.demand,
        color: T.violet,
        lineWidth: extOpen ? 3.4 : 2.6,
        fillColor: grad(T.violet, extOpen ? 0.22 : 0.32),
        zIndex: 3,
        marker: { symbol: "circle", radius: 3 },
      },
    ];

    if (extOpen) {
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
      fillColor: grad(T.teal, intOpen ? 0.34 : 0.16),
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
      chart: { backgroundColor: "transparent", height: 340, style: { fontFamily: "inherit" }, spacing: [10, 4, 6, 0] },
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
        symbolRadius: 3, align: "left", margin: 18,
      },
      tooltip: {
        shared: true, backgroundColor: T.solid, borderColor: T.borderHi, borderRadius: 12,
        shadow: false, style: { color: T.text, fontSize: "12px" }, valueSuffix: " ч",
      },
      plotOptions: {
        series: { animation: { duration: 800 }, states: { hover: { lineWidthPlus: 1 }, inactive: { opacity: 0.35 } } },
        areaspline: { threshold: null },
      },
      series,
    };
  }, [T, P, open]);

  return <HighchartsReact highcharts={Highcharts} options={options} updateArgs={[true, true, true]} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   12. МОДАЛЬНОЕ ОКНО «АРГУМЕНТАЦИЯ ДЛЯ РУКОВОДСТВА»
   ═══════════════════════════════════════════════════════════════════════════ */

function CaseModal({ T, onClose }) {
  const loadAfter = Math.round((METRICS.demandWeek / (METRICS.requiredStaff * HOURS_PER_STAFF)) * 100);
  const args = [
    { icon: Layers, color: T.violet, title: "Объём не соответствует ресурсу",
      text: `${TASKS.length} направлений требуют ${METRICS.demandWeek} нормо-часов в неделю. Физическая ёмкость ${STAFF} специалистов — ${METRICS.capacityWeek} часов. Дефицит ${METRICS.deficitHours} часов еженедельно.` },
    { icon: ShieldAlert, color: T.red, title: `Внешний контур закрыт на ${METRICS.extCoverage}%`,
      text: `Текущие ${STAFF} сотрудника покрывают только ${METRICS.extCoverage}% обязательного внешнего контура — границы, на которой риск должен останавливаться до входа на территорию.` },
    { icon: Route, color: T.cyan, title: `${TRIPS_TOTAL} перемещений в сутки внутри контура`,
      text: `Склад, инкубатор, АТЦ и бройлерные площадки связаны ${ROUTES.length} постоянными маршрутами. Каждый рейс — пересечение зон, которое должно сопровождаться контролем. Двое из офиса физически не успевают.` },
    { icon: UserPlus, color: T.teal, title: `Требуется +${METRICS.gap} штатные единицы`,
      text: `Расширение штата до ${METRICS.requiredStaff} человек снижает загрузку до ~${loadAfter}% и исключает системные сбои — с запасом на отпуска и больничные.` },
  ];

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0"
                  style={{ background: "rgba(6,12,26,0.5)", backdropFilter: "blur(10px)" }}
                  onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative max-h-[88vh] w-full max-w-[720px] overflow-y-auto rounded-3xl p-7 backdrop-blur-2xl"
        style={{ background: T.solid, border: `1px solid ${T.borderHi}`, boxShadow: T.shadow }}
      >
        <button onClick={onClose}
                className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-lg"
                style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}>
          <X size={15} />
        </button>

        <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em]" style={{ color: T.faint }}>
          <PulseDot color={T.red} size={7} /> обоснование расширения штата
        </div>
        <h2 className="mt-2.5 text-[24px] font-semibold leading-tight" style={{ color: T.text }}>
          Аргументация для руководства
        </h2>

        <div className="mt-5 rounded-2xl p-5"
             style={{ background: `linear-gradient(135deg, ${T.glowC}, ${T.glowB})`, border: `1px solid ${T.red}44` }}>
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
              <motion.div className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${T.amber}, ${T.red})` }}
                          initial={{ width: 0 }} animate={{ width: `${METRICS.extCoverage}%` }}
                          transition={{ delay: 0.25, duration: 1, ease: EASE }} />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {args.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div key={a.title}
                          initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.12 + i * 0.09, duration: 0.45, ease: EASE }}
                          className="flex gap-3.5 rounded-2xl p-4"
                          style={{ background: T.panel, border: `1px solid ${T.border}` }}>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                     style={{ background: `${a.color}1f`, color: a.color }}>
                  <Icon size={17} />
                </div>
                <div>
                  <div className="text-[13.5px] font-semibold" style={{ color: T.text }}>
                    {String(i + 1).padStart(2, "0")} · {a.title}
                  </div>
                  <div className="mt-1 text-[12.5px] leading-relaxed" style={{ color: T.muted }}>{a.text}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                         className="flex items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold text-white"
                         style={{ background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`, boxShadow: `0 18px 36px -16px ${T.glowA}` }}>
            <Check size={15} /> Согласовать +{METRICS.gap} ставки
          </motion.button>
          <button onClick={onClose} className="rounded-xl px-5 py-3 text-[13px] font-medium"
                  style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}>
            Вернуться к дашборду
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   13. ГЛАВНЫЙ КОМПОНЕНТ
   ═══════════════════════════════════════════════════════════════════════════ */

export default function BiosecurityExecutiveDashboard() {
  const [theme, setTheme] = useState("light");
  const [period, setPeriod] = useState("week");
  const [open, setOpen] = useState("external");   // 'external' | 'internal' | null
  const [showCase, setShowCase] = useState(false);
  const T = THEMES[theme];

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setShowCase(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const P = PERIODS[period];
  const demand = Math.round(METRICS.demandWeek * P.k);
  const capacity = Math.round(METRICS.capacityWeek * P.k);
  const loadAfter = Math.round((METRICS.demandWeek / (METRICS.requiredStaff * HOURS_PER_STAFF)) * 100);

  const stats = [
    { label: "Загрузка сотрудников", value: METRICS.load, suffix: "%", color: T.red, progress: 100, icon: Gauge,
      note: `при норме 100% — переработка ${METRICS.load - 100} п.п.` },
    { label: "Покрытие внешнего контура", value: METRICS.extCoverage, suffix: "%", color: T.amber, progress: METRICS.extCoverage, icon: ShieldCheck,
      note: `${EXTERNAL.length} направлений на границе территории` },
    { label: `Объём задач · ${P.label.toLowerCase()}`, value: demand, suffix: "ч", color: T.violet, progress: 100, icon: Activity,
      note: `ёмкость ${STAFF} сотрудников — ${capacity} ч` },
    { label: "Дефицит штата", value: METRICS.gap, prefix: "+", suffix: "ед.", color: T.teal, progress: (METRICS.gap / METRICS.requiredStaff) * 100, icon: UserPlus,
      note: `требуется ${METRICS.requiredStaff} специалиста вместо ${STAFF}` },
  ];

  return (
    <div className="relative min-h-screen w-full" style={{ color: T.text }}>
      <PremiumBackground T={T} />

      <div className="relative mx-auto max-w-[1280px] px-4 py-8 sm:px-7 sm:py-10">
        <Header T={T} period={period} setPeriod={setPeriod} theme={theme} setTheme={setTheme}
                onOpenCase={() => setShowCase(true)} />

        <div className="mt-7 flex flex-wrap gap-4">
          {stats.map((s, i) => <StatCard key={s.label} T={T} item={s} index={i} />)}
        </div>

        {/* ── ДВА КОНТУРА ─────────────────────────────────────────────── */}
        <div className="mt-5">
          <Panel T={T}>
            <SectionHead
              T={T}
              eyebrow="Ядро модели"
              title="Два контура защиты — нажмите, чтобы раскрыть состав"
              right={
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11.5px]"
                     style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}>
                  <ArrowRight size={13} color={T.violet} />
                  {open ? `открыт: ${CONTOURS[open].title.toLowerCase()}` : "оба контура свёрнуты"}
                </div>
              }
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <ContourCard T={T} contour="external" side="left"
                           active={open === "external"}
                           onClick={() => setOpen(open === "external" ? null : "external")} />
              <ContourCard T={T} contour="internal" side="right"
                           active={open === "internal"}
                           onClick={() => setOpen(open === "internal" ? null : "internal")} />
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {open && <ContourTaskList key={open} T={T} contour={open} />}
            </AnimatePresence>
          </Panel>
        </div>

        {/* ── НАГРУЗКА САДИТСЯ НА ДВОИХ ───────────────────────────────── */}
        <div className="mt-5">
          <Panel T={T}>
            <SectionHead T={T} eyebrow="Куда всё это приходит"
                         title={`Весь объём обоих контуров садится на ${STAFF} сотрудников`} />
            <WorkloadStage T={T} />
          </Panel>
        </div>

        {/* ── КАРТА ПЕРЕМЕЩЕНИЙ ───────────────────────────────────────── */}
        <div className="mt-5">
          <Panel T={T}>
            <SectionHead
              T={T}
              eyebrow="Внутренний контур · логистика"
              title="Перемещения между зонами — и два человека, которые должны быть везде"
              right={
                <div className="flex flex-wrap gap-2">
                  {[
                    { l: "маршрутов", v: ROUTES.length, c: T.cyan, i: Route },
                    { l: "рейсов в сутки", v: TRIPS_TOTAL, c: T.violet, i: Truck },
                    { l: "точек контроля", v: 4, c: T.red, i: MapPin },
                  ].map((x) => {
                    const Icon = x.i;
                    return (
                      <div key={x.l} className="flex items-center gap-2 rounded-xl px-3 py-2"
                           style={{ background: T.panel, border: `1px solid ${T.border}` }}>
                        <Icon size={13} color={x.c} />
                        <span className="text-[15px] font-semibold" style={{ color: x.c }}>{x.v}</span>
                        <span className="text-[11px]" style={{ color: T.faint }}>{x.l}</span>
                      </div>
                    );
                  })}
                </div>
              }
            />
            <div className="overflow-x-auto">
              <LogisticsMap T={T} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { t: "Что происходит", d: `${TRIPS_TOTAL} перемещений в сутки между складом, инкубатором, АТЦ и площадками.`, c: T.cyan, i: Truck },
                { t: "Где должен быть специалист", d: "На каждой точке погрузки и выгрузки: контроль обработки техники, тары и маршрута.", c: T.amber, i: MapPin },
                { t: "Где он на самом деле", d: `В офисе: согласование и отчётность — ${TASKS.find((t) => t.id === "coord").hours + TASKS.find((t) => t.id === "report").hours} ч в неделю непрерывного входящего потока.`, c: T.red, i: Building2 },
              ].map((x, i) => {
                const Icon = x.i;
                return (
                  <motion.div key={x.t}
                              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }} transition={{ delay: 0.06 * i, duration: 0.45, ease: EASE }}
                              className="rounded-2xl p-4"
                              style={{ background: T.panel, border: `1px solid ${T.border}` }}>
                    <div className="flex items-center gap-2">
                      <Icon size={15} color={x.c} />
                      <span className="text-[12.5px] font-semibold" style={{ color: T.text }}>{x.t}</span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: T.muted }}>{x.d}</p>
                  </motion.div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* ── АНАЛИТИКА ───────────────────────────────────────────────── */}
        <div className="mt-5">
          <Panel T={T}>
            <SectionHead
              T={T}
              eyebrow="Аналитика нагрузки"
              title={`Входящий объём против физической ёмкости · ${P.label.toLowerCase()}`}
              right={
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11.5px]"
                     style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}>
                  <ArrowRight size={13} color={T.violet} />
                  {open === "external"
                    ? "режим: внешний контур — разбивка объёма по группам"
                    : open === "internal"
                    ? "режим: ресурс — перегрузка сверх ёмкости"
                    : "выберите контур выше, чтобы график перестроился"}
                </div>
              }
            />
            <ChartPanel T={T} period={period} open={open} />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { l: "Пиковая перегрузка", v: `${Math.max(...P.demand.map((d, i) => (P.capacity[i] ? Math.round((d / P.capacity[i]) * 100) : 0)))}%`, c: T.red },
                { l: "Недоработано за период", v: `${Math.round(METRICS.deficitHours * P.k)} ч`, c: T.amber },
                { l: `Загрузка после +${METRICS.gap} ставок`, v: `${loadAfter}%`, c: T.teal },
              ].map((x, i) => (
                <motion.div key={x.l}
                            initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.5 }}
                            className="flex items-center justify-between rounded-xl px-4 py-3"
                            style={{ background: T.panel, border: `1px solid ${T.border}` }}>
                  <span className="text-[12px]" style={{ color: T.muted }}>{x.l}</span>
                  <span className="text-[17px] font-semibold" style={{ color: x.c }}>{x.v}</span>
                </motion.div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[11px]" style={{ color: T.faint }}>
          <span>
            Расчёт по {TASKS.length} направлениям · норма {HOURS_PER_STAFF} ч/нед на специалиста ·
            все показатели вычисляются из единой таблицы задач
          </span>
          <span className="font-mono">Отдел биобезопасности · v6.0</span>
        </div>
      </div>

      <AnimatePresence>
        {showCase && <CaseModal T={T} onClose={() => setShowCase(false)} />}
      </AnimatePresence>
    </div>
  );
}
