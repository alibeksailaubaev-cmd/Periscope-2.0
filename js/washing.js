"use strict";

/**
 * Разделы «Качество мойки» и «Качество смывов» общего дэшборда (aitas ukpf).
 *  — «Акт приёма мойки» (.xlsx, фиксированная структура: Дата/Балл/Несоответствие…)
 *  — «Смывы / вода» (.xlsx или .csv, структура произвольная — колонки сопоставляются вручную)
 * У каждого раздела свой независимый фильтр по неделе. Всё считается и хранится
 * локально (localStorage), бэкенд не нужен.
 */

const ACT_STORAGE_KEY = "aitas_act_datasets_v1";
const MB_STORAGE_KEY = "aitas_washing_datasets_v1";

const FAIL_WORDS = ["не соответств", "брак", "fail", "неудовлетвор", "превыш", "обнаруж"];
const PASS_WORDS = ["соответств", "норма", "pass", "удовлетвор", "не обнаруж", "ок", "годно"];

const MB_FIELD_PATTERNS = {
  date: ["дата", "date"],
  zone: ["точка", "зона", "участок", "место", "объект", "location", "zone", "цех", "площадк"],
  indicator: ["показат", "тест", "parameter", "возбудит", "микроорг", "indicator"],
  result: ["результат", "result", "значен", "value", "кое", "титр"],
  norm: ["норматив", "норма", "predel", "предел", "limit", "norm"],
  status: ["статус", "заключен", "status", "соответств", "вывод", "conclusion"],
};

const wEls = {
  dzAct: document.getElementById("dzAct"),
  fieldActFile: document.getElementById("fieldActFile"),
  actStatus: document.getElementById("actStatus"),
  actFileChips: document.getElementById("actFileChips"),

  dzMb: document.getElementById("dzMb"),
  fieldMbFile: document.getElementById("fieldMbFile"),
  mbStatus: document.getElementById("mbStatus"),
  mbFileChips: document.getElementById("mbFileChips"),
  zoneChipRow: document.getElementById("zoneChipRow"),

  actControlsBar: document.getElementById("actControlsBar"),
  actWeekSelect: document.getElementById("actWeekSelect"),
  actWeekInput: document.getElementById("actWeekInput"),
  actBtnApplyWeek: document.getElementById("actBtnApplyWeek"),
  actBtnResetWeek: document.getElementById("actBtnResetWeek"),
  actRangeBadge: document.getElementById("actRangeBadge"),

  mbControlsBar: document.getElementById("mbControlsBar"),
  mbWeekSelect: document.getElementById("mbWeekSelect"),
  mbWeekInput: document.getElementById("mbWeekInput"),
  mbBtnApplyWeek: document.getElementById("mbBtnApplyWeek"),
  mbBtnResetWeek: document.getElementById("mbBtnResetWeek"),
  mbRangeBadge: document.getElementById("mbRangeBadge"),

  actEmptyState: document.getElementById("actEmptyState"),
  actKpiRow: document.getElementById("actKpiRow"),
  actKpiChecks: document.getElementById("actKpiChecks"),
  actKpiAvg: document.getElementById("actKpiAvg"),
  actKpiViol: document.getElementById("actKpiViol"),
  actKpiCritical: document.getElementById("actKpiCritical"),
  actKpiFirstTry: document.getElementById("actKpiFirstTry"),
  actTrendCard: document.getElementById("actTrendCard"),
  chartActTrend: document.getElementById("chartActTrend"),
  actBottomGrid: document.getElementById("actBottomGrid"),
  chartActWeekly: document.getElementById("chartActWeekly"),
  actIncidentList: document.getElementById("actIncidentList"),
  actViolCount: document.getElementById("actViolCount"),

  mbEmptyState: document.getElementById("mbEmptyState"),
  kpiRow: document.getElementById("kpiRow"),
  kpiTotal: document.getElementById("kpiTotal"),
  kpiPassRate: document.getElementById("kpiPassRate"),
  kpiFail: document.getElementById("kpiFail"),
  kpiZones: document.getElementById("kpiZones"),
  chartsGrid: document.getElementById("chartsGrid"),
  chartTrend: document.getElementById("chartTrend"),
  legendTrend: document.getElementById("legendTrend"),
  chartZones: document.getElementById("chartZones"),
  chartDonut: document.getElementById("chartDonut"),
  tableCard: document.getElementById("tableCard"),
  tableSearch: document.getElementById("tableSearch"),
  dataTableHead: document.getElementById("dataTableHead"),
  dataTableBody: document.getElementById("dataTableBody"),
  tableFooter: document.getElementById("tableFooter"),

  uploadDialog: document.getElementById("uploadDialog"),
  cancelUploadBtn: document.getElementById("cancelUploadBtn"),
  buildChartsBtn: document.getElementById("buildChartsBtn"),
  mappingFileInfo: document.getElementById("mappingFileInfo"),
  mappingPreview: document.getElementById("mappingPreview"),
  mapDate: document.getElementById("mapDate"),
  mapZone: document.getElementById("mapZone"),
  mapIndicator: document.getElementById("mapIndicator"),
  mapResult: document.getElementById("mapResult"),
  mapNorm: document.getElementById("mapNorm"),
  mapStatus: document.getElementById("mapStatus"),
};

const wState = {
  actDatasets: wLoadJson(ACT_STORAGE_KEY, []),
  mbDatasets: wLoadJson(MB_STORAGE_KEY, []),
  actWeek: null,
  mbWeek: null,
  zone: null,
  search: "",
  pendingMb: null, // { filename, headers, rows }
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function wLoadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.warn("Не удалось прочитать локальные данные", err);
    return fallback;
  }
}

function saveActDatasets() {
  try {
    localStorage.setItem(ACT_STORAGE_KEY, JSON.stringify(wState.actDatasets));
  } catch (err) {
    console.warn("Не удалось сохранить данные акта мойки локально", err);
  }
}

function saveMbDatasets() {
  try {
    localStorage.setItem(MB_STORAGE_KEY, JSON.stringify(wState.mbDatasets));
  } catch (err) {
    console.warn("Не удалось сохранить данные смывов локально (файл может быть слишком большим)", err);
  }
}

function wCryptoId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Даты / недели (ISO, понедельник — начало недели)
// ---------------------------------------------------------------------------

