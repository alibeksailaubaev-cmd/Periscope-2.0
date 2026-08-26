"use strict";

/**
 * Дэшборд «Мойка и смывы» (aitas ukpf).
 * Два независимых источника данных:
 *  — «Акт приёма мойки» (.xlsx, фиксированная структура: Дата/Балл/Несоответствие…)
 *  — «Смывы / вода» (.xlsx или .csv, структура произвольная — колонки сопоставляются вручную)
 * Оба фильтруются общим фильтром по неделе. Всё считается и хранится локально
 * (localStorage), бэкенд не нужен.
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

const els = {
  dash: document.querySelector(".dash"),
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  sidebarClose: document.getElementById("sidebarClose"),
  menuBtn: document.getElementById("menuBtn"),

  actDatasetList: document.getElementById("actDatasetList"),
  actDatasetEmpty: document.getElementById("actDatasetEmpty"),
  mbDatasetList: document.getElementById("mbDatasetList"),
  mbDatasetEmpty: document.getElementById("mbDatasetEmpty"),
  zoneFilterSection: document.getElementById("zoneFilterSection"),
  zoneFilterList: document.getElementById("zoneFilterList"),
  statPass: document.getElementById("statPass"),
  statFail: document.getElementById("statFail"),
  statUnknown: document.getElementById("statUnknown"),

  dzAct: document.getElementById("dzAct"),
  fieldActFile: document.getElementById("fieldActFile"),
  actStatus: document.getElementById("actStatus"),
  dzMb: document.getElementById("dzMb"),
  fieldMbFile: document.getElementById("fieldMbFile"),
  mbStatus: document.getElementById("mbStatus"),

  controlsBar: document.getElementById("controlsBar"),
  weekSelect: document.getElementById("weekSelect"),
  weekInput: document.getElementById("weekInput"),
  btnApplyWeek: document.getElementById("btnApplyWeek"),
  btnResetWeek: document.getElementById("btnResetWeek"),
  rangeBadge: document.getElementById("rangeBadge"),

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

const state = {
  actDatasets: loadJson(ACT_STORAGE_KEY, []),
  mbDatasets: loadJson(MB_STORAGE_KEY, []),
  filter: { zone: null, week: null },
  search: "",
  pendingMb: null, // { filename, headers, rows }
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadJson(key, fallback) {
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
    localStorage.setItem(ACT_STORAGE_KEY, JSON.stringify(state.actDatasets));
  } catch (err) {
    console.warn("Не удалось сохранить данные акта мойки локально", err);
  }
}

function saveMbDatasets() {
  try {
    localStorage.setItem(MB_STORAGE_KEY, JSON.stringify(state.mbDatasets));
  } catch (err) {
    console.warn("Не удалось сохранить данные смывов локально (файл может быть слишком большим)", err);
  }
}

function cryptoId(prefix) {
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

function inWeekFilter(date) {
  if (!state.filter.week || !date) return true;
  return date >= state.filter.week.start && date <= state.filter.week.end;
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
        correctionDone: !firstTryRawStartsNe(correctionRaw) && correctionRaw.includes("проведен"),
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

function firstTryRawStartsNe(s) {
  return /^не\b/.test(s.trim());
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

function parseMbDate(raw) {
  return excelToDate(raw);
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
  return state.actDatasets.filter((d) => d.included !== false);
}

function getAllActRows() {
  const out = [];
  getIncludedActDatasets().forEach((ds) => {
    ds.rows.forEach((r) => out.push({ ...r, date: new Date(r.dateISO) }));
  });
  return out.sort((a, b) => a.date - b.date);
}

function getFilteredActRows() {
  return getAllActRows().filter((r) => inWeekFilter(r.date));
}

// ---------------------------------------------------------------------------
// Производные данные — Смывы / вода
// ---------------------------------------------------------------------------

function getIncludedMbDatasets() {
  return state.mbDatasets.filter((d) => d.included !== false);
}

function getAllMbRows() {
  const out = [];
  getIncludedMbDatasets().forEach((ds) => {
    ds.rows.forEach((raw, idx) => {
      const m = ds.mapping;
      out.push({
        id: `${ds.id}_${idx}`,
        datasetId: ds.id,
        date: m.date ? parseMbDate(raw[m.date]) : null,
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
  let rows = getAllMbRows().filter((r) => inWeekFilter(r.date));
  if (state.filter.zone) rows = rows.filter((r) => r.zone === state.filter.zone);
  return rows;
}

// ---------------------------------------------------------------------------
// Панель фильтра по неделям
// ---------------------------------------------------------------------------

function renderControlsBar() {
  const actRows = getAllActRows();
  const mbRows = getAllMbRows().filter((r) => r.date);
  const hasAny = actRows.length > 0 || mbRows.length > 0;
  els.controlsBar.hidden = !hasAny;
  if (!hasAny) return;

  const weekMap = new Map();
  [...actRows, ...mbRows].forEach((r) => {
    const iw = getIsoWeek(r.date);
    const key = `${iw.year}-${iw.week}`;
    if (!weekMap.has(key)) weekMap.set(key, iw);
  });

  const current = state.filter.week ? `${state.filter.week.year}-${state.filter.week.week}` : "";
  els.weekSelect.innerHTML = '<option value="">Весь период</option>';
  [...weekMap.entries()]
    .sort((a, b) => a[1].year - b[1].year || a[1].week - b[1].week)
    .forEach(([key, iw]) => {
      const { start, end } = isoWeekRange(iw.year, iw.week);
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = `${iw.week} неделя (${formatShortDate(start)}–${formatShortDate(end)})`;
      if (key === current) opt.selected = true;
      els.weekSelect.appendChild(opt);
    });

  if (state.filter.week) {
    const { week, start, end } = state.filter.week;
    els.rangeBadge.textContent = `${week} неделя · ${formatShortDate(start)}–${formatShortDate(end)}`;
  } else {
    els.rangeBadge.textContent = "Весь период";
  }
}

els.weekSelect.addEventListener("change", () => {
  const val = els.weekSelect.value;
  if (!val) {
    state.filter.week = null;
  } else {
    const [year, week] = val.split("-").map(Number);
    const { start, end } = isoWeekRange(year, week);
    state.filter.week = { year, week, start, end };
  }
  renderAll();
});

els.btnApplyWeek.addEventListener("click", () => {
  const weekNum = parseInt(els.weekInput.value, 10);
  if (!weekNum || weekNum < 1 || weekNum > 53) return;
  const allDates = [...getAllActRows(), ...getAllMbRows().filter((r) => r.date)].map((r) => r.date);
  const year = allDates.length ? getIsoWeek(allDates[0]).year : new Date().getFullYear();
  const { start, end } = isoWeekRange(year, weekNum);
  state.filter.week = { year, week: weekNum, start, end };
  renderAll();
});

els.btnResetWeek.addEventListener("click", () => {
  state.filter.week = null;
  state.filter.zone = null;
  els.weekInput.value = "";
  renderAll();
});

function formatShortDate(d) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function formatDate(d) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Сайдбар: список датасетов
// ---------------------------------------------------------------------------

function renderDatasetGroup(datasets, listEl, emptyEl, onToggle, onRemove) {
  listEl.querySelectorAll(".dataset-item").forEach((el) => el.remove());
  emptyEl.hidden = datasets.length > 0;

  datasets
    .slice()
    .reverse()
    .forEach((ds) => {
      const item = document.createElement("div");
      item.className = "dataset-item";
      item.innerHTML = `
        <input type="checkbox" ${ds.included !== false ? "checked" : ""} />
        <div class="dataset-info">
          <span class="dataset-name">${escapeHtml(ds.filename)}</span>
          <span class="dataset-meta">${ds.rows.length} строк · ${formatDate(new Date(ds.uploadedAt))}</span>
        </div>
        <button class="dataset-remove" title="Удалить">✕</button>
      `;
      item.querySelector('input[type="checkbox"]').addEventListener("change", (e) => onToggle(ds, e.target.checked));
      item.querySelector(".dataset-remove").addEventListener("click", () => {
        if (confirm(`Удалить файл «${ds.filename}»?`)) onRemove(ds);
      });
      listEl.appendChild(item);
    });
}

function renderSidebarDatasets() {
  renderDatasetGroup(
    state.actDatasets,
    els.actDatasetList,
    els.actDatasetEmpty,
    (ds, checked) => {
      ds.included = checked;
      saveActDatasets();
      renderAll();
    },
    (ds) => {
      state.actDatasets = state.actDatasets.filter((d) => d.id !== ds.id);
      saveActDatasets();
      renderAll();
    }
  );

  renderDatasetGroup(
    state.mbDatasets,
    els.mbDatasetList,
    els.mbDatasetEmpty,
    (ds, checked) => {
      ds.included = checked;
      saveMbDatasets();
      renderAll();
    },
    (ds) => {
      state.mbDatasets = state.mbDatasets.filter((d) => d.id !== ds.id);
      saveMbDatasets();
      renderAll();
    }
  );
}

function renderZoneFilter() {
  const rows = getAllMbRows();
  els.zoneFilterSection.hidden = rows.length === 0;
  els.zoneFilterList.innerHTML = "";
  if (!rows.length) return;

  const zoneMap = new Map();
  rows.forEach((r) => {
    const entry = zoneMap.get(r.zone) || { total: 0, fail: 0 };
    entry.total++;
    if (r.status === "fail") entry.fail++;
    zoneMap.set(r.zone, entry);
  });

  const allBtn = document.createElement("button");
  allBtn.className = "nav-sub-item" + (state.filter.zone ? "" : " active");
  allBtn.innerHTML = `<span>Все точки</span><span class="count">${rows.length}</span>`;
  allBtn.addEventListener("click", () => setZoneFilter(null));
  els.zoneFilterList.appendChild(allBtn);

  [...zoneMap.entries()]
    .sort((a, b) => b[1].fail - a[1].fail || b[1].total - a[1].total)
    .forEach(([zone, entry]) => {
      const btn = document.createElement("button");
      btn.className = "nav-sub-item" + (state.filter.zone === zone ? " active" : "");
      btn.innerHTML = `<span>${escapeHtml(zone)}</span><span class="count">${entry.total}</span>`;
      btn.addEventListener("click", () => setZoneFilter(zone));
      els.zoneFilterList.appendChild(btn);
    });

  const filtered = getFilteredMbRows();
  els.statPass.textContent = filtered.filter((r) => r.status === "pass").length;
  els.statFail.textContent = filtered.filter((r) => r.status === "fail").length;
  els.statUnknown.textContent = filtered.filter((r) => r.status === "unknown").length;
}

function setZoneFilter(zone) {
  state.filter.zone = state.filter.zone === zone ? null : zone;
  renderAll();
}

function openSidebar() {
  els.dash.classList.add("sidebar-open");
}
function closeSidebar() {
  els.dash.classList.remove("sidebar-open");
}
els.menuBtn.addEventListener("click", openSidebar);
els.sidebarBackdrop.addEventListener("click", closeSidebar);
els.sidebarClose.addEventListener("click", closeSidebar);

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
// Акт мойки: рендер
// ---------------------------------------------------------------------------

function renderActSection() {
  const hasAct = getIncludedActDatasets().length > 0 && getAllActRows().length > 0;
  els.actKpiRow.hidden = !hasAct;
  els.actTrendCard.hidden = !hasAct;
  els.actBottomGrid.hidden = !hasAct;
  if (!hasAct) return;

  const rows = getFilteredActRows();

  const checks = rows.length;
  const avg = checks ? rows.reduce((s, r) => s + r.score, 0) / checks : 0;
  const violations = rows.filter((r) => r.violation).length;
  const critical = rows.filter((r) => r.severity === "critical").length;
  const firstTryPct = checks ? Math.round((rows.filter((r) => r.firstTryOk).length / checks) * 100) : 0;

  els.actKpiChecks.textContent = checks;
  els.actKpiAvg.textContent = checks ? avg.toFixed(1) : "—";
  els.actKpiViol.textContent = violations;
  els.actKpiCritical.textContent = critical;
  els.actKpiFirstTry.textContent = `${firstTryPct}%`;

  renderActTrendChart(rows);
  renderActWeeklyChart(rows);
  renderActIncidents(rows);
}

function severityColor(sev) {
  return sev === "critical" ? "var(--status-critical)" : sev === "warning" ? "var(--status-warning)" : "var(--status-good)";
}

function renderActTrendChart(rows) {
  const container = els.chartActTrend;
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

  // цветные полосы-зоны по легенде баллов
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
        `<b>${formatDate(r.date)}</b><br/>Балл: ${r.score}${r.violation ? "" : " (без замечаний)"}${r.note && r.violation ? `<br/>${escapeHtml(r.note).slice(0, 140)}` : ""}`
      )
    );
    dot.addEventListener("mousemove", (e) => showTooltip(container, tip, e, tip.innerHTML));
    dot.addEventListener("mouseleave", () => hideTooltip(tip));
    svg.appendChild(dot);

    const showLabel = rows.length <= 40 || i === 0 || i === rows.length - 1;
    if (showLabel && (i % Math.max(1, Math.ceil(rows.length / 12)) === 0 || i === rows.length - 1)) {
      const xl = svgEl("text", { x: cx, y: H - 6, class: "axis-label", "text-anchor": "middle" });
      xl.textContent = formatShortDate(r.date);
      svg.appendChild(xl);
    }
  });

  container.appendChild(svg);
  container.appendChild(tip);
}

function renderActWeeklyChart(rows) {
  const container = els.chartActWeekly;
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
  els.actViolCount.textContent = `${violations.length} из ${rows.length}`;

  if (!violations.length) {
    els.actIncidentList.innerHTML = '<div class="chart-empty">Несоответствий не зафиксировано 🎉</div>';
    return;
  }

  els.actIncidentList.innerHTML = violations
    .slice(0, 200)
    .map((r) => {
      const sevClass = r.severity === "critical" ? "" : r.severity === "warning" ? "severity-warning" : "severity-minor";
      const correctionNote = r.correctionDone !== undefined ? (r.correctionDone ? "Коррекция проведена" : "Коррекция не проведена") : "";
      const firstTryNote = r.firstTryOk ? "принято с первого раза" : "принято со второго раза";
      return `
        <div class="incident-item ${sevClass}">
          <div>
            <div class="incident-date">${formatShortDate(r.date)}</div>
            <span class="incident-score">Балл ${r.score}</span>
          </div>
          <div>
            <div class="incident-text">${escapeHtml(r.note) || "—"}</div>
            <div class="incident-meta">${escapeHtml(firstTryNote)}${correctionNote ? " · " + escapeHtml(correctionNote) : ""}</div>
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

  els.mbEmptyState.hidden = hasData;
  els.kpiRow.hidden = !hasData;
  els.chartsGrid.hidden = !hasData;
  els.tableCard.hidden = !hasData;

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

  els.kpiTotal.textContent = rows.length;
  els.kpiPassRate.textContent = `${passRate}%`;
  els.kpiFail.textContent = fail;
  els.kpiZones.textContent = zonesWithFail;
}

function renderTrendChart(rows) {
  const container = els.chartTrend;
  container.innerHTML = "";
  els.legendTrend.innerHTML = "";

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

  els.legendTrend.innerHTML = `<div class="legend-item"><span class="legend-swatch" style="background:var(--series-1)"></span>% соответствия смывов по дате</div>`;
}

function renderZonesChart(rows) {
  const container = els.chartZones;
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
  const container = els.chartDonut;
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
  const q = state.search.trim().toLowerCase();
  const filtered = q
    ? rows.filter((r) =>
        [r.dateRaw, r.zone, r.indicator, r.result, r.norm, r.status].join(" ").toLowerCase().includes(q)
      )
    : rows;

  els.dataTableHead.innerHTML = `
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
  els.dataTableBody.innerHTML = limited
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

  els.tableFooter.textContent =
    filtered.length > limited.length
      ? `Показано ${limited.length} из ${filtered.length} записей`
      : `Всего записей: ${filtered.length}`;
}

els.tableSearch.addEventListener(
  "input",
  debounce((e) => {
    state.search = e.target.value;
    renderTable(getFilteredMbRows());
  }, 200)
);

// ---------------------------------------------------------------------------
// Общий рендер
// ---------------------------------------------------------------------------

function renderAll() {
  renderControlsBar();
  renderSidebarDatasets();
  renderZoneFilter();
  renderActSection();
  renderMbSection();
}

// ---------------------------------------------------------------------------
// Загрузка файла — Акт мойки
// ---------------------------------------------------------------------------

function setDzStatus(el, dz, text, isError) {
  el.textContent = text;
  el.classList.toggle("error", !!isError);
  dz.classList.toggle("loaded", !isError && !!text);
}

wireDropzone(els.dzAct, els.fieldActFile, handleActFile);
wireDropzone(els.dzMb, els.fieldMbFile, handleMbFile);

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
  setDzStatus(els.actStatus, els.dzAct, "Обработка файла…", false);
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const wb = XLSX.read(reader.result, { type: "array", cellDates: true });
      const rows = parseActWorkbook(wb);
      const dataset = {
        id: cryptoId("act"),
        filename: file.name,
        uploadedAt: Date.now(),
        included: true,
        rows,
      };
      state.actDatasets.push(dataset);
      saveActDatasets();
      setDzStatus(els.actStatus, els.dzAct, `Загружено: ${rows.length} проверок`, false);
      renderAll();
    } catch (err) {
      console.error(err);
      setDzStatus(els.actStatus, els.dzAct, err.message || "Не удалось разобрать файл", true);
    }
  };
  reader.onerror = () => setDzStatus(els.actStatus, els.dzAct, "Ошибка чтения файла", true);
  reader.readAsArrayBuffer(file);
}

// ---------------------------------------------------------------------------
// Загрузка файла — Смывы / вода
// ---------------------------------------------------------------------------

function handleMbFile(file) {
  setDzStatus(els.mbStatus, els.dzMb, "Обработка файла…", false);
  const isCsv = /\.csv$/i.test(file.name);

  if (isCsv) {
    const reader = new FileReader();
    reader.onload = () => {
      const { headers, rows } = parseCsv(String(reader.result));
      if (headers.length < 2 || rows.length === 0) {
        setDzStatus(els.mbStatus, els.dzMb, "Не удалось прочитать CSV-файл", true);
        return;
      }
      state.pendingMb = { filename: file.name, headers, rows };
      openMappingDialog();
    };
    reader.onerror = () => setDzStatus(els.mbStatus, els.dzMb, "Ошибка чтения файла", true);
    reader.readAsText(file, "utf-8");
  } else {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: "array", cellDates: true });
        const { headers, rows } = parseXlsxGeneric(wb);
        if (headers.length < 2 || rows.length === 0) {
          setDzStatus(els.mbStatus, els.dzMb, "Не удалось найти таблицу с заголовками в файле", true);
          return;
        }
        state.pendingMb = { filename: file.name, headers, rows };
        openMappingDialog();
      } catch (err) {
        console.error(err);
        setDzStatus(els.mbStatus, els.dzMb, "Не удалось разобрать Excel-файл", true);
      }
    };
    reader.onerror = () => setDzStatus(els.mbStatus, els.dzMb, "Ошибка чтения файла", true);
    reader.readAsArrayBuffer(file);
  }
}

function openMappingDialog() {
  const { filename, headers, rows } = state.pendingMb;
  const guess = guessMbMapping(headers);

  els.mappingFileInfo.textContent = `${filename} — ${rows.length} строк`;

  const selects = {
    date: els.mapDate,
    zone: els.mapZone,
    indicator: els.mapIndicator,
    result: els.mapResult,
    norm: els.mapNorm,
    status: els.mapStatus,
  };

  Object.entries(selects).forEach(([field, select]) => {
    select.innerHTML =
      '<option value="">— не использовать —</option>' +
      headers.map((h) => `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`).join("");
    select.value = guess[field] || "";
  });

  els.mappingPreview.innerHTML = `
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

  els.uploadDialog.showModal();
}

els.cancelUploadBtn.addEventListener("click", () => {
  state.pendingMb = null;
  els.uploadDialog.close();
});

els.buildChartsBtn.addEventListener("click", () => {
  if (!state.pendingMb) return;
  const dataset = {
    id: cryptoId("mb"),
    filename: state.pendingMb.filename,
    uploadedAt: Date.now(),
    headers: state.pendingMb.headers,
    rows: state.pendingMb.rows,
    included: true,
    mapping: {
      date: els.mapDate.value,
      zone: els.mapZone.value,
      indicator: els.mapIndicator.value,
      result: els.mapResult.value,
      norm: els.mapNorm.value,
      status: els.mapStatus.value,
    },
  };
  state.mbDatasets.push(dataset);
  saveMbDatasets();
  setDzStatus(els.mbStatus, els.dzMb, `Загружено: ${dataset.rows.length} строк`, false);
  els.uploadDialog.close();
  state.pendingMb = null;
  renderAll();
});

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

renderAll();
