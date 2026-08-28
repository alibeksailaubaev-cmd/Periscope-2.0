import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence, useTime, useTransform } from "framer-motion";
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
const HF_BG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABYPERMRDhYTEhMZFxYaITckIR4eIUQwMyg3UEZUU09GTUxYY39sWF54X0xNbpZweIOHjpCOVmqcp5uKpn+Ljon/2wBDARcZGSEdIUEkJEGJW01biYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYn/wgARCAE5AjADASIAAhEBAxEB/8QAGAABAQEBAQAAAAAAAAAAAAAAAAECAwX/xAAWAQEBAQAAAAAAAAAAAAAAAAAAAQL/2gAMAwEAAhADEAAAAfQsosqLKBZBQAACURRFgCxQEoQApKAEKACygWCgAAAAACWAASgQGEupUtlSoAFAgoCixFlRRFiygEoQAEFLKQAKABYoAAAAAAJYBAKIAc0u81KVLZUFAKgsSiikAlLAAoQlEUBAKLEoAC2AAAAAAAAIAQIoAhzG81LVSlSososopCgCgRYAAoQBFRKAKEAKIAFAAAAAACAAkoAgBzG4sqBVCWyihRFCgAAJUsURRFgWQAKsUBIFAAAAAAAAIASwAgABzG4soFlBbKUFELBUFAEoAAAQAAAAAAAAAAAAEogFAQQgAEGBuUAqC0oURUoABUsoAAAQAAAAAAAAAAAEAAsFAJYCAQgAYpqAKUqgoAoBACygAAQAoJRFEURQAABAABAALBQACAlgIBAhBqKCyigoALKAACgQAKSgAAAAAAABAAAAqAAAlEBAQAgESlAlKCgUKBAACygAACygAAAAAAACWAACWKACAJYASWAi2AABQKIoAUAAAoAAABQAAAAAAAAJYAAJYAAAICWCWUgBKBQCgoAogKAKSiAAAKAAAAAAAAAAEABBQAAEAgQgAASy0sC0AKAAFAIEBQBQEAAAABQAAACWAUAlgAFBEFQggABCUaGaoCgILUoAAACgAAAQAIVKBQAAAgFAAAJVQAJFiyWWQASgBGqZoFAKgUAAKSgAAAAAJAAAUAsFgABQAAAWARYJYSWVAABCWL0GKoCoFAAFAAAAAAAkAAAoIFAABQAAAIAAllJYkllARYoCWR0pigKAUAoAAAAAAIQACgAEFRVQgAVUFRZQBFSkAhZARZSURYRSwR0GKBQBSygAAAABAAEAoCAAAFCFQlRVRVCLBQBBFgECBQSxRJSyUbGKsoAFLKAAAAAQAQCgIAABAFABYAFAlSgIQVBYAIoAqVLFhFi6GaogUBQAAAAJYABAi2AAAlgAFCAWALFVFlShCVBUoALIChAKlglkv//EABQQAQAAAAAAAAAAAAAAAAAAALD/2gAIAQEAAQUCLw//xAAUEQEAAAAAAAAAAAAAAAAAAACQ/9oACAEDAQE/AS8//8QAFBEBAAAAAAAAAAAAAAAAAAAAkP/aAAgBAgEBPwEvP//EABQQAQAAAAAAAAAAAAAAAAAAALD/2gAIAQEABj8CLw//xAAUEAEAAAAAAAAAAAAAAAAAAACw/9oACAEBAAE/IS8P/9oADAMBAAIAAwAAABCiuoGgIY56Ic7EQ/2IB6JapXkEV330FX36Lxpln6AfkwoTka0ws1/CJ7ob2EF3330lX+IShlpkwJlubm1q8w53E8zqIbkEV3333mF3sbgRNlpuqyaEQDQ0wIHOEA56MMX33330EXkbobgatZePV0DAAFLLDTf3jAM3333332EF2LoboBSpVYpRK00EIYwwoMEE333333330IbwCp4IzwDtnVcvH0oJTz77/wB99999999/jC8gUkqewjekwYUgC+qAU++iRxxxBBB99/7C84AcQE6HdhOmi+qA84CW6jDBBBBBBB995Ac8oQoo4E+ifbbV5D//AKw//aQQQQQQQQVfYVPPY16/xnKPBJ4/wx/+QVffQQQQQQQQQVfQV/4w310XeghOGFIQHOIXffYQQQQQQQQQgvw/fYQeWLvwSumBOBHMAX/fcQwwwwwQQQglvAFvrAqLHoA0Xouh+YQXfeQQQQwxywQQQhvPLikPKYsfSgApnhuwTfeYQQQQQR//AP321/7z76oEHUML70NR6LsF33EEEEEEEf8A/wCs8cc4Astv/wC5QN8PYleN+NX2EIIAEEF//oAI4w3/AMONB3K6ZqmSl4LH/D9pCCCCBN9/+gc+6AEPOMTlQyNivFO7YZ/rH9pCCCCB97iCc+iO8yxCA3Kz+Oe/jNSHk+jV9BCCCCV9DGe4CW+gG9+sNINMIU7U/wDld//EABQRAQAAAAAAAAAAAAAAAAAAAJD/2gAIAQMBAT8QLz//xAAZEQABBQAAAAAAAAAAAAAAAAABETBQcID/2gAIAQIBAT8QcO2UghWv/8QAHBABAQEBAAMBAQAAAAAAAAAAAQARYBAwUCBA/9oACAEBAAE/EPBxB7csss4PLLLLPxnzd/gyyz9Z9Af68+UeC23h94ciIiOBIiI4IiIiOBIiI4IiIjgiI4MiOEI4QiPrvtI+w+wj7L7D7TPrPtM+s+w+GfYfZZ4RnhWeDZmeEZng2Z4RmeDZmeCZmZ4JmZngmZmeBZ8P4zgH95ZwmWWWeM4PPs7b7ss+rtvjfc/T223+FnhXx//Z";



/* ═══════════════════════════════════════════════════════════════════════════
   1. ДИЗАЙН-ТОКЕНЫ — светлая премиальная тема по умолчанию + тёмная
   ═══════════════════════════════════════════════════════════════════════════ */

const THEMES = {
  light: {
    key: "light",
    /* фирменная палитра: песочный фон, бирюзовый акцент, графитовый текст */
    bg: "#e7dec4",
    text: "#221f18",
    muted: "#575146",
    faint: "#837c6b",
    panel: "linear-gradient(180deg, rgba(0,163,163,0.075), rgba(0,163,163,0.015)), #fbfdfb",
    panelHi: "linear-gradient(180deg, rgba(0,163,163,0.12), rgba(0,163,163,0.03)), #fbfdfb",
    solid: "#fbfdfb",
    border: "rgba(0,118,117,0.24)",
    borderHi: "rgba(0,118,117,0.42)",
    grid: "rgba(60,52,30,0.10)",
    blue: "#1f6f87",
    violet: "#7c4f86",
    cyan: "#00a3a3",
    red: "#b23a2c",
    amber: "#b0741a",
    teal: "#00908f",
    shadow: "0 1px 2px rgba(60,50,25,0.06), 0 16px 34px -22px rgba(60,50,25,0.45)",
    glowA: "rgba(0,163,163,0.22)",
    glowB: "rgba(124,79,134,0.18)",
    glowC: "rgba(178,58,44,0.18)",
    bgImageOpacity: 0.22,
    bgWash: "rgba(231,222,196,0.88)",
    blobs: [
      "radial-gradient(closest-side, rgba(0,163,163,0.20), transparent)",
      "radial-gradient(closest-side, rgba(176,116,26,0.16), transparent)",
      "radial-gradient(closest-side, rgba(0,144,143,0.14), transparent)",
      "radial-gradient(closest-side, rgba(178,58,44,0.10), transparent)",
    ],
    surface: "#fdfbf5",
    ground: "#ddd3b6",
  },
  dark: {
    key: "dark",
    bg: "#05070f",
    text: "#e9eefb",
    muted: "#a3aec8",
    faint: "#7b8aa6",
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

/* hours — нормативная трудоёмкость направления, нормо-часов в неделю (амортизировано
   для квартальных и месячных работ); cov — фактический охват в процентах (данные службы). */
const TASKS = [
  // ── ВНЕШНИЙ КОНТУР (14 процессов, схема процессов и подпроцессов службы) ──
  { id: "ext_appr", name: "Согласование документов по заявкам посещений/въезда", icon: FileText, group: "reg", contour: "external", hours: 8.0, cov: 100, freq: "непрерывно", note: "Заявки на посещение и въезд: документы, маршрут, инструктаж",
    sub: ["Ознакомление с заявкой", "Проверка документов, региона отправки и т.д.", "Определение маршрута в рамках предприятия", "Проведение инструктажей, выдача СИЗ и регистрация в журнале"] },
  { id: "ext_docs", name: "Разработка и актуализация документов по требованиям ББ и БЗ", icon: FileText, group: "reg", contour: "external", hours: 4.5, cov: 0, freq: "проект", note: "Нормирующие документы службы: от потребности до контроля исполнения", isNew: true,
    sub: ["Определение потребности в нормирующем документе согласно законодательным требованиям", "Разработка / актуализация", "Согласование и утверждение документа", "Внедрение и доведение до сотрудников", "Контроль исполнения"] },
  { id: "ext_contract", name: "Контроль исполнения договоров на предмет ББ", icon: BadgeCheck, group: "reg", contour: "external", hours: 3.0, cov: 0, freq: "ежеквартально", note: "Анализ договоров на соответствие требованиям биобезопасности", isNew: true,
    sub: ["Планирование и запрос договоров", "Проведение анализа и изучение договоров на соответствие ББ", "Фиксация результатов контроля", "Оценка соответствия требованиям", "Принятие решений и корректирующие действия"] },
  { id: "ext_vnd", name: "Создание/актуализация ВНД, требования к сырью и ТМЦ", icon: FileText, group: "reg", contour: "external", hours: 4.5, cov: 0, freq: "проект", note: "Внутренние нормативные документы по сырью и ТМЦ", isNew: true,
    sub: ["Сбор и анализ информации", "Разработка/актуализация ВНД и требований", "Согласование и утверждение документов", "Внедрение и обучение сотрудников", "Мониторинг и актуализация требований"] },
  { id: "ext_entry", name: "Входной контроль людей/транспорт, сырьё и ТМЦ", icon: DoorOpen, group: "daily", contour: "external", hours: 22.0, cov: 60, freq: "ежедневно", note: "Санпропускник, проходная, контроль въезда и входящих партий",
    sub: ["Идентификация посетителей/транспорта", "Проверка документов и санитарного состояния", "Контроль сырья и ТМЦ", "Допуск/отказ входа", "Регистрация и архивирование данных"] },
  { id: "ext_pest", name: "Внешний пест-контроль", icon: Bug, group: "daily", contour: "external", hours: 3.0, cov: 80, freq: "еженедельно", note: "Барьер по периметру: грызуны, синантропная птица, насекомые",
    sub: ["Планирование пест-контроля", "Подбор подрядчика и заключение договора", "Проведение обработок", "Контроль эффективности", "Отчётность и корректирующие действия"] },
  { id: "ext_audit", name: "Аудит внешних направлений", icon: ClipboardCheck, group: "crit", contour: "external", hours: 11.0, cov: 28.57, freq: "ежеквартально", note: "Проверка внешних направлений на соответствие требованиям ББ",
    sub: ["Планирование аудита", "Проведение аудита", "Оформление отчёта", "Разработка корректирующих мероприятий", "Контроль исполнения мероприятий"] },
  { id: "ext_lph", name: "ЛПХ сотрудников", icon: Home, group: "crit", contour: "external", hours: 5.5, cov: 30, freq: "ежемесячно", note: "Личные подсобные хозяйства — риск заноса возбудителя извне",
    sub: ["Планирование ЛПХ", "Проведение проверок сотрудников", "Фиксация и анализ результатов", "Обучение и информирование", "Повторные проверки и контроль"] },
  { id: "ext_epi", name: "Эпизоотическая ситуация в регионе, области, мире", icon: Siren, group: "crit", contour: "external", hours: 3.0, cov: 80, freq: "мониторинг", note: "Мониторинг обстановки и усиление режима на внешней границе",
    sub: ["Сбор информации из источников", "Анализ и оценка рисков", "Информирование руководства и сотрудников", "Введение/корректировка мероприятий", "Мониторинг и отчётность"] },
  { id: "ext_wash_req", name: "Санитарная обработка — требования", icon: Droplets, group: "reg", contour: "external", hours: 3.0, cov: 0, freq: "проект", note: "Требования к санобработке транспорта и контроль их исполнения", isNew: true,
    sub: ["Разработка требований к санобработке транспорта", "Планирование и контроль санобработки", "Контроль проведения санобработки", "Контроль качества санобработки", "Документирование и отчётность"] },
  { id: "ext_wash", name: "Санитарная обработка внешнего транспорта", icon: Droplets, group: "crit", contour: "external", hours: 7.0, cov: 0, freq: "ежедневно", note: "Обработка внешнего транспорта: площадки, средства МДС, качество", isNew: true,
    sub: ["Планирование обработки", "Контроль подготовки площадок и средств МДС", "Контроль проведения обработки", "Контроль качества обработки", "Регистрация и хранение данных"] },
  { id: "ext_gov", name: "Работа с местными исполнительными органами и ветслужбами", icon: Building2, group: "reg", contour: "external", hours: 3.0, cov: 0, freq: "по событию", note: "Взаимодействие с госорганами и ветеринарными службами региона", isNew: true,
    sub: ["Мониторинг и соблюдение региональных требований", "Оперативное информирование об эпизоотической обстановке", "Согласование противоэпизоотических планов", "Участие в совместных проверках", "Ведение официальной отчётности"] },
  { id: "ext_intl", name: "Сотрудничество с международными компаниями по ББ и БЗ", icon: Users, group: "reg", contour: "external", hours: 3.0, cov: 0, freq: "по событию", note: "Международные практики, партнёрства и совместные аудиты", isNew: true,
    sub: ["Анализ передовых международных практик", "Заключение соглашений о партнёрстве", "Организация совместных аудитов и экспертных оценок", "Внедрение мировых стандартов", "Оценка эффективности сотрудничества"] },
  { id: "ext_edu", name: "Внешнее обучение территориальных органов власти и КХ", icon: GraduationCap, group: "reg", contour: "external", hours: 3.0, cov: 0, freq: "по плану", note: "Обучение стейкхолдеров нормам биобезопасности", isNew: true,
    sub: ["Определение потребностей в обучении стейкхолдеров", "Разработка учебных программ ББ", "Проведение семинаров и тренингов", "Оценка усвоения знаний", "Выдача рекомендаций и методических материалов"] },

  // ── ВНУТРЕННИЙ КОНТУР (14 направлений) ───────────────────────────────────
  { id: "int_rep",     name: "Отчётность",                             icon: FileText,       group: "reg",   contour: "internal", hours: 6.5, cov: 100,   freq: "ежедневно",     note: "Журналы, сводки, обязательная документация службы" },
  { id: "int_train",   name: "Обучение персонала",                     icon: GraduationCap,  group: "reg",   contour: "internal", hours: 4.5, cov: 60,    freq: "ежемесячно",    note: "Очное обучение нормам биобезопасности и санитарии" },
  { id: "int_brief",   name: "Инструктажи",                            icon: Megaphone,      group: "reg",   contour: "internal", hours: 3.0, cov: 100,   freq: "еженедельно",   note: "Инструктажи на местах по цехам и участкам" },
  { id: "int_verify",  name: "Верификация мойки и дезинфекции",        icon: BadgeCheck,     group: "daily", contour: "internal", hours: 6.5, cov: 100,   freq: "ежедневно",     note: "Контроль качества обработки оборудования и помещений" },
  { id: "int_lab",     name: "Анализ лабораторных данных",             icon: FlaskConical,   group: "reg",   contour: "internal", hours: 3.5, cov: 100,   freq: "еженедельно",   note: "Смывы, пробы, интерпретация протоколов лаборатории" },
  { id: "int_mids",    name: "Учёт МиДС",                              icon: Droplets,       group: "daily", contour: "internal", hours: 3.5, cov: 85,    freq: "еженедельно",   note: "Моющие и дезинфицирующие средства: остатки, расход, сроки" },
  { id: "int_husk",    name: "Склад лузги",                            icon: Layers,         group: "daily", contour: "internal", hours: 2.0, cov: 100,   freq: "еженедельно",   note: "Требования ББ и санитарии к зоне хранения подстилки" },
  { id: "int_atc",     name: "АТЦ — автотранспортный цех",             icon: Car,            group: "crit",  contour: "internal", hours: 5.5, cov: 60,    freq: "еженедельно",   note: "Санитарное состояние техники и помещений цеха" },
  { id: "int_barrier", name: "Внутренние дезбарьеры",                  icon: ShieldCheck,    group: "daily", contour: "internal", hours: 9.0, cov: 50,    freq: "ежедневно",     note: "Концентрации, чистота, графики очистки и замены растворов" },
  { id: "int_bio",     name: "Биоотходы и перевозка падежа",           icon: Siren,          group: "crit",  contour: "internal", hours: 3.0, cov: 100,   freq: "ежедневно",     note: "Обращение с биологическими отходами, требования к перевозке" },
  { id: "int_audit",   name: "Аудиты внутренних площадок",             icon: ClipboardCheck, group: "crit",  contour: "internal", hours: 11.0, cov: 30,    freq: "ежемесячно",    note: "Плановые проверки площадок на требования ББ и санитарии" },
  { id: "int_manure",  name: "Пометохранилище",                        icon: Warehouse,      group: "daily", contour: "internal", hours: 2.0, cov: 100,   freq: "еженедельно",   note: "Требования ББ и санитарии к зоне накопления помёта" },
  { id: "int_epi",     name: "Контроль ситуации внутри объекта",       icon: Radar,          group: "crit",  contour: "internal", hours: 3.0, cov: 100,   freq: "мониторинг",    note: "Контроль благополучия по заболеваниям внутри контура" },
  { id: "int_vnd",     name: "ВНД: внутренние требования ББ",          icon: FileText,       group: "reg",   contour: "internal", hours: 4.5, cov: 0,     freq: "проект",        note: "Разработка внутреннего нормативного документа", isNew: true },
];

// фактически закрываемый объём в нормо-часах выводится из процента охвата
TASKS.forEach((t) => { t.covered = Math.round(t.hours * t.cov) / 100; });

const STAFF = 2;               // действующий штат службы
const HOURS_PER_STAFF = 40;    // нормо-часов в неделю на одного специалиста

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
    uncovered: TASKS.filter((t) => t.cov === 0).length,
    weakSpots: TASKS.filter((t) => t.cov <= 50).length,
    newTasks: TASKS.filter((t) => t.isNew).length,
    coverage: Math.round((sum(TASKS, (t) => t.covered) / sum(TASKS, (t) => t.hours)) * 100),
    coveredNow: Math.round(sum(TASKS, (t) => t.covered) * 10) / 10,
    critWeak: TASKS.filter((t) => t.group === "crit" && t.covered / t.hours < 0.5).length,
  };
})();