function excelToDate(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const utcDays = Math.floor(v - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    let m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
    if (m) {
      let [, d, mo, y] = m;
      if (y.length === 2) y = `20${y}`;
      const dt = new Date(Number(y), Number(mo) - 1, Number(d));
      if (!isNaN(dt.getTime())) return dt;
    }
    const d2 = new Date(s);
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

function isoWeekRange(year, week) {
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Day);
  const start = new Date(week1Monday);
  start.setDate(week1Monday.getDate() + (week - 1) * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getIsoWeek(date) {
  const day = (date.getDay() + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
  for (const y of [monday.getFullYear(), monday.getFullYear() - 1, monday.getFullYear() + 1]) {
    const jan4 = new Date(y, 0, 4);
    const jan4Day = (jan4.getDay() + 6) % 7;
    const week1Monday = new Date(jan4);
    week1Monday.setDate(jan4.getDate() - jan4Day);
    const diffWeeks = Math.round((monday - week1Monday) / (7 * 86400000));
    if (diffWeeks >= 0 && diffWeeks <= 52) return { year: y, week: diffWeeks + 1 };
  }
  return { year: monday.getFullYear(), week: 1 };
}

function inWeek(date, weekFilter) {
  if (!weekFilter || !date) return true;
  return date >= weekFilter.start && date <= weekFilter.end;
}

function formatShortDate(d) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function wFormatDate(d) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ---------------------------------------------------------------------------
// XLSX helpers
// ---------------------------------------------------------------------------

function normHeader(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\s+/g, " ").trim().toLowerCase();
}

function cellToString(v) {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    const dd = String(v.getDate()).padStart(2, "0");
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.${v.getFullYear()}`;
  }
  return String(v);
}

// ---------------------------------------------------------------------------
// Парсинг «Акт приёма мойки» (фиксированная структура)
// ---------------------------------------------------------------------------

const ACT_MATCHERS = {
  date: (h) => h === "дата",
  score: (h) => h === "балл",
  avgScore: (h) => h.startsWith("средний балл"),
  shift: (h) => h === "время суток",
  note: (h) => h.includes("несоответствие"),
  detergent: (h) => h.includes("моющее"),
  disinfectant: (h) => h.includes("дезинфиц"),
  firstTry: (h) => h.includes("приемка") || h.includes("первого раза"),
  correction: (h) => h.includes("коррекц"),
};

function parseActWorkbook(wb) {
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

    let headerRowIdx = -1;
    const colMap = {};
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      const row = rows[r];
      if (!row) continue;
      const found = {};
      row.forEach((cell, ci) => {
        const h = normHeader(cell);
        if (!h) return;
        Object.entries(ACT_MATCHERS).forEach(([field, test]) => {
          if (found[field] === undefined && test(h)) found[field] = ci;
        });
      });
      if (found.date !== undefined && found.score !== undefined) {
        headerRowIdx = r;
        Object.assign(colMap, found);
        break;
      }
    }

    if (headerRowIdx === -1) continue;

    const result = [];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const scoreRaw = row[colMap.score];
      if (scoreRaw === null || scoreRaw === undefined || scoreRaw === "") continue;
      const score = Number(scoreRaw);
      if (isNaN(score)) continue;
      const date = excelToDate(row[colMap.date]);
      if (!date) continue;

      const firstTryRaw = colMap.firstTry !== undefined ? cellToString(row[colMap.firstTry]).toLowerCase() : "";
      const correctionRaw = colMap.correction !== undefined ? cellToString(row[colMap.correction]).toLowerCase() : "";

      result.push({
        dateISO: date.toISOString(),
        shift: colMap.shift !== undefined ? cellToString(row[colMap.shift]) : "",
        score,
        avgScore: colMap.avgScore !== undefined ? Number(row[colMap.avgScore]) || null : null,
        note: colMap.note !== undefined ? cellToString(row[colMap.note]).trim() : "",
        detergent: colMap.detergent !== undefined ? cellToString(row[colMap.detergent]) : "",
        disinfectant: colMap.disinfectant !== undefined ? cellToString(row[colMap.disinfectant]) : "",
        firstTryOk: firstTryRaw.includes("первого") && !firstTryRaw.includes("второго"),
        correctionDone: !/^не\b/.test(correctionRaw.trim()) && correctionRaw.includes("проведен"),
        violation: score < 10,
        severity: score >= 9 ? "ok" : score === 8 ? "warning" : "critical",
      });
    }

    if (result.length) {
      result.sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
      return result;
    }
  }

  throw new Error('Не найден лист с колонками «Дата» и «Балл». Проверьте структуру файла акта мойки.');
}

// ---------------------------------------------------------------------------
// Парсинг «Смывы / вода» — CSV
// ---------------------------------------------------------------------------

function parseCsv(text) {
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r\n|\r|\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return { headers: [], rows: [] };

  const commaCount = (lines[0].match(/,/g) || []).length;
  const semiCount = (lines[0].match(/;/g) || []).length;
  const delim = semiCount > commaCount ? ";" : ",";

  function parseLine(line) {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        result.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result.map((s) => s.trim());
  }

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => (obj[h] = values[i] ?? ""));
    return obj;
  });

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Парсинг «Смывы / вода» — XLSX (произвольная структура)
// ---------------------------------------------------------------------------

function parseXlsxGeneric(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows2d = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });

  let headerIdx = -1;
  for (let r = 0; r < Math.min(rows2d.length, 10); r++) {
    const nonEmpty = (rows2d[r] || []).filter((c) => c !== null && c !== "").length;
    if (nonEmpty >= 2) {
      headerIdx = r;
      break;
    }
  }
  if (headerIdx === -1) return { headers: [], rows: [] };

  const headers = rows2d[headerIdx].map((h) => cellToString(h).trim());
  const rows = rows2d
    .slice(headerIdx + 1)
    .filter((r) => r.some((c) => c !== null && c !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = cellToString(r[i])));
      return obj;
    });

  return { headers, rows };
}

function normalizeMbHeader(h) {
  return h.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
}

function guessMbMapping(headers) {
  const mapping = {};
  for (const field of Object.keys(MB_FIELD_PATTERNS)) {
    const patterns = MB_FIELD_PATTERNS[field];
    const match = headers.find((h) => {
      const nh = normalizeMbHeader(h);
      return patterns.some((p) => nh.includes(p.replace(/[^a-zа-яё0-9]/gi, "")));
    });
    mapping[field] = match || "";
  }
  return mapping;
}

function parseNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const m = String(raw).replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function resolveMbStatus(row, mapping) {
  if (mapping.status && row[mapping.status]) {
    const v = row[mapping.status].toLowerCase();
    if (FAIL_WORDS.some((w) => v.includes(w))) return "fail";
    if (PASS_WORDS.some((w) => v.includes(w))) return "pass";
  }
  if (mapping.result && mapping.norm) {
    const resultNum = parseNumber(row[mapping.result]);
    const normNum = parseNumber(row[mapping.norm]);
    if (resultNum !== null && normNum !== null) {
      return resultNum > normNum ? "fail" : "pass";
    }
  }
  if (mapping.result && !mapping.status) {
    const v = (row[mapping.result] || "").toLowerCase();
    if (FAIL_WORDS.some((w) => v.includes(w))) return "fail";
    if (PASS_WORDS.some((w) => v.includes(w))) return "pass";
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// Производные данные — Акт мойки
// ---------------------------------------------------------------------------

function getIncludedActDatasets() {
  return wState.actDatasets.filter((d) => d.included !== false);
}

function getAllActRows() {
  const out = [];
  getIncludedActDatasets().forEach((ds) => {
    ds.rows.forEach((r) => out.push({ ...r, date: new Date(r.dateISO) }));
  });
  return out.sort((a, b) => a.date - b.date);
}

function getFilteredActRows() {
  return getAllActRows().filter((r) => inWeek(r.date, wState.actWeek));
}

// ---------------------------------------------------------------------------
// Производные данные — Смывы / вода
// ---------------------------------------------------------------------------

function getIncludedMbDatasets() {
  return wState.mbDatasets.filter((d) => d.included !== false);
}

function getAllMbRows() {
  const out = [];
  getIncludedMbDatasets().forEach((ds) => {
    ds.rows.forEach((raw, idx) => {
      const m = ds.mapping;
      out.push({
        id: `${ds.id}_${idx}`,
        datasetId: ds.id,
        date: m.date ? excelToDate(raw[m.date]) : null,
        dateRaw: m.date ? raw[m.date] : "",
        zone: (m.zone && raw[m.zone]) || "Без указания",
        indicator: m.indicator ? raw[m.indicator] : "",
        result: m.result ? raw[m.result] : "",
        norm: m.norm ? raw[m.norm] : "",
        status: resolveMbStatus(raw, m),
      });
    });
  });
  return out;
}

function getFilteredMbRows() {
  let rows = getAllMbRows().filter((r) => inWeek(r.date, wState.mbWeek));
  if (wState.zone) rows = rows.filter((r) => r.zone === wState.zone);
  return rows;
}

// ---------------------------------------------------------------------------
// SVG chart helpers (общие)
// ---------------------------------------------------------------------------

function svgEl(tag, attrs) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function ensureTooltip(container) {
  let tip = container.querySelector(".chart-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "chart-tooltip";
    container.appendChild(tip);
  }
  return tip;
}

function showTooltip(container, tip, evt, html) {
  const rect = container.getBoundingClientRect();
  tip.innerHTML = html;
  tip.style.left = `${evt.clientX - rect.left}px`;
  tip.style.top = `${evt.clientY - rect.top}px`;
  tip.classList.add("visible");
}

function hideTooltip(tip) {
  tip.classList.remove("visible");
}

// ---------------------------------------------------------------------------
// Файл-чипы (список загруженных датасетов вместо боковой панели)
// ---------------------------------------------------------------------------

function renderFileChips(container, datasets, onToggle, onRemove) {
  container.hidden = datasets.length === 0;
  container.innerHTML = "";
  datasets
    .slice()
    .reverse()
    .forEach((ds) => {
      const chip = document.createElement("span");
      chip.className = "file-chip";
      chip.innerHTML = `
        <input type="checkbox" ${ds.included !== false ? "checked" : ""} />
        <b>${escapeHtml(ds.filename)}</b>
        <span>· ${ds.rows.length} строк</span>
        <button type="button" class="file-chip-remove" title="Удалить">✕</button>
      `;
      chip.querySelector('input[type="checkbox"]').addEventListener("change", (e) => onToggle(ds, e.target.checked));
      chip.querySelector(".file-chip-remove").addEventListener("click", () => {
        if (confirm(`Удалить файл «${ds.filename}»?`)) onRemove(ds);
      });
      container.appendChild(chip);
    });
}

// ---------------------------------------------------------------------------
// Акт мойки: фильтр по неделе
// ---------------------------------------------------------------------------

function renderActControlsBar() {
  const rows = getAllActRows();
  wEls.actControlsBar.hidden = rows.length === 0;
  if (!rows.length) return;

  const weekMap = new Map();
  rows.forEach((r) => {
    const iw = getIsoWeek(r.date);
    weekMap.set(`${iw.year}-${iw.week}`, iw);
  });

  const current = wState.actWeek ? `${wState.actWeek.year}-${wState.actWeek.week}` : "";
  wEls.actWeekSelect.innerHTML = '<option value="">Весь период</option>';
  [...weekMap.entries()]
    .sort((a, b) => a[1].year - b[1].year || a[1].week - b[1].week)
    .forEach(([key, iw]) => {
      const { start, end } = isoWeekRange(iw.year, iw.week);
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${iw.week} неделя (${formatShortDate(start)}–${formatShortDate(end)})`;
      if (key === current) opt.selected = true;
      wEls.actWeekSelect.appendChild(opt);
    });

  wEls.actRangeBadge.textContent = wState.actWeek
    ? `${wState.actWeek.week} неделя · ${formatShortDate(wState.actWeek.start)}–${formatShortDate(wState.actWeek.end)}`
    : "Весь период";
}

wEls.actWeekSelect.addEventListener("change", () => {
  const val = wEls.actWeekSelect.value;
  if (!val) {
    wState.actWeek = null;
  } else {
    const [year, week] = val.split("-").map(Number);
    const { start, end } = isoWeekRange(year, week);
    wState.actWeek = { year, week, start, end };
  }
  renderActSection();
  renderActControlsBar();
});

wEls.actBtnApplyWeek.addEventListener("click", () => {
  const weekNum = parseInt(wEls.actWeekInput.value, 10);
  if (!weekNum || weekNum < 1 || weekNum > 53) return;
  const dates = getAllActRows().map((r) => r.date);
  const year = dates.length ? getIsoWeek(dates[0]).year : new Date().getFullYear();
  const { start, end } = isoWeekRange(year, weekNum);
  wState.actWeek = { year, week: weekNum, start, end };
  renderActSection();
  renderActControlsBar();
});

wEls.actBtnResetWeek.addEventListener("click", () => {
  wState.actWeek = null;
  wEls.actWeekInput.value = "";
  renderActSection();
  renderActControlsBar();
});

// ---------------------------------------------------------------------------
// Смывы: фильтр по неделе + точкам контроля
// ---------------------------------------------------------------------------

function renderMbControlsBar() {
  const rows = getAllMbRows().filter((r) => r.date);
  wEls.mbControlsBar.hidden = rows.length === 0;
  if (!rows.length) return;

  const weekMap = new Map();
  rows.forEach((r) => {
    const iw = getIsoWeek(r.date);
    weekMap.set(`${iw.year}-${iw.week}`, iw);
  });

  const current = wState.mbWeek ? `${wState.mbWeek.year}-${wState.mbWeek.week}` : "";
  wEls.mbWeekSelect.innerHTML = '<option value="">Весь период</option>';
  [...weekMap.entries()]
    .sort((a, b) => a[1].year - b[1].year || a[1].week - b[1].week)
    .forEach(([key, iw]) => {
      const { start, end } = isoWeekRange(iw.year, iw.week);
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${iw.week} неделя (${formatShortDate(start)}–${formatShortDate(end)})`;
      if (key === current) opt.selected = true;
      wEls.mbWeekSelect.appendChild(opt);
    });

  wEls.mbRangeBadge.textContent = wState.mbWeek
    ? `${wState.mbWeek.week} неделя · ${formatShortDate(wState.mbWeek.start)}–${formatShortDate(wState.mbWeek.end)}`
    : "Весь период";
}

wEls.mbWeekSelect.addEventListener("change", () => {
  const val = wEls.mbWeekSelect.value;
  if (!val) {
    wState.mbWeek = null;
  } else {
    const [year, week] = val.split("-").map(Number);
    const { start, end } = isoWeekRange(year, week);
    wState.mbWeek = { year, week, start, end };
  }
  renderMbSection();
  renderMbControlsBar();
});

wEls.mbBtnApplyWeek.addEventListener("click", () => {
  const weekNum = parseInt(wEls.mbWeekInput.value, 10);
  if (!weekNum || weekNum < 1 || weekNum > 53) return;
  const dates = getAllMbRows().filter((r) => r.date).map((r) => r.date);
  const year = dates.length ? getIsoWeek(dates[0]).year : new Date().getFullYear();
  const { start, end } = isoWeekRange(year, weekNum);
  wState.mbWeek = { year, week: weekNum, start, end };
  renderMbSection();
  renderMbControlsBar();
});

wEls.mbBtnResetWeek.addEventListener("click", () => {
  wState.mbWeek = null;
  wState.zone = null;
  wEls.mbWeekInput.value = "";
  renderMbSection();
  renderMbControlsBar();
});

function renderZoneChips() {
  const rows = getAllMbRows();
  wEls.zoneChipRow.hidden = rows.length === 0;
  wEls.zoneChipRow.innerHTML = "";
  if (!rows.length) return;

  const zoneMap = new Map();
  rows.forEach((r) => zoneMap.set(r.zone, (zoneMap.get(r.zone) || 0) + 1));

  const allChip = document.createElement("button");
  allChip.className = "zone-chip" + (wState.zone ? "" : " active");
  allChip.textContent = `Все точки (${rows.length})`;
  allChip.addEventListener("click", () => setZone(null));
  wEls.zoneChipRow.appendChild(allChip);

  [...zoneMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([zone, count]) => {
      const chip = document.createElement("button");
      chip.className = "zone-chip" + (wState.zone === zone ? " active" : "");
      chip.innerHTML = `${escapeHtml(zone)} <span class="count">${count}</span>`;
      chip.addEventListener("click", () => setZone(zone));
      wEls.zoneChipRow.appendChild(chip);
    });
}

function setZone(zone) {
  wState.zone = wState.zone === zone ? null : zone;
  renderZoneChips();
  renderMbSection();
}

// ---------------------------------------------------------------------------
// Акт мойки: рендер
// ---------------------------------------------------------------------------

function severityColor(sev) {
  return sev === "critical" ? "var(--status-critical)" : sev === "warning" ? "var(--status-warning)" : "var(--status-good)";
}

function renderActSection() {
  const hasAct = getIncludedActDatasets().length > 0 && getAllActRows().length > 0;
  wEls.actEmptyState.hidden = hasAct;
  wEls.actKpiRow.hidden = !hasAct;
  wEls.actTrendCard.hidden = !hasAct;
  wEls.actBottomGrid.hidden = !hasAct;
  if (!hasAct) return;

  const rows = getFilteredActRows();

  const checks = rows.length;
  const avg = checks ? rows.reduce((s, r) => s + r.score, 0) / checks : 0;
  const violations = rows.filter((r) => r.violation).length;
  const critical = rows.filter((r) => r.severity === "critical").length;
  const firstTryPct = checks ? Math.round((rows.filter((r) => r.firstTryOk).length / checks) * 100) : 0;

  wEls.actKpiChecks.textContent = checks;
  wEls.actKpiAvg.textContent = checks ? avg.toFixed(1) : "—";
  wEls.actKpiViol.textContent = violations;
  wEls.actKpiCritical.textContent = critical;
  wEls.actKpiFirstTry.textContent = `${firstTryPct}%`;

  renderActTrendChart(rows);
  renderActWeeklyChart(rows);
  renderActIncidents(rows);
}

function renderActTrendChart(rows) {
  const container = wEls.chartActTrend;
  container.innerHTML = "";

  if (!rows.length) {
    container.innerHTML = '<div class="chart-empty">Нет данных за выбранный период</div>';
    return;
  }

  const W = 900;
  const H = 260;
  const padL = 30;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const minScore = Math.min(6, Math.min(...rows.map((r) => r.score)) - 0.5);
  const maxScore = 10.3;

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });

  const yFor = (score) => padT + (1 - (score - minScore) / (maxScore - minScore)) * plotH;
  const xFor = (i) => (rows.length === 1 ? padL + plotW / 2 : padL + (i / (rows.length - 1)) * plotW);

  const zoneBands = [
    { from: 9, to: maxScore, color: "var(--status-good)", opacity: 0.06 },
    { from: 8, to: 9, color: "var(--status-warning)", opacity: 0.08 },
    { from: minScore, to: 8, color: "var(--status-critical)", opacity: 0.07 },
  ];
  zoneBands.forEach((band) => {
    if (band.to <= minScore) return;
    const y1 = yFor(Math.min(band.to, maxScore));
    const y2 = yFor(Math.max(band.from, minScore));
    svg.appendChild(svgEl("rect", { x: padL, y: y1, width: plotW, height: Math.max(y2 - y1, 0), fill: band.color, opacity: band.opacity }));
  });

  [6, 7, 8, 9, 10].forEach((v) => {
    if (v < minScore) return;
    const y = yFor(v);
    svg.appendChild(svgEl("line", { x1: padL, x2: W - padR, y1: y, y2: y, class: "grid-line" }));
    const label = svgEl("text", { x: 4, y: y + 4, class: "axis-label" });
    label.textContent = v;
    svg.appendChild(label);
  });

  const linePath = rows.map((r, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(r.score).toFixed(1)}`).join(" ");
  svg.appendChild(svgEl("path", { d: linePath, class: "trend-line" }));

  const tip = ensureTooltip(container);

  rows.forEach((r, i) => {
    const cx = xFor(i);
    const cy = yFor(r.score);
    const dot = svgEl("circle", { cx, cy, r: 4, fill: severityColor(r.severity), stroke: "var(--surface)", "stroke-width": 1.5, style: "cursor:pointer" });
    dot.addEventListener("mouseenter", (e) =>
      showTooltip(
        container,
        tip,
        e,
        `<b>${wFormatDate(r.date)}</b><br/>Балл: ${r.score}${r.violation ? "" : " (без замечаний)"}${r.note && r.violation ? `<br/>${escapeHtml(r.note).slice(0, 140)}` : ""}`
      )
    );
    dot.addEventListener("mousemove", (e) => showTooltip(container, tip, e, tip.innerHTML));
    dot.addEventListener("mouseleave", () => hideTooltip(tip));
    svg.appendChild(dot);

    if (i % Math.max(1, Math.ceil(rows.length / 12)) === 0 || i === rows.length - 1) {
      const xl = svgEl("text", { x: cx, y: H - 6, class: "axis-label", "text-anchor": "middle" });
      xl.textContent = formatShortDate(r.date);
      svg.appendChild(xl);
    }
  });

  container.appendChild(svg);
  container.appendChild(tip);
}

function renderActWeeklyChart(rows) {
  const container = wEls.chartActWeekly;
  container.innerHTML = "";

  if (!rows.length) {
    container.innerHTML = '<div class="chart-empty">Нет данных за выбранный период</div>';
    return;
  }

  const weekMap = new Map();
  rows.forEach((r) => {
    const iw = getIsoWeek(r.date);
    const key = `${iw.year}-${iw.week}`;
    const entry = weekMap.get(key) || { year: iw.year, week: iw.week, sum: 0, count: 0 };
    entry.sum += r.score;
    entry.count++;
    weekMap.set(key, entry);
  });

  const items = [...weekMap.values()]
    .map((w) => ({ ...w, avg: w.sum / w.count }))
    .sort((a, b) => a.year - b.year || a.week - b.week);

  const W = 400;
  const rowH = 34;
  const H = items.length * rowH + 6;
  const barAreaW = W - 90;

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });

  [6, 7, 8, 9, 10].forEach((v) => {
    const x = (v / 10) * barAreaW;
    svg.appendChild(svgEl("line", { x1: x, x2: x, y1: 0, y2: H, class: "grid-line" }));
  });

  const tip = ensureTooltip(container);

  items.forEach((item, i) => {
    const y0 = i * rowH;
    const label = svgEl("text", { x: 0, y: y0 + 13, class: "bar-label" });
    label.textContent = `${item.week} нед.`;
    svg.appendChild(label);

    const sev = item.avg >= 9 ? "ok" : item.avg >= 8 ? "warning" : "critical";
    const barW = Math.max((item.avg / 10) * barAreaW, 4);
    const bar = svgEl("rect", { x: 0, y: y0 + 18, width: barW, height: 12, rx: 4, fill: severityColor(sev), style: "cursor:pointer" });
    bar.addEventListener("mouseenter", (e) =>
      showTooltip(container, tip, e, `<b>${item.week} неделя</b><br/>Средний балл: ${item.avg.toFixed(1)}<br/>Проверок: ${item.count}`)
    );
    bar.addEventListener("mousemove", (e) => showTooltip(container, tip, e, tip.innerHTML));
    bar.addEventListener("mouseleave", () => hideTooltip(tip));
    svg.appendChild(bar);

    const val = svgEl("text", { x: barW + 8, y: y0 + 27, class: "bar-value" });
    val.textContent = item.avg.toFixed(1);
    svg.appendChild(val);
  });

  container.appendChild(svg);
  container.appendChild(tip);
}

function renderActIncidents(rows) {
  const violations = rows.filter((r) => r.violation).sort((a, b) => b.date - a.date);
  wEls.actViolCount.textContent = `${violations.length} из ${rows.length}`;

  if (!violations.length) {
    wEls.actIncidentList.innerHTML = '<div class="chart-empty">Несоответствий не зафиксировано 🎉</div>';
    return;
  }

  wEls.actIncidentList.innerHTML = violations
    .slice(0, 200)
    .map((r) => {
      const sevClass = r.severity === "critical" ? "" : r.severity === "warning" ? "severity-warning" : "severity-minor";
      const correctionNote = r.correctionDone ? "Коррекция проведена" : "Коррекция не проведена";
      const firstTryNote = r.firstTryOk ? "принято с первого раза" : "принято со второго раза";
      return `
        <div class="incident-item ${sevClass}">
          <div>
            <div class="incident-date">${formatShortDate(r.date)}</div>
            <span class="incident-score">Балл ${r.score}</span>
          </div>
          <div>
            <div class="incident-text">${escapeHtml(r.note) || "—"}</div>
            <div class="incident-meta">${escapeHtml(firstTryNote)} · ${escapeHtml(correctionNote)}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Смывы / вода: рендер
// ---------------------------------------------------------------------------

function renderMbSection() {
  const rows = getFilteredMbRows();
  const hasData = getIncludedMbDatasets().length > 0 && getAllMbRows().length > 0;

  wEls.mbEmptyState.hidden = hasData;
  wEls.kpiRow.hidden = !hasData;
  wEls.chartsGrid.hidden = !hasData;
  wEls.tableCard.hidden = !hasData;

  if (!hasData) return;

  renderMbKpis(rows);
  renderTrendChart(rows);
  renderZonesChart(rows);
  renderDonutChart(rows);
  renderTable(rows);
}

function renderMbKpis(rows) {
  const pass = rows.filter((r) => r.status === "pass").length;
  const fail = rows.filter((r) => r.status === "fail").length;
  const known = pass + fail;
  const passRate = known ? Math.round((pass / known) * 100) : 0;
  const zonesWithFail = new Set(rows.filter((r) => r.status === "fail").map((r) => r.zone)).size;

  wEls.kpiTotal.textContent = rows.length;
  wEls.kpiPassRate.textContent = `${passRate}%`;
  wEls.kpiFail.textContent = fail;
  wEls.kpiZones.textContent = zonesWithFail;
}

function renderTrendChart(rows) {
  const container = wEls.chartTrend;
  container.innerHTML = "";
  wEls.legendTrend.innerHTML = "";

  const dated = rows.filter((r) => r.date && (r.status === "pass" || r.status === "fail"));
  if (!dated.length) {
    container.innerHTML = '<div class="chart-empty">Нет данных с датами для построения тренда</div>';
    return;
  }

  const byDay = new Map();
  dated.forEach((r) => {
    const key = r.date.toISOString().slice(0, 10);
    const entry = byDay.get(key) || { date: new Date(key), pass: 0, fail: 0 };
    if (r.status === "pass") entry.pass++;
    else entry.fail++;
    byDay.set(key, entry);
  });

  const points = [...byDay.values()]
    .sort((a, b) => a.date - b.date)
    .map((e) => ({ ...e, pct: Math.round((e.pass / (e.pass + e.fail)) * 100) }));

  const W = 640;
  const H = 220;
  const padL = 34;
  const padR = 14;
  const padT = 16;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });

  const defs = svgEl("defs", {});
  const grad = svgEl("linearGradient", { id: "trendGradient", x1: "0", y1: "0", x2: "0", y2: "1" });
  grad.appendChild(svgEl("stop", { offset: "0%", "stop-color": "var(--series-1)", "stop-opacity": "0.35" }));
  grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": "var(--series-1)", "stop-opacity": "0" }));
  defs.appendChild(grad);
  svg.appendChild(defs);

  [0, 50, 100].forEach((v) => {
    const y = padT + (1 - v / 100) * plotH;
    svg.appendChild(svgEl("line", { x1: padL, x2: W - padR, y1: y, y2: y, class: "grid-line" }));
    const label = svgEl("text", { x: 4, y: y + 4, class: "axis-label" });
    label.textContent = `${v}%`;
    svg.appendChild(label);
  });

  const xFor = (i) => (points.length === 1 ? padL + plotW / 2 : padL + (i / (points.length - 1)) * plotW);
  const yFor = (pct) => padT + (1 - pct / 100) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(p.pct).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xFor(points.length - 1).toFixed(1)},${padT + plotH} L${xFor(0).toFixed(1)},${padT + plotH} Z`;

  svg.appendChild(svgEl("path", { d: areaPath, class: "trend-area" }));
  svg.appendChild(svgEl("path", { d: linePath, class: "trend-line" }));

  const tip = ensureTooltip(container);

  points.forEach((p, i) => {
    const cx = xFor(i);
    const cy = yFor(p.pct);
    const dot = svgEl("circle", { cx, cy, r: 4, class: "trend-dot" });
    dot.addEventListener("mouseenter", (e) =>
      showTooltip(
        container,
        tip,
        e,
        `<b>${formatShortDate(p.date)}</b><br/>Соответствие: ${p.pct}%<br/>Пройдено: ${p.pass} · Брак: ${p.fail}`
      )
    );
    dot.addEventListener("mousemove", (e) => showTooltip(container, tip, e, tip.innerHTML));
    dot.addEventListener("mouseleave", () => hideTooltip(tip));
    svg.appendChild(dot);

    if (i === 0 || i === points.length - 1 || points.length === 1) {
      const lbl = svgEl("text", { x: cx, y: cy - 10, class: "bar-value", "text-anchor": i === points.length - 1 && i !== 0 ? "end" : "start" });
      lbl.textContent = `${p.pct}%`;
      svg.appendChild(lbl);
    }

    if (i === 0 || i === points.length - 1 || (points.length > 2 && i === Math.floor((points.length - 1) / 2))) {
      const xl = svgEl("text", { x: cx, y: H - 6, class: "axis-label", "text-anchor": "middle" });
      xl.textContent = formatShortDate(p.date);
      svg.appendChild(xl);
    }
  });

  container.appendChild(svg);
  container.appendChild(tip);

  wEls.legendTrend.innerHTML = `<div class="legend-item"><span class="legend-swatch" style="background:var(--series-1)"></span>% соответствия смывов по дате</div>`;
}

function renderZonesChart(rows) {
  const container = wEls.chartZones;
  container.innerHTML = "";

  const zoneMap = new Map();
  rows.forEach((r) => {
    if (r.status !== "fail") return;
    zoneMap.set(r.zone, (zoneMap.get(r.zone) || 0) + 1);
  });

  const items = [...zoneMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([zone, value]) => ({ zone, value }));

  if (!items.length) {
    container.innerHTML = '<div class="chart-empty">Нарушений не зафиксировано 🎉</div>';
    return;
  }

  const W = 400;
  const rowH = 40;
  const H = items.length * rowH + 6;
  const maxVal = Math.max(...items.map((i) => i.value));
  const barAreaW = W - 60;

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none" });

  [0.25, 0.5, 0.75, 1].forEach((f) => {
    const x = f * barAreaW;
    svg.appendChild(svgEl("line", { x1: x, x2: x, y1: 0, y2: H, class: "grid-line" }));
  });

  const tip = ensureTooltip(container);

  items.forEach((item, i) => {
    const y0 = i * rowH;
    const label = svgEl("text", { x: 0, y: y0 + 13, class: "bar-label" });
    label.textContent = item.zone.length > 34 ? item.zone.slice(0, 33) + "…" : item.zone;
    svg.appendChild(label);

    const barW = Math.max((item.value / maxVal) * barAreaW, 4);
    const bar = svgEl("rect", { x: 0, y: y0 + 20, width: barW, height: 12, rx: 4, class: "bar-rect" });
    bar.addEventListener("mouseenter", (e) =>
      showTooltip(container, tip, e, `<b>${escapeHtml(item.zone)}</b><br/>Нарушений: ${item.value}`)
    );
    bar.addEventListener("mousemove", (e) => showTooltip(container, tip, e, tip.innerHTML));
    bar.addEventListener("mouseleave", () => hideTooltip(tip));
    svg.appendChild(bar);

    const val = svgEl("text", { x: barW + 8, y: y0 + 29, class: "bar-value" });
    val.textContent = item.value;
    svg.appendChild(val);
  });

  container.appendChild(svg);
  container.appendChild(tip);
}

function renderDonutChart(rows) {
  const container = wEls.chartDonut;
  container.innerHTML = "";

  const pass = rows.filter((r) => r.status === "pass").length;
  const fail = rows.filter((r) => r.status === "fail").length;
  const unknown = rows.filter((r) => r.status === "unknown").length;
  const total = pass + fail + unknown;

  if (!total) {
    container.innerHTML = '<div class="chart-empty">Нет данных</div>';
    return;
  }

  const segments = [
    { label: "Соответствует", value: pass, color: "var(--status-good)" },
    { label: "Не соответствует", value: fail, color: "var(--status-critical)" },
    { label: "Не определено", value: unknown, color: "var(--ink-muted)" },
  ].filter((s) => s.value > 0);

  const size = 200;
  const r = 70;
  const strokeW = 24;
  const circumference = 2 * Math.PI * r;
  const gap = 3;

  const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, width: 180, height: 180, style: "flex-shrink:0" });
  const group = svgEl("g", { transform: `rotate(-90 ${size / 2} ${size / 2})` });

  const track = svgEl("circle", {
    cx: size / 2,
    cy: size / 2,
    r,
    fill: "none",
    stroke: "var(--grid-line)",
    "stroke-width": strokeW,
  });
  group.appendChild(track);

  const tip = ensureTooltip(container);
  let cumulative = 0;

  segments.forEach((seg) => {
    const arcLen = (seg.value / total) * circumference;
    const dash = Math.max(arcLen - gap, 0.001);
    const circle = svgEl("circle", {
      cx: size / 2,
      cy: size / 2,
      r,
      fill: "none",
      stroke: seg.color,
      "stroke-width": strokeW,
      "stroke-dasharray": `${dash} ${circumference - dash}`,
      "stroke-dashoffset": -cumulative,
      class: "donut-seg",
    });
    const pct = Math.round((seg.value / total) * 100);
    circle.addEventListener("mouseenter", (e) =>
      showTooltip(container, tip, e, `<b>${seg.label}</b><br/>${seg.value} (${pct}%)`)
    );
    circle.addEventListener("mousemove", (e) => showTooltip(container, tip, e, tip.innerHTML));
    circle.addEventListener("mouseleave", () => hideTooltip(tip));
    group.appendChild(circle);
    cumulative += arcLen;
  });

  svg.appendChild(group);

  const centerVal = svgEl("text", { x: size / 2, y: size / 2 - 2, "text-anchor": "middle", class: "donut-center-value" });
  centerVal.textContent = total;
  const centerLbl = svgEl("text", { x: size / 2, y: size / 2 + 18, "text-anchor": "middle", class: "donut-center-label" });
  centerLbl.textContent = "смывов";
  svg.appendChild(centerVal);
  svg.appendChild(centerLbl);

  const legend = document.createElement("div");
  legend.className = "legend";
  legend.style.flexDirection = "column";
  legend.innerHTML = segments
    .map(
      (seg) =>
        `<div class="legend-item"><span class="legend-swatch" style="background:${seg.color}"></span>${escapeHtml(
          seg.label
        )} — ${seg.value} (${Math.round((seg.value / total) * 100)}%)</div>`
    )
    .join("");

  container.appendChild(svg);
  container.appendChild(legend);
  container.appendChild(tip);
}