const CONTOURS = {
  external: {
    id: "external",
    title: "Внешний контур",
    sub: "",
    items: EXTERNAL,
    demand: METRICS.extDemand,
    covered: METRICS.extCovered,
    coverage: METRICS.extCoverage,
    icon: ShieldCheck,
  },
  internal: {
    id: "internal",
    title: "Внутренний контур",
    sub: "",
    items: INTERNAL,
    demand: METRICS.intDemand,
    covered: METRICS.intCovered,
    coverage: METRICS.intCoverage,
    icon: Building2,
  },
};

/* Периоды: день = неделя / 5 рабочих дней, месяц = неделя × 4.2 (21 рабочий день) */
const PERIODS = {
  day:   { id: "day",   label: "День",   k: 1 / 5, unit: "часов работы",
           categories: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
           demand: [2.6, 4.0, 4.4, 3.1, 2.3, 4.2, 4.6, 3.4],
           capacity: [2, 2, 2, 2, 2, 2, 2, 2] },
  week:  { id: "week",  label: "Неделя", k: 1, unit: "часов работы",
           categories: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
           demand: [28, 30, 26, 29, 27, 2, 1],
           capacity: [16, 16, 16, 16, 16, 0, 0] },
  month: { id: "month", label: "Месяц",  k: 4.2, unit: "часов работы",
           categories: ["Неделя 1", "Неделя 2", "Неделя 3", "Неделя 4", "Неделя 5"],
           demand: [147, 153, 140, 150, 11],
           capacity: [80, 80, 80, 80, 16] },
};

/* Карта внутреннего контура: объекты и маршруты перемещений */
const SITES = {
  warehouse: { id: "warehouse", name: "Склад",                 sub: "корма, подстилка, ТМЦ", x: 185, y: 285, w: 170, h: 104, icon: Warehouse },
  atc:       { id: "atc",       name: "АТЦ",                   sub: "транспортный цех",  x: 300, y: 470, w: 150, h: 80,  icon: Car },
  incubator: { id: "incubator", name: "Инкубатор",             sub: "МиДС, запчасти, ТМЦ",     x: 562, y: 132, w: 186, h: 92,  icon: Egg },
  broiler:   { id: "broiler",   name: "Бройлерные площадки",   sub: "",                      x: 825, y: 300, w: 200, h: 240, icon: Bird },
  office:    { id: "office",    name: "Офис",                  sub: `${STAFF} специалиста`, x: 560, y: 458, w: 280, h: 92, icon: Building2 },
};

const ROUTES = [
  { id: "r1", from: "warehouse", to: "incubator", label: "Склад → Инкубатор",              cargo: "МиДС, оборудование, ветпрепараты",        trips: 4, d: "M270,255 Q380,190 466,150", dur: 7.5 },
  { id: "r2", from: "warehouse", to: "atc",       label: "Склад → АТЦ",                    cargo: "запчасти и ТМЦ",           trips: 3, d: "M200,337 Q214,398 280,432", dur: 5.5 },
  { id: "r3", from: "warehouse", to: "broiler",   label: "Склад → Бройлерные площадки",    cargo: "корма, подстилка, инвентарь", trips: 6, d: "M270,305 Q500,345 725,300", dur: 9 },
  { id: "r4", from: "incubator", to: "broiler",   label: "Инкубатор → Бройлерные площадки", cargo: "суточный молодняк",       trips: 2, d: "M658,168 Q712,192 738,236", dur: 6 },
  { id: "r5", from: "atc",       to: "incubator", label: "АТЦ → Инкубатор",                cargo: "техника после обслуживания", trips: 2, d: "M330,430 Q392,300 494,178", dur: 8 },
  { id: "r6", from: "atc",       to: "broiler",   label: "АТЦ → Бройлерные площадки",      cargo: "техника и инвентарь",      trips: 3, d: "M375,452 Q560,358 722,386", dur: 8.5 },
  { id: "r7", from: "warehouse", to: "office",    label: "Склад → Офисные помещения",      cargo: "ТМЦ, канцелярия, вода",    trips: 2, d: "M252,335 Q320,415 416,438", dur: 7 },
];
const TRIPS_TOTAL = sum(ROUTES, (r) => r.trips);

/* Точки, где физически нужен специалист, но его нет */
const MARKERS = [
  { id: "warehouse", x: 262, y: 236 },
  { id: "incubator", x: 628, y: 92 },
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

/* Фирменная орнаментальная полоса (только светлая тема, широкие экраны) */
function BrandRail({ T }) {
  if (T.key !== "light") return null;
  const glyphs = [
    // солнце
    <g key="sun"><circle cx="14" cy="14" r="5.5" fill="none" stroke="#fff" strokeWidth="2.2" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <line key={i} x1={14 + Math.cos(a) * 8} y1={14 + Math.sin(a) * 8}
                     x2={14 + Math.cos(a) * 11} y2={14 + Math.sin(a) * 11}
                     stroke="#fff" strokeWidth="2" strokeLinecap="round" />;
      })}</g>,
    // спираль
    <path key="spiral" d="M14 6 A8 8 0 1 1 6 14 A8 8 0 0 1 20 14 A5 5 0 1 1 11 14"
          fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />,
    // тюльпан
    <path key="tulip" d="M14 23 L14 14 M14 14 Q5 12 7 5 Q14 8 14 14 Q14 8 21 5 Q23 12 14 14"
          fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
    // ромб
    <g key="rhomb"><path d="M14 4 L24 14 L14 24 L4 14 Z" fill="none" stroke="#fff" strokeWidth="2.2" />
      <circle cx="14" cy="14" r="3" fill="#fff" /></g>,
    // птица
    <path key="bird" d="M6 18 Q10 10 17 11 L22 7 L20 13 Q22 18 15 20 Z"
          fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />,
    // волна
    <path key="wave" d="M4 14 Q9 6 14 14 Q19 22 24 14"
          fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />,
    // капля
    <path key="drop" d="M14 4 Q22 13 18 19 Q14 24 10 19 Q6 13 14 4 Z"
          fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round" />,
    // круг в круге
    <g key="ring"><circle cx="14" cy="14" r="9" fill="none" stroke="#fff" strokeWidth="2.2" />
      <circle cx="14" cy="14" r="3.5" fill="#fff" /></g>,
  ];
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-10 hidden xl:block">
      {[...glyphs, ...glyphs.slice(0, 6)].map((g, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: EASE }}
          style={{ width: 42, height: 42, background: T.cyan }}
          className="grid place-items-center"
        >
          <svg viewBox="0 0 28 28" width="21" height="21">{g}</svg>
        </motion.div>
      ))}
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
        {eyebrow ? (
          <div className="font-mono text-[13px] uppercase tracking-[0.2em]" style={{ color: T.faint }}>
            {eyebrow}
          </div>
        ) : null}
        <h2 className={`text-[20px] font-semibold ${eyebrow ? "mt-1" : ""}`} style={{ color: T.text }}>{title}</h2>
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