function renderTable(rows) {
  const q = wState.search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) =>
        [r.dateRaw, r.zone, r.indicator, r.result, r.norm, r.status].join(" ").toLowerCase().includes(q)
      )
    : rows;

  wEls.dataTableHead.innerHTML = `
    <tr>
      <th>Дата</th>
      <th>Точка / зона</th>
      <th>Показатель</th>
      <th>Результат</th>
      <th>Норматив</th>
      <th>Статус</th>
    </tr>
  `;

  const limited = filtered.slice(0, 300);
  wEls.dataTableBody.innerHTML = limited
    .map((r) => {
      const statusLabel = { pass: "Соответствует", fail: "Не соответствует", unknown: "Не определено" }[r.status];
      return `
        <tr>
          <td>${escapeHtml(r.dateRaw) || "—"}</td>
          <td>${escapeHtml(r.zone)}</td>
          <td>${escapeHtml(r.indicator) || "—"}</td>
          <td>${escapeHtml(r.result) || "—"}</td>
          <td>${escapeHtml(r.norm) || "—"}</td>
          <td><span class="status-pill ${r.status}">${statusLabel}</span></td>
        </tr>
      `;
    })
    .join("");

  wEls.tableFooter.textContent =
    filtered.length > limited.length
      ? `Показано ${limited.length} из ${filtered.length} записей`
      : `Всего записей: ${filtered.length}`;
}

wEls.tableSearch.addEventListener(
  "input",
  wDebounce((e) => {
    wState.search = e.target.value;
    renderTable(getFilteredMbRows());
  }, 200)
);

// ---------------------------------------------------------------------------
// Загрузка файла — Акт мойки
// ---------------------------------------------------------------------------

function setDzStatus(el, dz, text, isError) {
  el.textContent = text;
  el.classList.toggle("error", !!isError);
  dz.classList.toggle("loaded", !isError && !!text);
}

wireDropzone(wEls.dzAct, wEls.fieldActFile, handleActFile);
wireDropzone(wEls.dzMb, wEls.fieldMbFile, handleMbFile);

function wireDropzone(dz, input, handler) {
  dz.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) handler(file);
  });
  ["dragover", "dragenter"].forEach((evt) =>
    dz.addEventListener(evt, (e) => {
      e.preventDefault();
      dz.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dz.addEventListener(evt, (e) => {
      e.preventDefault();
      dz.classList.remove("dragover");
    })
  );
  dz.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handler(file);
  });
}

function handleActFile(file) {
  setDzStatus(wEls.actStatus, wEls.dzAct, "Обработка файла…", false);
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const wb = XLSX.read(reader.result, { type: "array", cellDates: true });
      const rows = parseActWorkbook(wb);
      const dataset = {
        id: wCryptoId("act"),
        filename: file.name,
        uploadedAt: Date.now(),
        included: true,
        rows,
      };
      wState.actDatasets.push(dataset);
      saveActDatasets();
      setDzStatus(wEls.actStatus, wEls.dzAct, `Загружено: ${rows.length} проверок`, false);
      renderFileChips(wEls.actFileChips, wState.actDatasets, toggleActDataset, removeActDataset);
      renderActControlsBar();
      renderActSection();
    } catch (err) {
      console.error(err);
      setDzStatus(wEls.actStatus, wEls.dzAct, err.message || "Не удалось разобрать файл", true);
    }
  };
  reader.onerror = () => setDzStatus(wEls.actStatus, wEls.dzAct, "Ошибка чтения файла", true);
  reader.readAsArrayBuffer(file);
}