function Header({ T, period, setPeriod, theme, setTheme }) {
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
            background: `linear-gradient(135deg, ${T.cyan}, ${T.teal})`,
            boxShadow: `0 14px 32px -10px ${T.glowA}`,
          }}
        >
          <ShieldAlert size={22} color="#fff" />
        </motion.div>
        <div>
          <div className="mb-1 font-mono text-[13px] uppercase tracking-[0.22em]" style={{ color: T.faint }}>
            Aitas UKPF · Усть-Каменогорская птицефабрика · служба биобезопасности
          </div>
          <h1 className="text-[24px] font-semibold leading-tight tracking-tight sm:text-[30px]" style={{ color: T.text }}>
            Мониторинг биобезопасности и нагрузка персонала
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-2.5 rounded-full px-3.5 py-1.5"
              style={{ background: T.panel, border: `1px solid ${T.border}` }}
            >
              <Users size={13} color={T.muted} />
              <span className="text-[14.5px] font-medium" style={{ color: T.muted }}>
                {TASKS.length} направлений · {STAFF} специалиста · норма {HOURS_PER_STAFF} ч/нед
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex rounded-xl p-1 backdrop-blur-xl" style={{ background: T.panel, border: `1px solid ${T.border}` }}>
          {Object.values(PERIODS).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="relative rounded-lg px-3.5 py-1.5 text-[15px] font-medium transition-colors"
              style={{ color: period === p.id ? "#fff" : T.muted }}
            >
              {period === p.id && (
                <motion.span
                  layoutId="period-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${T.cyan}, ${T.teal})`,
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
        <span className="text-[14.5px]" style={{ color: T.muted }}>{item.label}</span>
      </div>
      <div className="relative mt-3 flex items-baseline gap-1.5">
        <span
          className="text-[38px] font-semibold leading-none tracking-tight"
          style={{ color: item.color, textShadow: T.key === "dark" ? `0 0 26px ${item.color}55` : "none" }}
        >
          {item.prefix || ""}{fmt(v)}
        </span>
        <span className="text-[15.5px] font-medium" style={{ color: T.faint }}>{item.suffix}</span>
      </div>
      <div className="relative mt-2 text-[14px] leading-snug" style={{ color: T.faint }}>{item.note}</div>
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
      <text x="160" y="128" textAnchor="middle" fontSize="13" fill={T.faint}>
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
          <text x={n.x} y={n.y + 22} textAnchor="middle" fontSize="11" fill={T.faint}>{n.label}</text>
        </g>
      ))}
      <text x="160" y="140" textAnchor="middle" fontSize="13" fill={T.faint}>
        перемещения между зонами внутри контура
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
          <div className="text-[18px] font-semibold" style={{ color: T.text }}>{C.title}</div>
          {C.sub ? <div className="text-[14px]" style={{ color: T.faint }}>{C.sub}</div> : null}
        </div>
        <div className="text-right">
          <div className="font-mono text-[13.5px]" style={{ color: T.faint }}>направлений</div>
          <div className="text-[22px] font-semibold leading-none" style={{ color: accent }}>{C.items.length}</div>
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
          <div className="mb-1 flex justify-between font-mono text-[12.5px]" style={{ color: T.faint }}>
            <span>покрытие</span>
            <span>{fmt(C.covered, 1)} из {fmt(C.demand, 1)} ч/нед</span>
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
        <div className="text-[21px] font-semibold" style={{ color: C.coverage < 60 ? T.red : T.amber }}>
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
          <span className="rounded-lg px-2.5 py-1 text-[14.5px] font-semibold" style={{ background: `${accent}1a`, color: accent }}>
            {C.title}
          </span>
          <span className="text-[14.5px]" style={{ color: T.muted }}>
            {C.items.length} направлений контроля
          </span>
        </div>

        <div className="space-y-5">
          {groups.map((g) => {
            const GIcon = g.icon;
            const tone = toneMap[g.tone];
            return (
              <div key={g.id}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <div className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${tone}1f`, color: tone }}>
                    <GIcon size={14} />
                  </div>
                  <span className="text-[15.5px] font-semibold" style={{ color: T.text }}>{g.title}</span>
                  <div className="h-px flex-1" style={{ background: T.border }} />
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {g.items.map((t) => {
                    const Icon = t.icon;
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
                            <div className="text-[15px] font-semibold leading-tight" style={{ color: T.text }}>{t.name}</div>
                            <div className="mt-0.5 text-[13.5px] leading-snug" style={{ color: T.faint }}>{t.note}</div>
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
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. СЦЕНА НАГРУЗКИ: весь объём садится на одного действующего специалиста
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
  const tones = [T.blue, T.cyan, T.violet, T.amber, T.red, T.red];
  return (
    <motion.g
      animate={{ y: [0, -2.5, 0], rotate: [tilt * 0.7, tilt, tilt * 0.7] }}
      transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay }}
      style={{ originX: `${x}px`, originY: `${y + 36}px` }}
    >
      {/* стопка задач, которая давит сверху */}
      <motion.g
        animate={{ y: [0, -2.2, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: delay + 0.4 }}
      >
        {Array.from({ length: stack }).map((_, i) => {
          const w = 38 - i * 1.6;
          return (
            <motion.rect
              key={i}
              x={x - w / 2 + (i % 2 ? 3 : -3)}
              y={y - 50 - i * 8.5}
              width={w}
              height={7}
              rx={3.5}
              fill={tones[i % tones.length]}
              initial={{ opacity: 0, y: -22, scale: 0.86 }}
              animate={{ opacity: 0.88, y: 0, scale: 1 }}
              transition={{ delay: delay + 0.3 + i * 0.12, type: "spring", stiffness: 180, damping: 15 }}
            />
          );
        })}
      </motion.g>

      {/* мягкая тень */}
      <ellipse cx={x} cy={y + 46} rx={26} ry={5.5} fill={T.text} opacity={T.key === "dark" ? 0.30 : 0.09} />

      {/* корпус */}
      <path
        d={`M ${x - 20} ${y + 44}
            L ${x - 18} ${y + 4}
            Q ${x - 17} ${y - 10} ${x} ${y - 12}
            Q ${x + 17} ${y - 10} ${x + 18} ${y + 4}
            L ${x + 20} ${y + 44} Z`}
        fill={T.blue}
        opacity={0.92}
      />
      <path
        d={`M ${x - 20} ${y + 44} L ${x - 18} ${y + 4} Q ${x - 17} ${y - 10} ${x} ${y - 12} Z`}
        fill="#fff"
        opacity={0.16}
      />
      {/* голова */}
      <circle cx={x} cy={y - 26} r={14.5} fill="#eec6a0" />
      <path
        d={`M ${x - 14.5} ${y - 30} Q ${x} ${y - 48} ${x + 14.5} ${y - 30}
            Q ${x + 8} ${y - 40} ${x} ${y - 40} Q ${x - 8} ${y - 40} ${x - 14.5} ${y - 30} Z`}
        fill="#3d3550"
      />
      {/* дыхание давления */}
      <motion.circle
        cx={x} cy={y - 6} r={40} fill="none" stroke={T.red} strokeWidth={1.2}
        initial={{ scale: 0.86, opacity: 0.45 }}
        animate={{ scale: [0.86, 1.28], opacity: [0.45, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut", delay }}
        style={{ originX: `${x}px`, originY: `${y - 6}px` }}
      />
    </motion.g>
  );
}

/* Незакрытая вторая штатная единица — контур человека, которого сейчас нет */
function GhostPerson({ T, x, y }) {
  return (
    <motion.g
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.8, duration: 0.8 }}
    >
      <motion.g
        animate={{ opacity: [0.45, 0.85, 0.45] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d={`M ${x - 20} ${y + 44}
              L ${x - 18} ${y + 4}
              Q ${x - 17} ${y - 10} ${x} ${y - 12}
              Q ${x + 17} ${y - 10} ${x + 18} ${y + 4}
              L ${x + 20} ${y + 44} Z`}
          fill="none" stroke={T.teal} strokeWidth={1.6} strokeDasharray="5 5"
        />
        <circle cx={x} cy={y - 26} r={14.5} fill="none" stroke={T.teal} strokeWidth={1.6} strokeDasharray="5 5" />
      </motion.g>
      <circle cx={x + 16} cy={y - 36} r={10} fill={T.teal} opacity={0.9} />
      <path d={`M ${x + 16} ${y - 41} L ${x + 16} ${y - 31} M ${x + 11} ${y - 36} L ${x + 21} ${y - 36}`}
            stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
    </motion.g>
  );
}

function WorkloadStage({ T }) {
  const n = TASKS.length;
  const toneOf = (t) => (t.group === "crit" ? T.red : t.group === "daily" ? T.cyan : T.blue);
  const FLOW = 4.6;            // длительность полёта одной задачи
  const step = FLOW / n;       // равномерный, непрерывный поток

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="mx-auto block w-full" style={{ maxWidth: 820 }}>
        <defs>
          <radialGradient id="ws-glass" cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor={T.key === "dark" ? "#1a2237" : "#ffffff"} stopOpacity={T.key === "dark" ? 0.55 : 0.96} />
            <stop offset="100%" stopColor={T.key === "dark" ? "#0d1424" : "#f2f6ff"} stopOpacity={T.key === "dark" ? 0.25 : 0.86} />
          </radialGradient>
          <radialGradient id="ws-aura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={T.red} stopOpacity={T.key === "dark" ? 0.28 : 0.16} />
            <stop offset="100%" stopColor={T.red} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ws-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={T.blue} />
            <stop offset="50%" stopColor={T.violet} />
            <stop offset="100%" stopColor={T.cyan} />
          </linearGradient>
          <linearGradient id="ws-meter" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={T.teal} />
            <stop offset="100%" stopColor={T.red} />
          </linearGradient>
        </defs>

        {/* декоративные орбиты */}
        <motion.circle
          cx={CC.x} cy={CC.y} r={R_RING} fill="none" stroke="url(#ws-ring)"
          strokeWidth={1.2} strokeDasharray="2 12" opacity={0.55}
          animate={{ rotate: 360 }}
          transition={{ duration: 220, repeat: Infinity, ease: "linear" }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
        />
        <motion.circle
          cx={CC.x} cy={CC.y} r={R_RING - 26} fill="none" stroke="url(#ws-ring)"
          strokeWidth={0.9} strokeDasharray="1 16" opacity={0.4}
          animate={{ rotate: -360 }}
          transition={{ duration: 300, repeat: Infinity, ease: "linear" }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
        />

        {/* вращающийся поток задач */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 260, repeat: Infinity, ease: "linear" }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
        >
          {TASKS.map((t, i) => {
            const p = nodePos(i, n);
            return (
              <line key={`l-${t.id}`} x1={p.x} y1={p.y} x2={CC.x} y2={CC.y}
                    stroke={toneOf(t)} strokeWidth={0.7} strokeDasharray="2 8" opacity={0.16} />
            );
          })}

          {TASKS.map((t, i) => {
            const p = nodePos(i, n);
            const c = toneOf(t);
            return (
              <motion.g
                key={t.id}
                initial={{ opacity: 0, scale: 0.3 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.028, type: "spring", stiffness: 190, damping: 17 }}
              >
                <motion.circle
                  cx={p.x} cy={p.y} r={16} fill={c} opacity={0.10}
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.17 }}
                  style={{ originX: `${p.x}px`, originY: `${p.y}px` }}
                />
                <circle cx={p.x} cy={p.y} r={8.5} fill={T.surface} opacity={0.9} />
                <motion.circle
                  cx={p.x} cy={p.y} r={6} fill={c}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.14 }}
                  style={{ filter: T.key === "dark" ? `drop-shadow(0 0 6px ${c})` : "none" }}
                />
              </motion.g>
            );
          })}

          {/* задачи, летящие к центру — непрерывный ровный поток */}
          {TASKS.map((t, i) => {
            const p = nodePos(i, n);
            const c = toneOf(t);
            const mx = CC.x + (p.x - CC.x) * 0.5 + (p.y - CC.y) * 0.16;
            const my = CC.y + (p.y - CC.y) * 0.5 - (p.x - CC.x) * 0.16;
            return (
              <motion.g
                key={`f-${t.id}`}
                initial={{ x: p.x, y: p.y, opacity: 0 }}
                animate={{
                  x: [p.x, mx, CC.x],
                  y: [p.y, my, CC.y],
                  opacity: [0, 0.95, 0.95, 0],
                  scale: [0.55, 1, 0.45],
                }}
                transition={{
                  duration: FLOW,
                  repeat: Infinity,
                  repeatDelay: 0,
                  delay: i * step,
                  ease: "easeInOut",
                  times: [0, 0.5, 1],
                  opacity: {
                    duration: FLOW, repeat: Infinity, repeatDelay: 0, delay: i * step,
                    times: [0, 0.18, 0.68, 0.86], ease: "easeInOut",
                  },
                }}
              >
                <rect x={-11} y={-4} width={22} height={8} rx={4} fill={c} opacity={0.96}
                      style={{ filter: T.key === "dark" ? `drop-shadow(0 0 6px ${c})` : "none" }} />
                <circle cx={-14} cy={0} r={1.8} fill={c} opacity={0.55} />
              </motion.g>
            );
          })}
        </motion.g>

        {/* ядро: действующий специалист и незакрытая вторая единица */}
        <motion.circle
          cx={CC.x} cy={CC.y} r={R_CORE + 54} fill="url(#ws-aura)"
          animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
          pointerEvents="none"
        />
        <circle cx={CC.x} cy={CC.y} r={R_CORE} fill="url(#ws-glass)" />
        <motion.circle
          cx={CC.x} cy={CC.y} r={R_CORE} fill="none" stroke={T.red} strokeWidth={2}
          animate={{ scale: [1, 1.018, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
        />
        {[0, 1].map((k) => (
          <motion.circle
            key={k}
            cx={CC.x} cy={CC.y} r={R_CORE} fill="none" stroke={T.red} strokeWidth={1.2}
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{ scale: [1, 1.3], opacity: [0.4, 0] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: "easeOut", delay: k * 1.7 }}
            style={{ originX: `${CC.x}px`, originY: `${CC.y}px` }}
            pointerEvents="none"
          />
        ))}

        {/* волна «прилетевшей задачи» над головами */}
        <motion.circle
          cx={CC.x} cy={CC.y - 62} r={10} fill="none" stroke={T.amber} strokeWidth={1.4}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.8], opacity: [0.7, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", repeatDelay: 0.5 }}
          style={{ originX: `${CC.x}px`, originY: `${CC.y - 62}px` }}
          pointerEvents="none"
        />

        <g pointerEvents="none">
          <Person T={T} x={CC.x - 68} y={CC.y - 2} tilt={5} stack={7} delay={0} />
          <Person T={T} x={CC.x - 23} y={CC.y - 2} tilt={4} stack={7} delay={0.6} />
          <GhostPerson T={T} x={CC.x + 24} y={CC.y - 2} />
          <GhostPerson T={T} x={CC.x + 68} y={CC.y - 2} />

          <line x1={CC.x} y1={CC.y - 70} x2={CC.x} y2={CC.y + 42}
                stroke={T.borderHi} strokeWidth={1} strokeDasharray="3 6" opacity={0.7} />
          <text x={CC.x - 52} y={CC.y + 56} textAnchor="middle" fontSize="12"
                fontWeight="700" letterSpacing="0.6" fill={T.blue}>
            ЕСТЬ
          </text>
          <text x={CC.x + 52} y={CC.y + 56} textAnchor="middle" fontSize="12"
                fontWeight="700" letterSpacing="0.6" fill={T.teal}>
            НУЖНО
          </text>
        </g>

        {/* подпись отдела — принимающая сторона всего потока */}
        <g pointerEvents="none">
          <rect x={CC.x - 134} y={CC.y + 118} width={268} height={28} rx={14}
                fill={T.solid} stroke={T.borderHi} strokeWidth={1} />
          <text x={CC.x} y={CC.y + 137} textAnchor="middle" fontSize="12.5"
                fontWeight="700" letterSpacing="1.4" fill={T.teal}>
            ОТДЕЛ БИОБЕЗОПАСНОСТИ
          </text>
        </g>

        <text x={CC.x} y={22} textAnchor="middle" fontSize="14" fontWeight="700" letterSpacing="2.2" fill={T.faint}>
          {TASKS.length} НАПРАВЛЕНИЙ КОНТРОЛЯ
        </text>
        <text x={CC.x} y={VB.h - 16} textAnchor="middle" fontSize="13.5" fill={T.faint}>
          все направления сходятся на отдел биобезопасности — задачи не исчезают, они копятся
        </text>
      </svg>

      <motion.div
        initial={{ opacity: 0, x: 24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
        className="absolute right-0 top-4 w-[248px] rounded-2xl p-4 backdrop-blur-2xl"
        style={{ background: T.solid, border: `1px solid ${T.red}55`, boxShadow: `0 24px 50px -22px ${T.glowC}` }}
      >
        <div className="flex items-center gap-2">
          <Gauge size={15} color={T.red} />
          <span className="text-[14.5px] font-semibold" style={{ color: T.red }}>Виджет перегрузки</span>
        </div>
        <div className="mt-2 text-[15px] leading-snug" style={{ color: T.text }}>
          Объём направлений заметно больше того, что физически успевают двое.
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: T.grid }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${T.teal}, ${T.red})` }}
            initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }}
            transition={{ duration: 1.1, ease: EASE }}
          />
        </div>
        <div className="mt-3 flex items-start gap-2 text-[14px] leading-snug" style={{ color: T.muted }}>
          <AlertTriangle size={13} color={T.amber} className="mt-0.5 shrink-0" />
          Часть критических направлений закрывается меньше чем наполовину — это и есть риск пропуска.
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
      <foreignObject x={x + 10} y={y + 18} width={site.w - (isOffice ? 118 : 20)} height={site.h - 26}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            display: "grid", placeItems: "center",
            background: `${isOffice ? T.red : accent}1f`, color: isOffice ? T.red : accent,
          }}>
            <Icon size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, lineHeight: 1.15 }}>{site.name}</div>
            {site.sub ? <div style={{ fontSize: 12.5, color: T.faint, lineHeight: 1.2 }}>{site.sub}</div> : null}
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
        <text x="44" y="50" fontSize="13" fontWeight="700" letterSpacing="2" fill={T.faint}>
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
            <text x={823} y={y + 9} textAnchor="middle" fontSize="13.5" fill={T.muted}>корпус {i + 1}</text>
          </g>
        ))}
        <text x={823} y={444} textAnchor="middle" fontSize="15" fontWeight="600" fill={T.text}>
          Бройлерные площадки
        </text>

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
            <text x={m.x} y={m.y + 4} textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#fff">!</text>
            <motion.circle
              cx={m.x} cy={m.y} r={9} fill="none" stroke={T.red} strokeWidth={1.4}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
              style={{ originX: `${m.x}px`, originY: `${m.y}px` }}
            />
          </g>
        ))}

        {/* два действующих специалиста и две незакрытые единицы */}
        {[office.x + 42, office.x + 66].map((px, i) => (
          <motion.g key={px} animate={{ y: [0, -2.5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}>
            <circle cx={px} cy={office.y - 10} r={8} fill={T.red} />
            <path d={`M ${px - 10} ${office.y + 13} L ${px - 9} ${office.y} Q ${px} ${office.y - 5} ${px + 9} ${office.y} L ${px + 10} ${office.y + 13} Z`}
                  fill={T.red} opacity={0.92} />
          </motion.g>
        ))}
        {[office.x + 92, office.x + 116].map((px, i) => (
          <motion.g key={px} animate={{ opacity: [0.4, 0.85, 0.4] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}>
            <circle cx={px} cy={office.y - 10} r={8} fill="none" stroke={T.teal} strokeWidth={1.5} strokeDasharray="4 4" />
            <path d={`M ${px - 10} ${office.y + 13} L ${px - 9} ${office.y} Q ${px} ${office.y - 5} ${px + 9} ${office.y} L ${px + 10} ${office.y + 13} Z`}
                  fill="none" stroke={T.teal} strokeWidth={1.5} strokeDasharray="4 4" />
          </motion.g>
        ))}
        <text x={office.x + 104} y={office.y + 27} textAnchor="middle" fontSize="11"
              fontWeight="700" fill={T.teal}>+{METRICS.gap}</text>

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
        <text x="500" y="552" textAnchor="middle" fontSize="13.5" fill={T.faint}>
          каждое перемещение между зонами — точка входного контроля
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
              <div className="truncate text-[15px] font-semibold" style={{ color: T.text }}>{r.label}</div>
              <div className="truncate text-[13.5px]" style={{ color: T.faint }}>{r.cargo}</div>
            </div>

          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   9b. СРАВНЕНИЕ: ДЕЙСТВУЮЩИЙ ШТАТ ПРОТИВ УСИЛЕННОГО
   ═══════════════════════════════════════════════════════════════════════════ */

const ROLES = [
  { n: 1, title: "Входной контроль периметра", hours: 36.0, now: true,
    duties: "Проходная, согласования, подрядчики, входной контроль сырья и ТМЦ, внешний пест-контроль" },
  { n: 2, title: "Внешние риски и контрагенты", hours: 36.5, now: true,
    duties: "Санобработка транспорта до погрузки сырья, аудит контрагентов, поставщики, ЛПХ, ситуация в регионе, ВНД по сырью" },
  { n: 3, title: "Внутренний операционный контроль", hours: 34.5, now: false,
    duties: "Дезбарьеры, верификация мойки, МиДС, АТЦ, склад лузги, пометохранилище, биоотходы" },
  { n: 4, title: "Аудит, ВНД и лаборатория", hours: 36.0, now: false,
    duties: "Аудиты внутренних площадок, разработка ВНД, лабораторные данные, обучение, инструктажи, отчётность" },
];

function StaffingComparison({ T }) {
  const cap1 = STAFF * HOURS_PER_STAFF;                       // 80
  const cap2 = METRICS.requiredStaff * HOURS_PER_STAFF;       // 160
  const done1 = METRICS.coveredNow;                           // 81,7
  const perHead1 = Math.round((done1 / STAFF) * 10) / 10;     // 40,9
  // фактическая нагрузка на человека считается с коэффициентом невыходов
  // (отпуска, больничные, обучение) — 6,4% рабочего времени в году
  const ABSENCE = 0.064;
  const perHead2 = Math.round((METRICS.demandWeek / (METRICS.requiredStaff * (1 - ABSENCE))) * 10) / 10;
  const loadAfter = Math.round((METRICS.demandWeek / cap2) * 100);

  const rows = [
    { l: "Ресурс службы",            a: `${cap1} ч/нед`,  b: `${cap2} ч/нед`, hint: `${STAFF} × ${HOURS_PER_STAFF} ч → ${METRICS.requiredStaff} × ${HOURS_PER_STAFF} ч` },
    { l: "Требуется по регламенту",  a: `${METRICS.demandWeek} ч`, b: `${METRICS.demandWeek} ч`, hint: "объём задач не меняется" },
    { l: "Фактически закрывается",   a: `${fmt(done1, 1)} ч`, b: `${METRICS.demandWeek} ч`, hint: "весь регламент выполняется" },
    { l: "Нагрузка на человека",     a: `${fmt(perHead1, 1)} ч`, b: `${fmt(perHead2, 1)} ч`, hint: `норма ${HOURS_PER_STAFF} ч; после найма — с учётом отпусков и больничных` },
    { l: "Загрузка службы",          a: `${METRICS.load}%`, b: `${loadAfter}%`, hint: "норма 100%" },
    { l: "Охват направлений",        a: `${METRICS.coverage}%`, b: "100%", hint: `из ${TASKS.length} направлений` },
    { l: "Направлений с охватом 0%", a: `${METRICS.uncovered}`, b: "0", hint: "полностью открытые риски" },
  ];

  const deficit = Math.round((METRICS.demandWeek - done1) * 10) / 10;
  const rates = Math.round((deficit / HOURS_PER_STAFF) * 100) / 100;

  const chain = [
    { n: "01", t: "Объём работы", v: `${fmt(METRICS.demandWeek, 0)} ч/нед`, c: T.violet,
      d: `${TASKS.length} направлений регламента: ${fmt(METRICS.extDemand, 1)} ч внешний контур + ${fmt(METRICS.intDemand, 1)} ч внутренний` },
    { n: "02", t: "Ресурс службы", v: `${cap1} ч/нед`, c: T.blue,
      d: `${STAFF} специалиста × ${HOURS_PER_STAFF} ч — это весь физический фонд рабочего времени` },
    { n: "03", t: "Часы расходуются полностью", v: `${fmt(done1, 1)} ч`, c: T.amber,
      d: `по ${fmt(perHead1, 1)} ч на человека — уже с переработкой; дело не в темпе работы, а в объёме` },
    { n: "04", t: "Но объём закрыт лишь на", v: `${METRICS.coverage}%`, c: T.red,
      d: `${METRICS.uncovered} направления не выполняются вовсе, ещё ${METRICS.weakSpots - METRICS.uncovered} закрыты меньше чем наполовину` },
    { n: "05", t: "Дефицит", v: `${fmt(deficit, 1)} ч/нед`, c: T.red,
      d: `${fmt(METRICS.demandWeek, 0)} − ${fmt(done1, 1)} = ${fmt(deficit, 1)} ч, это ${fmt(rates, 2).replace(".", ",")} ставки` },
    { n: "06", t: "Требуется штат", v: `${METRICS.requiredStaff} чел.`, c: T.teal,
      d: `${fmt(METRICS.demandWeek, 0)} ÷ ${HOURS_PER_STAFF} = ${fmt(METRICS.demandWeek / HOURS_PER_STAFF, 1)} → округление вверх даёт ${METRICS.requiredStaff}, то есть +${METRICS.gap} к текущим ${STAFF}` },
  ];

  return (
    <div>
      <div className="mb-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {chain.map((c, i) => (
          <motion.div
            key={c.n}
            initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.42, ease: EASE }}
            className="rounded-xl p-4"
            style={{ background: T.panel, border: `1px solid ${T.border}` }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[13px] font-semibold" style={{ color: T.faint }}>{c.n}</span>
              <span className="text-[20px] font-semibold" style={{ color: c.c }}>{c.v}</span>
            </div>
            <div className="mt-1.5 text-[15px] font-semibold" style={{ color: T.text }}>{c.t}</div>
            <div className="mt-1 text-[13.5px] leading-snug" style={{ color: T.muted }}>{c.d}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
        {/* СЕЙЧАС */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.55, ease: EASE }}
          className="rounded-2xl p-5"
          style={{ background: `${T.red}0d`, border: `1.5px solid ${T.red}55`, boxShadow: T.shadow }}
        >
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${T.red}1f`, color: T.red }}>
              <Users size={17} />
            </div>
            <div>
              <div className="text-[17px] font-semibold" style={{ color: T.text }}>Сейчас · {STAFF} специалиста</div>
              <div className="text-[14px]" style={{ color: T.muted }}>ресурс {cap1} ч в неделю</div>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-[44px] font-semibold leading-none" style={{ color: T.red }}>{METRICS.load}%</span>
            <span className="pb-1.5 text-[14px]" style={{ color: T.muted }}>загрузка</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full" style={{ background: T.grid }}>
            <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${T.amber}, ${T.red})` }}
                        initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }}
                        transition={{ duration: 1, ease: EASE }} />
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: T.muted }}>
            Рабочее время израсходовано полностью — по <b style={{ color: T.text }}>{fmt(perHead1, 1)} ч</b>{" "}
            на человека, уже с переработкой. Но этих часов хватает только на
            <b style={{ color: T.red }}> {METRICS.coverage}%</b> регламентного объёма:
            задачи закрыты по времени, а не по существу.
          </p>
        </motion.div>

        {/* стрелка */}
        <div className="flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ delay: 0.3, type: "spring", stiffness: 240, damping: 18 }}
            className="flex items-center gap-2 rounded-full px-4 py-2.5"
            style={{ background: `linear-gradient(135deg, ${T.cyan}, ${T.teal})`, boxShadow: `0 16px 34px -16px ${T.glowA}` }}
          >
            <UserPlus size={16} color="#fff" />
            <span className="text-[16px] font-semibold text-white">+{METRICS.gap} специалиста</span>
          </motion.div>
        </div>

        {/* ПОСЛЕ */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
          className="rounded-2xl p-5"
          style={{ background: `${T.teal}0d`, border: `1.5px solid ${T.teal}55`, boxShadow: T.shadow }}
        >
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${T.teal}1f`, color: T.teal }}>
              <ShieldCheck size={17} />
            </div>
            <div>
              <div className="text-[17px] font-semibold" style={{ color: T.text }}>
                После найма · {METRICS.requiredStaff} специалиста
              </div>
              <div className="text-[14px]" style={{ color: T.muted }}>ресурс {cap2} ч в неделю</div>
            </div>
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-[44px] font-semibold leading-none" style={{ color: T.teal }}>{loadAfter}%</span>
            <span className="pb-1.5 text-[14px]" style={{ color: T.muted }}>загрузка</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full" style={{ background: T.grid }}>
            <motion.div className="h-full rounded-full" style={{ background: T.teal }}
                        initial={{ width: 0 }} whileInView={{ width: `${loadAfter}%` }} viewport={{ once: true }}
                        transition={{ duration: 1, ease: EASE, delay: 0.2 }} />
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: T.muted }}>
            Четверо закрывают <b style={{ color: T.text }}>все {METRICS.demandWeek} ч</b> —
            по <b style={{ color: T.text }}>{fmt(perHead2, 1)} ч</b> на человека с учётом отпусков
            и больничных. Охват <b style={{ color: T.teal }}>100%</b>, открытых рисков не остаётся.
          </p>
        </motion.div>
      </div>

      {/* построчное сравнение */}
      <div className="mt-4 overflow-hidden rounded-2xl" style={{ border: `1px solid ${T.border}`, background: T.panel }}>
        {rows.map((r, i) => (
          <motion.div
            key={r.l}
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.4 }}
            className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1.4fr_1fr_1fr]"
            style={{ borderTop: i ? `1px solid ${T.border}` : "none" }}
          >
            <div>
              <div className="text-[15px] font-medium" style={{ color: T.text }}>{r.l}</div>
              <div className="text-[13px]" style={{ color: T.faint }}>{r.hint}</div>
            </div>
            <div className="text-[17px] font-semibold" style={{ color: T.red }}>{r.a}</div>
            <div className="flex items-center gap-2">
              <ArrowRight size={14} color={T.faint} />
              <span className="text-[17px] font-semibold" style={{ color: T.teal }}>{r.b}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* роли */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ROLES.map((r, i) => (
          <motion.div
            key={r.n}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.45, ease: EASE }}
            whileHover={{ y: -4 }}
            className="rounded-2xl p-4"
            style={{
              background: T.panel,
              border: `1px solid ${r.now ? T.border : `${T.teal}66`}`,
              boxShadow: T.shadow,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="grid h-8 w-8 place-items-center rounded-lg"
                   style={{ background: r.now ? `${T.blue}1a` : `${T.teal}1a`, color: r.now ? T.blue : T.teal }}>
                <span className="text-[14px] font-semibold">{r.n}</span>
              </div>
              <span className="rounded-md px-2 py-0.5 text-[12px] font-semibold"
                    style={{ background: r.now ? T.grid : `${T.teal}1a`, color: r.now ? T.muted : T.teal }}>
                {r.now ? "есть" : "нужен"}
              </span>
            </div>
            <div className="mt-2.5 text-[15px] font-semibold leading-tight" style={{ color: T.text }}>{r.title}</div>
            <div className="mt-1 text-[13.5px] leading-snug" style={{ color: T.faint }}>{r.duties}</div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: T.grid }}>
                <motion.div className="h-full rounded-full" style={{ background: r.now ? T.blue : T.teal }}
                            initial={{ width: 0 }} whileInView={{ width: `${(r.hours / HOURS_PER_STAFF) * 100}%` }}
                            viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.07, duration: 0.8, ease: EASE }} />
              </div>
              <span className="font-mono text-[13px] font-semibold" style={{ color: T.text }}>
                {fmt(r.hours, 1)} ч
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   10b. АНИМАЦИЯ «ВХОДНОЙ КОНТРОЛЬ ВНЕШНЕГО ПЕРИМЕТРА»
   КамАЗ подъезжает извне → дезбарьер с распылом → санпропускник и шлагбаум →
   заезд на внутренние склады. Все фазы синхронизированы одним таймером, так что
   форсунки работают ровно тогда, когда машина под аркой, а шлагбаум поднимается
   ровно под подъезжающую машину.
   ═══════════════════════════════════════════════════════════════════════════ */

const GATE = { w: 1040, h: 342 };
const ROAD_Y = 210;
const CYCLE = 11000;                      // длительность полного проезда, мс

/* ключевые фазы проезда: доля цикла → координата X */
const RUN_P = [0, 0.20, 0.34, 0.46, 0.56, 0.66, 0.82, 1];
const RUN_X = [-110, 275, 400, 470, 495, 495, 800, 1160];

function Kamaz({ T, p }) {
  const x = useTransform(p, RUN_P, RUN_X);
  // кузов «грязный» до арки и чистый после обработки
  const body = useTransform(p, [0.20, 0.36], [T.faint, T.blue], { clamp: true });
  const tarp = useTransform(p, [0.20, 0.36], ["#9aa5b8", "#dfe9fb"], { clamp: true });
  const okMark = useTransform(p, [0.34, 0.40, 0.94, 1], [0, 1, 1, 0]);
  const bounce = useTransform(p, (v) => Math.sin(v * 90) * 0.7);

  return (
    <motion.g style={{ x }}>
      <motion.g style={{ y: bounce }}>
        <ellipse cx={-6} cy={16} rx={44} ry={5} fill={T.text} opacity={T.key === "dark" ? 0.3 : 0.10} />
        {/* кузов с тентом */}
        <motion.rect x={-44} y={-16} width={50} height={26} rx={3} style={{ fill: body }} />
        <motion.path d="M -44 -16 Q -19 -34 6 -16 Z" style={{ fill: tarp }} />
        <rect x={-44} y={-16} width={50} height={26} rx={3} fill="none" stroke={T.text} strokeWidth={0.8} opacity={0.18} />
        {/* кабина */}
        <motion.rect x={8} y={-14} width={24} height={24} rx={5} style={{ fill: body }} />
        <rect x={13} y={-10} width={15} height={11} rx={2.5} fill={T.key === "dark" ? "#cfe0ff" : "#eaf1ff"} opacity={0.95} />
        {/* колёса */}
        {[-32, -16, 22].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={11} r={7.5} fill={T.key === "dark" ? "#0d1424" : "#26303f"} />
            <circle cx={cx} cy={11} r={3} fill={T.key === "dark" ? "#4c5a72" : "#8b98ac"} />
          </g>
        ))}
        {/* отметка «обработан» */}
        <motion.g style={{ opacity: okMark }}>
          <circle cx={-19} cy={-42} r={11} fill={T.teal} />
          <path d="M -24 -42 L -21 -38 L -14 -46" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
      </motion.g>
    </motion.g>
  );
}

/* активность узла: 0 вне окна, 1 внутри, с плавными фронтами */
const ramp = (v, a, b, c, d) => {
  if (v <= a || v >= d) return 0;
  if (v < b) return (v - a) / (b - a);
  if (v <= c) return 1;
  return (d - v) / (d - c);
};

function SprayArch({ T, ps }) {
  // форсунки работают, пока хоть одна машина находится под аркой
  const on = useTransform(ps, (vals) => Math.max(...vals.map((v) => ramp(v, 0.18, 0.21, 0.35, 0.38))));
  const jets = [310, 330, 350, 370, 390];
  return (
    <g>
      {/* опоры и балка */}
      <rect x={296} y={96} width={102} height={13} rx={5} fill={T.cyan} opacity={0.85} />
      <rect x={296} y={104} width={12} height={112} rx={4} fill={T.cyan} opacity={0.5} />
      <rect x={386} y={104} width={12} height={112} rx={4} fill={T.cyan} opacity={0.5} />
      {/* распыл сверху */}
      <motion.g style={{ opacity: on }}>
        {jets.map((jx, i) => (
          <g key={jx}>
            <circle cx={jx} cy={112} r={2.4} fill={T.cyan} />
            <motion.path
              d={`M ${jx} 114 L ${jx - 9} 200 L ${jx + 9} 200 Z`}
              fill={T.cyan}
              animate={{ opacity: [0.06, 0.30, 0.06] }}
              transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut", delay: i * 0.09 }}
            />
            {[0, 1, 2].map((k) => (
              <motion.circle
                key={k} cx={jx} r={1.7} fill={T.cyan}
                animate={{ cy: [120, 200], opacity: [0.9, 0] }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "easeIn", delay: i * 0.09 + k * 0.23 }}
              />
            ))}
          </g>
        ))}
        {/* боковые форсунки по колёсам */}
        {[[300, 1], [394, -1]].map(([sx, dir]) => (
          <g key={sx}>
            {[168, 190].map((sy, i) => (
              <motion.path
                key={sy}
                d={`M ${sx} ${sy} L ${sx + dir * 46} ${sy - 9} L ${sx + dir * 46} ${sy + 9} Z`}
                fill={T.cyan}
                animate={{ opacity: [0.05, 0.26, 0.05] }}
                transition={{ duration: 0.75, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
              />
            ))}
          </g>
        ))}
        {/* лужа под аркой */}
        <ellipse cx={347} cy={216} rx={58} ry={6} fill={T.cyan} opacity={0.22} />
      </motion.g>
    </g>
  );
}

/* Персонал: проход через санпропускник (люди идут своей дорожкой) */
const WALK_P = [0, 0.30, 0.42, 0.60, 1];
const WALK_X = [-50, 552, 578, 640, 1140];
const WALK_Y = 268;

function Walker({ T, p, shade }) {
  const x = useTransform(p, WALK_P, WALK_X);
  const step = useTransform(p, (v) => Math.abs(Math.sin(v * 60)) * -2.2);
  const suit = useTransform(p, [0.30, 0.46], [T.faint, T.violet], { clamp: true });
  const ok = useTransform(p, [0.44, 0.50, 0.94, 1], [0, 1, 1, 0]);
  return (
    <motion.g style={{ x }}>
      <motion.g style={{ y: step }}>
        <ellipse cx={0} cy={16} rx={11} ry={3} fill={T.text} opacity={T.key === "dark" ? 0.28 : 0.10} />
        <motion.circle cx={0} cy={-16} r={6.5} style={{ fill: suit }} />
        <motion.path d="M -8 14 L -7 -4 Q 0 -9 7 -4 L 8 14 Z" style={{ fill: suit }} opacity={0.92} />
        <motion.g style={{ opacity: ok }}>
          <circle cx={12} cy={-24} r={8} fill={T.teal} />
          <path d="M 8 -24 L 11 -21 L 16 -28" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
      </motion.g>
    </motion.g>
  );
}

function Checkpoint({ T, ps }) {
  // шлагбаум поднимается под ту машину, которая подъехала
  const boom = useTransform(ps, (vals) => -74 * Math.max(...vals.map((v) => ramp(v, 0.54, 0.60, 0.80, 0.86))));
  const doc = useTransform(ps, (vals) => Math.max(...vals.map((v) => ramp(v, 0.54, 0.58, 0.74, 0.80))));
  return (
    <g>
      {/* будка санпропускника */}
      <rect x={588} y={128} width={74} height={82} rx={9} fill={T.surface} stroke={T.border} strokeWidth={1.2} />
      <rect x={588} y={128} width={74} height={9} rx={4} fill={T.violet} opacity={0.55} />
      <rect x={600} y={150} width={26} height={22} rx={3} fill={T.blue} opacity={0.22} />
      <circle cx={643} cy={162} r={7} fill={T.violet} opacity={0.85} />
      <path d="M 635 186 L 636 172 Q 643 167 650 172 L 651 186 Z" fill={T.violet} opacity={0.8} />

      {/* стойка и стрела шлагбаума */}
      <rect x={556} y={150} width={9} height={66} rx={4} fill={T.amber} />
      <motion.g style={{ rotate: boom, originX: "560px", originY: "154px" }}>
        <rect x={556} y={149} width={116} height={9} rx={4.5} fill={T.amber} />
        {[572, 600, 628, 652].map((sx, i) => (
          <rect key={sx} x={sx} y={149} width={14} height={9} fill={i % 2 ? "#fff" : T.red} opacity={0.9} />
        ))}
      </motion.g>

      {/* карточка допуска */}
      <motion.g style={{ opacity: doc }}>
        <rect x={404} y={80} width={112} height={42} rx={9} fill={T.surface} stroke={T.teal} strokeWidth={1.4} />
        <circle cx={424} cy={101} r={10} fill={T.teal} opacity={0.18} />
        <path d="M 419 101 L 422 105 L 429 97" fill="none" stroke={T.teal} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <text x={442} y={97} fontSize="12.5" fontWeight="600" fill={T.text}>допуск оформлен</text>
        <text x={442} y={111} fontSize="11.5" fill={T.faint}>документы проверены</text>
      </motion.g>
    </g>
  );
}

function ExternalFlowScene({ T }) {
  const time = useTime();
  const p1 = useTransform(time, (t) => (t % CYCLE) / CYCLE);
  const p2 = useTransform(time, (t) => ((t + CYCLE * 0.5) % CYCLE) / CYCLE);
  const pw = useTransform(time, (t) => ((t + CYCLE * 0.78) % CYCLE) / CYCLE);

  const zones = [
    { x: 130, label: "ВНЕШНЯЯ ЗОНА",   sub: "въезд транспорта",     tone: T.faint },
    { x: 347, label: "ДЕЗБАРЬЕР",      sub: "обработка транспорта",   tone: T.cyan },
    { x: 600, label: "САНПРОПУСКНИК",  sub: "допуск и входной контроль", tone: T.violet },
    { x: 880, label: "ВНУТРЕННЯЯ ЗОНА", sub: "склады предприятия",    tone: T.teal },
  ];

  const stores = [
    { x: 740, name: "Склад ТМЦ" },
    { x: 856, name: "Ветаптека" },
    { x: 972, name: "Склад МиДС" },
  ];

  return (
    <svg viewBox={`0 0 ${GATE.w} ${GATE.h}`} className="w-full" style={{ minWidth: 760 }}>
      {/* фон зон */}
      <rect x={0} y={0} width={430} height={GATE.h} fill={T.grid} opacity={0.45} />
      <rect x={676} y={0} width={364} height={GATE.h} fill={T.teal} opacity={T.key === "dark" ? 0.07 : 0.06} />
      <line x1={676} y1={0} x2={676} y2={GATE.h} stroke={T.teal} strokeWidth={1.4} strokeDasharray="7 7" opacity={0.6} />

      {/* дорога */}
      <rect x={0} y={ROAD_Y - 34} width={GATE.w} height={64} fill={T.key === "dark" ? "#171f2e" : "#dfe4ec"} />
      <motion.g
        animate={{ x: [0, -48] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <rect key={i} x={i * 48} y={ROAD_Y - 4} width={26} height={3} rx={1.5} fill={T.surface} opacity={0.75} />
        ))}
      </motion.g>

      {/* склады */}
      {stores.map((st) => (
        <g key={st.name}>
          <rect x={st.x - 48} y={110} width={96} height={72} rx={9} fill={T.surface} stroke={T.teal} strokeWidth={1.2} />
          <rect x={st.x - 48} y={110} width={96} height={8} rx={4} fill={T.teal} opacity={0.5} />
          <rect x={st.x - 24} y={148} width={48} height={34} rx={3} fill={T.teal} opacity={0.18} />
          <text x={st.x} y={200} textAnchor="middle" fontSize="13" fontWeight="600" fill={T.text}>{st.name}</text>
        </g>
      ))}

      {/* пешеходная дорожка персонала */}
      <rect x={0} y={WALK_Y - 16} width={GATE.w} height={40} fill={T.key === "dark" ? "#141b28" : "#e8ecf3"} />
      <rect x={556} y={WALK_Y - 16} width={38} height={40} fill={T.violet} opacity={0.16} />
      <text x={430} y={WALK_Y + 36} textAnchor="middle" fontSize="13" fill={T.violet} fontWeight="600">
        проход персонала
      </text>

      <SprayArch T={T} ps={[p1, p2]} />
      <Checkpoint T={T} ps={[p1, p2]} />

      <g style={{ transform: `translateY(${ROAD_Y}px)` }}>
        <Kamaz T={T} p={p1} />
        <Kamaz T={T} p={p2} />
      </g>

      <g style={{ transform: `translateY(${WALK_Y}px)` }}>
        <Walker T={T} p={p1} />
        <Walker T={T} p={pw} />
        <Walker T={T} p={p2} />
      </g>

      {/* подписи зон */}
      {zones.map((z) => (
        <g key={z.label}>
          <text x={z.x} y={26} textAnchor="middle" fontSize="13" fontWeight="700" letterSpacing="1.6" fill={z.tone}>
            {z.label}
          </text>
          <text x={z.x} y={42} textAnchor="middle" fontSize="12.5" fill={T.faint}>{z.sub}</text>
        </g>
      ))}

      <text x={GATE.w / 2} y={GATE.h - 8} textAnchor="middle" fontSize="14" fill={T.faint}>
        транспорт и персонал заходят на территорию только через обработку и входной контроль
      </text>
    </svg>
  );
}

/* Опциональный плеер: включается, если рядом лежит assets/external-flow.mp4 */
const VIDEO_SRC = "assets/external-flow.mp4";

const STORYBOARD = [
  { t: "01", icon: Truck,       title: "Въезд транспорта",     d: "Сырьё, ТМЦ, препараты идут к периметру", cov: "100%", ok: true },
  { t: "02", icon: FileText,    title: "Заявка и допуск",      d: "Без отметки службы шлагбаум закрыт",     cov: "100%", ok: true },
  { t: "03", icon: Droplets,    title: "Дезбарьер",            d: "Колёса, ходовая, тент, контроль концентрации", cov: "100%", ok: true },
  { t: "04", icon: DoorOpen,    title: "Санпропускник людей",  d: "Смена одежды, обработка, журнал",        cov: "100%", ok: true },
  { t: "05", icon: Package,     title: "Входной контроль ТМЦ", d: "Тентование, тара, отбор проб",           cov: "20%",  ok: false },
  { t: "06", icon: ShieldCheck, title: "Санобработка до погрузки", d: "Обработка транспорта под сырьё для ККЗ",       cov: "0%",   ok: false },
  { t: "07", icon: Warehouse,   title: "Допуск на склады",     d: "Заезд к докам складов и ветаптеки",      cov: "100%", ok: true },
];

function ExternalFlowVideo({ T }) {
  const [hasVideo, setHasVideo] = useState(true);

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl"
           style={{ background: T.panelHi, border: `1px solid ${T.border}` }}>
        <ExternalFlowScene T={T} />
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {STORYBOARD.map((sc, i) => {
          const Icon = sc.icon;
          const tone = sc.ok ? T.violet : T.red;
          return (
            <motion.div
              key={sc.t}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.42, ease: EASE }}
              whileHover={{ y: -3 }}
              className="rounded-xl px-3.5 py-3"
              style={{
                background: sc.ok ? T.panel : `${T.red}0f`,
                border: `1px solid ${sc.ok ? T.border : `${T.red}55`}`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                     style={{ background: `${tone}1a`, color: tone }}>
                  <Icon size={14} />
                </div>
                <span className="font-mono text-[12.5px]" style={{ color: T.faint }}>{sc.t}</span>
                <span className="ml-auto font-mono text-[13.5px] font-semibold" style={{ color: tone }}>{sc.cov}</span>
              </div>
              <div className="mt-2 text-[15px] font-semibold leading-tight" style={{ color: T.text }}>{sc.title}</div>
              <div className="mt-0.5 text-[13.5px] leading-snug" style={{ color: T.faint }}>{sc.d}</div>
            </motion.div>
          );
        })}
      </div>

      {hasVideo && (
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.14em]"
               style={{ color: T.faint }}>
            <Truck size={12} /> видеоверсия ролика
          </div>
          <video
            src={VIDEO_SRC}
            autoPlay muted loop playsInline controls
            onError={() => setHasVideo(false)}
            style={{
              width: "100%", maxWidth: 720, borderRadius: 16, display: "block",
              border: `1px solid ${T.border}`, boxShadow: T.shadow,
            }}
          />
        </div>
      )}
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
      name: `Ёмкость службы: ${STAFF} × ${HOURS_PER_STAFF} ч`,
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
        labels: { style: { color: T.faint, fontSize: "14.5px" } },
        crosshair: { color: T.border, width: 1, dashStyle: "Dash" },
      },
      yAxis: {
        title: { text: P.unit, style: { color: T.faint, fontSize: "13px" } },
        gridLineColor: T.grid,
        labels: { style: { color: T.faint, fontSize: "14.5px" } },
      },
      legend: {
        itemStyle: { color: T.muted, fontWeight: "500", fontSize: "13px" },
        itemHoverStyle: { color: T.text },
        symbolRadius: 3, align: "left", margin: 18,
      },
      tooltip: {
        shared: true, backgroundColor: T.solid, borderColor: T.borderHi, borderRadius: 12,
        shadow: false, style: { color: T.text, fontSize: "14.5px" }, valueSuffix: " ч",
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
      text: `Двое закрывают лишь ${METRICS.extCoverage}% внешнего контура — границы, на которой риск должен останавливаться до входа на территорию. Санобработка транспорта под шрот и жмых не выполняется вовсе.` },
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

        <div className="flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.2em]" style={{ color: T.faint }}>
          <PulseDot color={T.red} size={7} /> обоснование расширения штата
        </div>
        <h2 className="mt-2.5 text-[26px] font-semibold leading-tight" style={{ color: T.text }}>
          Аргументация для руководства
        </h2>

        <div className="mt-5 rounded-2xl p-5"
             style={{ background: `linear-gradient(135deg, ${T.glowC}, ${T.glowB})`, border: `1px solid ${T.red}44` }}>
          <p className="text-[17px] leading-relaxed" style={{ color: T.text }}>
            Действующий <b>штат из {STAFF} специалистов</b> закрывает только{" "}
            <b style={{ color: T.red }}>{METRICS.extCoverage}%</b> обязательного внешнего контура.
            Требуется расширение штата минимум на{" "}
            <b style={{ color: T.teal }}>{METRICS.gap} единицы</b> для исключения сбоев.
          </p>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between font-mono text-[13px]" style={{ color: T.muted }}>
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
                  <div className="text-[16px] font-semibold" style={{ color: T.text }}>
                    {String(i + 1).padStart(2, "0")} · {a.title}
                  </div>
                  <div className="mt-1 text-[15px] leading-relaxed" style={{ color: T.muted }}>{a.text}</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                         className="flex items-center gap-2 rounded-xl px-5 py-3 text-[15.5px] font-semibold text-white"
                         style={{ background: `linear-gradient(135deg, ${T.teal}, ${T.blue})`, boxShadow: `0 18px 36px -16px ${T.glowA}` }}>
            <Check size={15} /> Согласовать +{METRICS.gap} ставки
          </motion.button>
          <button onClick={onClose} className="rounded-xl px-5 py-3 text-[15.5px] font-medium"
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

/* ═══════════════════════════════════════════════════════════════════════════
   7.5 ИНТРО-НАВИГАТОР для показа: биобезопасность → контур → направление →
   подсписок. Четыре уровня с анимированными переходами между ними.
   ═══════════════════════════════════════════════════════════════════════════ */

const IVB = { w: 960, h: 406 };
const ICC = { x: 480, y: 186 };
const IEXT = { x: 246, y: 186 };
const IINT = { x: 714, y: 186 };

const SHIELD = "M 0 -50 L 21 -42 L 21 -25 Q 21 -8 0 -1 Q -21 -8 -21 -25 L -21 -42 Z";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/* подсписок направления собирается из его же карточки: состав работ,
   периодичность и тип задачи — ничего придуманного сверх данных службы */
function subItemsOf(t) {
  if (t.sub && t.sub.length) return t.sub;
  const parts = t.note.split(":");
  const body = parts.length > 1 ? parts.slice(1).join(":") : parts[0];
  const list = body
    .split(/[,;]\s*/)
    .map((x) => cap(x.trim()))
    .filter((x) => x.length > 2);
  return [
    ...list,
    `Периодичность — ${t.freq}`,
    `Тип задачи — ${GROUPS[t.group].title.toLowerCase()}`,
  ];
}

/* ── уровни 0–1: общий круг и его деление на два контура ──────────────────── */
function IntroOrbit({ T, split, onContour }) {
  const ext = TASKS.filter((t) => t.contour === "external");
  const int = TASKS.filter((t) => t.contour === "internal");

  const dots = TASKS.map((t, i) => {
    const am = ((-90 + (i * 360) / TASKS.length) * Math.PI) / 180;
    const isExt = t.contour === "external";
    const list = isExt ? ext : int;
    const j = list.indexOf(t);
    const as = ((-90 + (j * 360) / list.length) * Math.PI) / 180;
    const c = isExt ? IEXT : IINT;
    const rr = isExt ? 108 : 114;
    return {
      id: t.id, i,
      mx: ICC.x + 160 * Math.cos(am), my: ICC.y + 160 * Math.sin(am),
      sx: c.x + rr * Math.cos(as), sy: c.y + rr * Math.sin(as),
      color: isExt ? T.violet : T.cyan,
    };
  });

  const spring = { type: "spring", stiffness: 90, damping: 18, mass: 0.9 };

  return (
    <svg viewBox={`0 0 ${IVB.w} ${IVB.h}`} className="relative block w-full">
      <defs>
        <radialGradient id="intro-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={T.surface} stopOpacity={T.key === "dark" ? 0.45 : 0.95} />
          <stop offset="100%" stopColor={T.surface} stopOpacity="0" />
        </radialGradient>
      </defs>

      <motion.circle cx={ICC.x} cy={ICC.y} r={210} fill="url(#intro-glow)"
                     animate={{ opacity: split ? 0 : 1 }} transition={{ duration: 0.6 }} />
      <motion.circle cx={IEXT.x} cy={IEXT.y} r={150} fill="url(#intro-glow)"
                     animate={{ opacity: split ? 1 : 0 }} transition={{ duration: 0.6 }} />
      <motion.circle cx={IINT.x} cy={IINT.y} r={150} fill="url(#intro-glow)"
                     animate={{ opacity: split ? 1 : 0 }} transition={{ duration: 0.6 }} />

      {dots.map((d) => (
        <g key={d.id}>
          <motion.line
            stroke={split ? d.color : T.teal} strokeWidth={0.8} strokeDasharray="2 7"
            initial={false}
            animate={{
              x1: split ? d.sx : d.mx, y1: split ? d.sy : d.my,
              x2: split ? (d.color === T.violet ? IEXT.x : IINT.x) : ICC.x,
              y2: ICC.y, opacity: 0.3,
            }}
            transition={spring}
          />
          <motion.circle
            r={7} initial={false}
            animate={{ cx: split ? d.sx : d.mx, cy: split ? d.sy : d.my, fill: split ? d.color : T.teal }}
            transition={spring}
            style={{ filter: T.key === "dark" ? `drop-shadow(0 0 5px ${d.color})` : "none" }}
          />
          <motion.circle
            r={14} initial={false}
            animate={{
              cx: split ? d.sx : d.mx, cy: split ? d.sy : d.my,
              fill: split ? d.color : T.teal, opacity: [0.08, 0.2, 0.08],
            }}
            transition={{ ...spring, opacity: { duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: d.i * 0.11 } }}
          />
        </g>
      ))}

      {/* общий круг «Биобезопасность» */}
      <motion.g
        animate={{ opacity: split ? 0 : 1, scale: split ? 0.72 : 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ originX: `${ICC.x}px`, originY: `${ICC.y}px` }}
      >
        {[0, 1].map((k) => (
          <motion.circle
            key={k} cx={ICC.x} cy={ICC.y} r={114} fill="none" stroke={T.teal} strokeWidth={1.2}
            initial={{ scale: 1, opacity: 0.35 }}
            animate={{ scale: [1, 1.22], opacity: [0.35, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut", delay: k * 1.6 }}
            style={{ originX: `${ICC.x}px`, originY: `${ICC.y}px` }}
          />
        ))}
        <circle cx={ICC.x} cy={ICC.y} r={114} fill={T.solid} stroke={T.borderHi} strokeWidth={1.4} />
        <motion.circle
          cx={ICC.x} cy={ICC.y} r={126} fill="none" stroke={T.teal}
          strokeWidth={1.3} strokeDasharray="9 8" opacity={0.75}
          animate={{ rotate: 360 }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
          style={{ originX: `${ICC.x}px`, originY: `${ICC.y}px` }}
        />
        <g transform={`translate(${ICC.x}, ${ICC.y - 6})`}>
          <path d={SHIELD} fill={T.teal} opacity={0.14} />
          <path d={SHIELD} fill="none" stroke={T.teal} strokeWidth={2} strokeLinejoin="round" />
          <path d="M -9 -28 L -3 -21 L 10 -35" fill="none" stroke={T.teal} strokeWidth={2.6}
                strokeLinecap="round" strokeLinejoin="round" />
          <text x={0} y={24} textAnchor="middle" fontSize="15" fontWeight="700" letterSpacing="0.5" fill={T.text}>
            БИОБЕЗОПАСНОСТЬ
          </text>
          <text x={0} y={50} textAnchor="middle" fontSize="15" fill={T.muted}>
            {TASKS.length} направлений
          </text>
        </g>
      </motion.g>

      {/* два контура */}
      {[
        { c: IEXT, color: T.violet, l1: "ВНЕШНИЙ", l2: "КОНТУР", d: -1, id: "external" },
        { c: IINT, color: T.cyan, l1: "ВНУТРЕННИЙ", l2: "КОНТУР", d: 1, id: "internal" },
      ].map((k) => (
        <motion.g
          key={k.l1}
          initial={false}
          onClick={(e) => { if (split) { e.stopPropagation(); onContour(k.id); } }}
          animate={{ opacity: split ? 1 : 0, x: split ? k.c.x - ICC.x : 0, scale: split ? 1 : 1.5 }}
          transition={{ opacity: { duration: 0.45, delay: split ? 0.2 : 0 }, ...spring }}
          style={{ originX: `${ICC.x}px`, originY: `${ICC.y}px`, cursor: split ? "pointer" : "default" }}
          pointerEvents={split ? "auto" : "none"}
        >
          <circle cx={ICC.x} cy={ICC.y} r={80} fill={T.solid} stroke={`${k.color}88`} strokeWidth={1.6} />
          <circle cx={ICC.x} cy={ICC.y} r={80} fill={k.color} opacity={0.07} />
          <motion.circle
            cx={ICC.x} cy={ICC.y} r={91} fill="none" stroke={k.color}
            strokeWidth={1.3} strokeDasharray="7 7" opacity={0.8}
            animate={{ rotate: 360 * k.d }}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            style={{ originX: `${ICC.x}px`, originY: `${ICC.y}px` }}
          />
          <text x={ICC.x} y={ICC.y - 4} textAnchor="middle" fontSize="14" fontWeight="700" letterSpacing="0.5" fill={k.color}>
            {k.l1}
          </text>
          <text x={ICC.x} y={ICC.y + 18} textAnchor="middle" fontSize="14" fontWeight="700" letterSpacing="0.5" fill={k.color}>
            {k.l2}
          </text>
          <motion.text
            x={ICC.x} y={ICC.y + 46} textAnchor="middle" fontSize="12" fill={k.color}
            animate={{ opacity: [0.45, 0.9, 0.45] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            раскрыть →
          </motion.text>
        </motion.g>
      ))}

      <AnimatePresence mode="wait">
        <motion.text
          key={split ? "b" : "a"}
          x={ICC.x} y={IVB.h - 22} textAnchor="middle" fontSize="14" fill={T.faint}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {split
            ? "нажмите на контур, чтобы раскрыть его направления"
            : "нажмите, чтобы увидеть деление на два контура"}
        </motion.text>
      </AnimatePresence>
    </svg>
  );
}

/* ── уровни 2–3: ветвление от узла к его списку ───────────────────────────── */
function MindMap({ T, accent, hubTitle, hubSub, items, onItem }) {
  const n = items.length;
  const rows = Math.ceil(n / 2);
  const PW = 292, PH = 64, GAP = 15, PAD = 34;
  const H = Math.max(330, PAD * 2 + rows * (PH + GAP) - GAP) + 34;
  const CX = 480, CY = H / 2;
  const HUB_R = 78;

  const place = (i) => {
    const left = i % 2 === 0;
    const row = Math.floor(i / 2);
    const y = PAD + row * (PH + GAP);
    const x = left ? CX - 100 - PW : CX + 100;
    return { x, y, left, cy: y + PH / 2 };
  };

  return (
    <svg viewBox={`0 0 960 ${H}`} className="relative block w-full">
      <defs>
        <radialGradient id="mm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={T.surface} stopOpacity={T.key === "dark" ? 0.45 : 0.95} />
          <stop offset="100%" stopColor={T.surface} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r={168} fill="url(#mm-glow)" />

      {/* связи */}
      {items.map((it, i) => {
        const p = place(i);
        const sx = CX + (p.left ? -HUB_R : HUB_R);
        const ex = p.left ? p.x + PW : p.x;
        const mx = (sx + ex) / 2;
        return (
          <motion.path
            key={`c-${it.key}`}
            d={`M ${sx} ${CY} C ${mx} ${CY}, ${mx} ${p.cy}, ${ex} ${p.cy}`}
            fill="none" stroke={accent} strokeWidth={1.4}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 0.55, delay: 0.18 + i * 0.045, ease: EASE }}
          />
        );
      })}

      {/* карточки */}
      {items.map((it, i) => {
        const p = place(i);
        return (
          <motion.g
            key={it.key}
            initial={{ opacity: 0, x: p.left ? 26 : -26, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.22 + i * 0.045, ease: EASE }}
            whileHover={onItem ? { scale: 1.025 } : undefined}
            onClick={() => onItem && onItem(it)}
            style={{ cursor: onItem ? "pointer" : "default", originX: `${p.x + PW / 2}px`, originY: `${p.cy}px` }}
          >
            <rect x={p.x} y={p.y} width={PW} height={PH} rx={14}
                  fill={T.solid} stroke={`${accent}66`} strokeWidth={1.2} />
            <rect x={p.left ? p.x + PW - 4 : p.x} y={p.y + 12} width={4} height={PH - 24} rx={2} fill={accent} />
            <foreignObject x={p.x + 16} y={p.y + 6} width={PW - 40} height={PH - 12}>
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  display: "flex", alignItems: "center", height: "100%",
                  fontFamily: "inherit", fontSize: 14.5, lineHeight: 1.25,
                  color: T.text, fontWeight: 600,
                  textAlign: p.left ? "right" : "left",
                  justifyContent: p.left ? "flex-end" : "flex-start",
                  paddingRight: p.left ? 28 : 0,
                  paddingLeft: p.left ? 0 : 28,
                }}
              >
                <span>{it.label}</span>
              </div>
            </foreignObject>
            {onItem && (
              <g opacity={0.8}>
                <circle cx={p.left ? p.x + PW - 26 : p.x + 26} cy={p.cy} r={9} fill={accent} opacity={0.12} />
                <path
                  d={p.left
                    ? `M ${p.x + PW - 29} ${p.cy - 4} L ${p.x + PW - 23} ${p.cy} L ${p.x + PW - 29} ${p.cy + 4}`
                    : `M ${p.x + 23} ${p.cy - 4} L ${p.x + 29} ${p.cy} L ${p.x + 23} ${p.cy + 4}`}
                  fill="none" stroke={accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
                />
              </g>
            )}
          </motion.g>
        );
      })}

      <text x={CX} y={H - 16} textAnchor="middle" fontSize="14" fill={T.faint}>
        {onItem
          ? "нажмите на направление, чтобы раскрыть его состав"
          : "состав работ по направлению"}
      </text>

      {/* центральный узел */}
      <motion.g
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 16 }}
        style={{ originX: `${CX}px`, originY: `${CY}px` }}
      >
        <motion.circle
          cx={CX} cy={CY} r={HUB_R} fill="none" stroke={accent} strokeWidth={1.2}
          initial={{ scale: 1, opacity: 0.35 }}
          animate={{ scale: [1, 1.2], opacity: [0.35, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          style={{ originX: `${CX}px`, originY: `${CY}px` }}
        />
        <circle cx={CX} cy={CY} r={HUB_R} fill={T.solid} stroke={accent} strokeWidth={1.8} />
        <circle cx={CX} cy={CY} r={HUB_R} fill={accent} opacity={0.08} />
        <foreignObject x={CX - HUB_R + 10} y={CY - HUB_R + 12} width={HUB_R * 2 - 20} height={HUB_R * 2 - 24}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: "100%", textAlign: "center",
              fontFamily: "inherit",
            }}
          >
            <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.2, color: accent }}>{hubTitle}</div>
            {hubSub ? <div style={{ marginTop: 5, fontSize: 12, color: T.faint }}>{hubSub}</div> : null}
          </div>
        </foreignObject>
      </motion.g>
    </svg>
  );
}

function BiosecurityIntro({ T, onPick }) {
  const [level, setLevel] = useState(0);      // 0 — ядро, 1 — два контура, 2 — направления, 3 — подсписок
  const [contour, setContour] = useState(null);
  const [task, setTask] = useState(null);

  const accent = contour === "internal" ? T.cyan : T.violet;
  const crumbs = [
    { label: "Биобезопасность", onClick: () => { setLevel(0); setContour(null); setTask(null); } },
    ...(level >= 1 ? [{ label: "Два контура", onClick: () => { setLevel(1); setContour(null); setTask(null); } }] : []),
    ...(level >= 2 && contour ? [{ label: CONTOURS[contour].title, onClick: () => { setLevel(2); setTask(null); } }] : []),
    ...(level >= 3 && task ? [{ label: task.name, onClick: null }] : []),
  ];

  const back = () => {
    if (level === 3) { setLevel(2); setTask(null); }
    else if (level === 2) { setLevel(1); setContour(null); }
    else if (level === 1) setLevel(0);
  };

  return (
    <div>
      {/* навигация по уровням */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={back}
          disabled={level === 0}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13.5px] transition-opacity disabled:opacity-35"
          style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}
        >
          <ChevronDown size={14} style={{ transform: "rotate(90deg)" }} />
          назад
        </button>
        <div className="flex flex-wrap items-center gap-1.5 text-[13.5px]">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1.5">
              {i > 0 && <span style={{ color: T.faint }}>›</span>}
              <button
                onClick={c.onClick || undefined}
                className="rounded-lg px-2 py-1"
                style={{
                  color: i === crumbs.length - 1 ? T.text : T.muted,
                  fontWeight: i === crumbs.length - 1 ? 600 : 400,
                  background: i === crumbs.length - 1 ? T.panelHi : "transparent",
                  cursor: c.onClick ? "pointer" : "default",
                }}
              >
                {c.label}
              </button>
            </span>
          ))}
        </div>
        {level >= 2 && contour && (
          <button
            onClick={() => onPick(contour)}
            className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13.5px]"
            style={{ background: T.panelHi, border: `1px solid ${T.border}`, color: accent }}
          >
            полный список ниже
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      <motion.div
        layout
        transition={{ duration: 0.45, ease: EASE }}
        onClick={() => { if (level <= 1) setLevel(level === 0 ? 1 : 0); }}
        className={`relative overflow-hidden rounded-2xl outline-none ${level <= 1 ? "cursor-pointer select-none" : ""}`}
        style={{ background: T.panel, border: `1px solid ${T.border}` }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(60% 70% at 22% 40%, ${T.glowA}, transparent 70%), radial-gradient(55% 65% at 78% 60%, ${T.glowB}, transparent 70%)`,
          }}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={level >= 2 ? `${level}-${contour}-${task ? task.id : ""}` : "orbit"}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {level <= 1 ? (
              <IntroOrbit
                T={T}
                split={level === 1}
                onContour={(c) => { setContour(c); setLevel(2); }}
              />
            ) : level === 2 ? (
              <MindMap
                T={T}
                accent={accent}
                hubTitle={CONTOURS[contour].title}
                hubSub={`${CONTOURS[contour].items.length} направлений`}
                items={CONTOURS[contour].items.map((t) => ({ key: t.id, label: t.name, task: t }))}
                onItem={(it) => { setTask(it.task); setLevel(3); }}
              />
            ) : (
              <MindMap
                T={T}
                accent={accent}
                hubTitle={task.name}
                items={subItemsOf(task).map((x, i) => ({ key: `${task.id}-${i}`, label: x }))}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function BiosecurityExecutiveDashboard() {
  const [theme, setTheme] = useState("light");
  const [period, setPeriod] = useState("week");
  const [open, setOpen] = useState("external");   // 'external' | 'internal' | null
  const contoursRef = useRef(null);
  const T = THEMES[theme];

  /* из интро — сразу в список направлений выбранного контура */
  const goToContour = (c) => {
    setOpen(c);
    setTimeout(() => contoursRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const P = PERIODS[period];
  const demand = Math.round(METRICS.demandWeek * P.k);
  const capacity = Math.round(METRICS.capacityWeek * P.k);
  const loadAfter = Math.round((METRICS.demandWeek / (METRICS.requiredStaff * HOURS_PER_STAFF)) * 100);

  const stats = [
    { label: "Загрузка службы", value: METRICS.load, suffix: "%", color: T.red, progress: 100, icon: Gauge,
      note: `${STAFF} специалиста работают почти за четверых при норме 100%` },
    { label: "Покрытие", value: METRICS.coverage, suffix: "%", color: T.amber, progress: METRICS.coverage, icon: ShieldCheck,
      note: `${TASKS.length} направлений контроля` },
    { label: `Объём задач · ${P.label.toLowerCase()}`, value: demand, suffix: "ч", color: T.violet, progress: 100, icon: Activity,
      note: `ёмкость службы — ${capacity} ч` },
    { label: "Дефицит штата", value: METRICS.gap, prefix: "+", suffix: "ед.", color: T.teal, progress: (METRICS.gap / METRICS.requiredStaff) * 100, icon: UserPlus,
      note: `нужно ${METRICS.requiredStaff} вместо ${STAFF}; охват вырастет до 100%` },
  ];

  return (
    <div className="relative min-h-screen w-full" style={{ color: T.text }}>
      <PremiumBackground T={T} />
      <BrandRail T={T} />

      <div className="relative mx-auto max-w-[1280px] px-4 py-8 sm:px-7 sm:py-10">
        <Header T={T} period={period} setPeriod={setPeriod} theme={theme} setTheme={setTheme} />

        {/* ── ЧТО ТАКОЕ БИОБЕЗОПАСНОСТЬ ───────────────────────────────── */}
        <div className="mt-7">
          <Panel T={T}>
            <SectionHead T={T} title="Биобезопасность" />
            <BiosecurityIntro T={T} onPick={goToContour} />
          </Panel>
        </div>

        <div className="mt-5 flex flex-wrap gap-4">
          {stats.map((s, i) => <StatCard key={s.label} T={T} item={s} index={i} />)}
        </div>

        {/* ── ДВА КОНТУРА ─────────────────────────────────────────────── */}
        <div className="mt-5 scroll-mt-6" ref={contoursRef}>
          <Panel T={T}>
            <div className="mb-4 flex justify-end">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-[14px]"
                   style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}>
                <ArrowRight size={13} color={T.cyan} />
                {open ? `открыт: ${CONTOURS[open].title.toLowerCase()}` : "оба контура свёрнуты"}
              </div>
            </div>
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
            <SectionHead T={T} eyebrow="Распределение нагрузки"
                         title={`Весь объём задач распределяется на ${STAFF} специалистов`} />
            <WorkloadStage T={T} />
          </Panel>
        </div>

        {/* ── СРАВНЕНИЕ ШТАТА ─────────────────────────────────────────── */}
        <div className="mt-5">
          <Panel T={T}>
            <SectionHead
              T={T}
              eyebrow="Расчёт по найму"
              title={`Сейчас ${STAFF} специалиста · требуется ${METRICS.requiredStaff}`}
              right={
                <div className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-[14px]"
                     style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}>
                  <Clock size={14} color={T.violet} />
                  норма {HOURS_PER_STAFF} ч в неделю на человека
                </div>
              }
            />
            <StaffingComparison T={T} />
          </Panel>
        </div>

        {/* ── РОЛИК ВНЕШНЕГО ПОТОКА ───────────────────────────────────── */}
        <div className="mt-5">
          <Panel T={T}>
            <SectionHead
              T={T}
              eyebrow="Внешний контур · видеоматериал"
              title="Входной контроль внешнего периметра: от дороги до складов"
              right={
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-[14px]"
                     style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.muted }}>
                  <ArrowRight size={13} color={T.violet} />
                  дезбарьер · санпропускник · склады
                </div>
              }
            />
            <ExternalFlowVideo T={T} />
          </Panel>
        </div>

        {/* ── КАРТА ПЕРЕМЕЩЕНИЙ ───────────────────────────────────────── */}
        <div className="mt-5">
          <Panel T={T}>
            <SectionHead
              T={T}
              eyebrow="Внутренний контур · логистика"
              title="Внутренний входной контроль: от склада до БП, инкубатора, АТЦ и офисных помещений"
            />
            <div className="overflow-x-auto">
              <LogisticsMap T={T} />
            </div>
          </Panel>
        </div>

        {/* ── АНАЛИТИКА ───────────────────────────────────────────────── */}
        <div className="mt-5">
          <Panel T={T}>
            <SectionHead
              T={T}
              eyebrow="Аналитика нагрузки"
              title={`Сколько работы приходит и сколько служба успевает · ${P.label.toLowerCase()}`}
              right={
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-[14px]"
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
            <div className="mb-4 grid gap-2.5 sm:grid-cols-3">
              {[
                { c: T.violet, dash: false, t: "Фиолетовая линия", d: "сколько работы приходит по регламенту — все проверки, обходы, документы, которые положено выполнить" },
                { c: T.teal, dash: true, t: "Зелёный пунктир", d: `сколько физически могут сделать ${STAFF} специалиста — 8 часов в день на человека, больше в сутках нет` },
                { c: T.red, dash: false, t: "Разрыв между ними", d: "работа, до которой никто не дошёл: непроверенные партии, пропущенные обходы, несделанные аудиты" },
              ].map((x, i) => (
                <motion.div
                  key={x.t}
                  initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="rounded-xl px-3.5 py-3"
                  style={{ background: T.panel, border: `1px solid ${T.border}` }}
                >
                  <div className="flex items-center gap-2.5">
                    <svg width="26" height="10" style={{ flexShrink: 0 }}>
                      <line x1="1" y1="5" x2="25" y2="5" stroke={x.c} strokeWidth="3"
                            strokeLinecap="round" strokeDasharray={x.dash ? "5 4" : undefined} />
                    </svg>
                    <span className="text-[15px] font-semibold" style={{ color: T.text }}>{x.t}</span>
                  </div>
                  <div className="mt-1.5 text-[13.5px] leading-snug" style={{ color: T.muted }}>{x.d}</div>
                </motion.div>
              ))}
            </div>

            <ChartPanel T={T} period={period} open={open} />

            <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: T.muted }}>
              Всё, что на графике выше зелёного пунктира, — <b style={{ color: T.text }}>не выполняется</b>.
              Двое расходуют свой ресурс полностью, поэтому дело не в темпе работы: физически
              нельзя сделать {METRICS.demandWeek} часов силами {METRICS.capacityWeek}-часовой службы.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { l: "Самый тяжёлый день недели", v: `${Math.max(...P.demand.map((d, i) => (P.capacity[i] ? Math.round((d / P.capacity[i]) * 100) : 0)))}%`, c: T.red },
                { l: "Не сделано за период", v: `${Math.round(METRICS.deficitHours * P.k)} ч`, c: T.amber },
                { l: `Станет после +${METRICS.gap} человек`, v: `${loadAfter}%`, c: T.teal },
              ].map((x, i) => (
                <motion.div key={x.l}
                            initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.5 }}
                            className="flex items-center justify-between rounded-xl px-4 py-3"
                            style={{ background: T.panel, border: `1px solid ${T.border}` }}>
                  <span className="text-[14.5px]" style={{ color: T.muted }}>{x.l}</span>
                  <span className="text-[19px] font-semibold" style={{ color: x.c }}>{x.v}</span>
                </motion.div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13.5px]" style={{ color: T.faint }}>
          <span>
            Расчёт по {TASKS.length} направлениям · норма {HOURS_PER_STAFF} ч/нед на специалиста ·
            все показатели вычисляются из единой таблицы задач
          </span>
          <span className="font-mono">Отдел биобезопасности · v6.0</span>
        </div>
      </div>

    </div>
  );
}