function toggleActDataset(ds, checked) {
  ds.included = checked;
  saveActDatasets();
  renderFileChips(wEls.actFileChips, wState.actDatasets, toggleActDataset, removeActDataset);
  renderActControlsBar();
  renderActSection();
}

function removeActDataset(ds) {
  wState.actDatasets = wState.actDatasets.filter((d) => d.id !== ds.id);
  saveActDatasets();
  renderFileChips(wEls.actFileChips, wState.actDatasets, toggleActDataset, removeActDataset);
  renderActControlsBar();
  renderActSection();
}

// ---------------------------------------------------------------------------
// Загрузка файла — Смывы / вода
// ---------------------------------------------------------------------------

function handleMbFile(file) {
  setDzStatus(wEls.mbStatus, wEls.dzMb, "Обработка файла…", false);
  const isCsv = /\.csv$/i.test(file.name);

  if (isCsv) {
    const reader = new FileReader();
    reader.onload = () => {
      const { headers, rows } = parseCsv(String(reader.result));
      if (headers.length < 2 || rows.length === 0) {
        setDzStatus(wEls.mbStatus, wEls.dzMb, "Не удалось прочитать CSV-файл", true);
        return;
      }
      wState.pendingMb = { filename: file.name, headers, rows };
      openMappingDialog();
    };
    reader.onerror = () => setDzStatus(wEls.mbStatus, wEls.dzMb, "Ошибка чтения файла", true);
    reader.readAsText(file, "utf-8");
  } else {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: "array", cellDates: true });
        const { headers, rows } = parseXlsxGeneric(wb);
        if (headers.length < 2 || rows.length === 0) {
          setDzStatus(wEls.mbStatus, wEls.dzMb, "Не удалось найти таблицу с заголовками в файле", true);
          return;
        }
        wState.pendingMb = { filename: file.name, headers, rows };
        openMappingDialog();
      } catch (err) {
        console.error(err);
        setDzStatus(wEls.mbStatus, wEls.dzMb, "Не удалось разобрать Excel-файл", true);
      }
    };
    reader.onerror = () => setDzStatus(wEls.mbStatus, wEls.dzMb, "Ошибка чтения файла", true);
    reader.readAsArrayBuffer(file);
  }
}

function openMappingDialog() {
  const { filename, headers, rows } = wState.pendingMb;
  const guess = guessMbMapping(headers);

  wEls.mappingFileInfo.textContent = `${filename} — ${rows.length} строк`;

  const selects = {
    date: wEls.mapDate,
    zone: wEls.mapZone,
    indicator: wEls.mapIndicator,
    result: wEls.mapResult,
    norm: wEls.mapNorm,
    status: wEls.mapStatus,
  };

  Object.entries(selects).forEach(([field, select]) => {
    select.innerHTML =
      '<option value="">— не использовать —</option>' +
      headers.map((h) => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join("");
    select.value = guess[field] || "";
  });

  wEls.mappingPreview.innerHTML = `
    <table>
      <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows
          .slice(0, 5)
          .map((r) => `<tr>${headers.map((h) => `<td>${escapeHtml(r[h])}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  `;

  wEls.uploadDialog.showModal();
}

wEls.cancelUploadBtn.addEventListener("click", () => {
  wState.pendingMb = null;
  wEls.uploadDialog.close();
});

wEls.buildChartsBtn.addEventListener("click", () => {
  if (!wState.pendingMb) return;
  const dataset = {
    id: wCryptoId("mb"),
    filename: wState.pendingMb.filename,
    uploadedAt: Date.now(),
    headers: wState.pendingMb.headers,
    rows: wState.pendingMb.rows,
    included: true,
    mapping: {
      date: wEls.mapDate.value,
      zone: wEls.mapZone.value,
      indicator: wEls.mapIndicator.value,
      result: wEls.mapResult.value,
      norm: wEls.mapNorm.value,
      status: wEls.mapStatus.value,
    },
  };
  wState.mbDatasets.push(dataset);
  saveMbDatasets();
  setDzStatus(wEls.mbStatus, wEls.dzMb, `Загружено: ${dataset.rows.length} строк`, false);
  wEls.uploadDialog.close();
  wState.pendingMb = null;
  renderFileChips(wEls.mbFileChips, wState.mbDatasets, toggleMbDataset, removeMbDataset);
  renderZoneChips();
  renderMbControlsBar();
  renderMbSection();
});

function toggleMbDataset(ds, checked) {
  ds.included = checked;
  saveMbDatasets();
  renderFileChips(wEls.mbFileChips, wState.mbDatasets, toggleMbDataset, removeMbDataset);
  renderZoneChips();
  renderMbControlsBar();
  renderMbSection();
}

function removeMbDataset(ds) {
  wState.mbDatasets = wState.mbDatasets.filter((d) => d.id !== ds.id);
  saveMbDatasets();
  renderFileChips(wEls.mbFileChips, wState.mbDatasets, toggleMbDataset, removeMbDataset);
  renderZoneChips();
  renderMbControlsBar();
  renderMbSection();
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function wDebounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

renderFileChips(wEls.actFileChips, wState.actDatasets, toggleActDataset, removeActDataset);
renderFileChips(wEls.mbFileChips, wState.mbDatasets, toggleMbDataset, removeMbDataset);
renderActControlsBar();
renderMbControlsBar();
renderZoneChips();
renderActSection();
renderMbSection();
