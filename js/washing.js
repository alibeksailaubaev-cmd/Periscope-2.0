"use strict";

/**
 * Дэшборд «Мойка и смывы» (aitas ukpf).
 * Пользователь загружает CSV-выгрузку результатов смывов, сопоставляет
 * колонки, дальше всё считается и рисуется локально (без бэкенда).
 */

const STORAGE_KEY = "aitas_washing_datasets_v1";

const FAIL_WORDS = ["не соответств", "брак", "fail", "неудовлетвор", "превыш", "обнаруж"];
const PASS_WORDS = ["соответств", "норма", "pass", "удовлетвор", "не обнаруж", "ок", "годно"];

const FIELD_PATTERNS = {
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

  datasetList: document.getElementById("datasetList"),
  datasetEmpty: document.getElementById("datasetEmpty"),
  zoneFilterSection: document.getElementById("zoneFilterSection"),
  zoneFilterList: document.getElementById("zoneFilterList"),
  statPass: document.getElementById("statPass"),
  statFail: document.getElementById("statFail"),
  statUnknown: document.getElementById("statUnknown"),

  content: document.getElementById("content"),
  emptyState: document.getElementById("emptyState"),
  emptyUploadBtn: document.getElementById("emptyUploadBtn"),
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

  openUploadBtn: document.getElementById("openUploadBtn"),
  uploadDialog: document.getElementById("uploadDialog"),
  cancelUploadBtn: document.getElementById("cancelUploadBtn"),
  buildChartsBtn: document.getElementById("buildChartsBtn"),
  stepFile: document.getElementById("stepFile"),
  stepMapping: document.getElementById("stepMapping"),
  dropzone: document.getElementById("dropzone"),
  fieldFile: document.getElementById("fieldFile"),
  uploadError: document.getElementById("uploadError"),
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
  datasets: loadDatasets(),
  filter: { zone: null },
  search: "",
  pending: null, // { filename, headers, rows }
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadDatasets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Не удалось прочитать локальные данные", err);
    return [];
  }
}

function saveDatasets() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.datasets));
  } catch (err) {
    console.warn("Не удалось сохранить данные локально (возможно, файл слишком большой)", err);
  }
}

function cryptoId() {
  return `w_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// CSV parsing
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

function normalizeHeader(h) {
  return h.toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
}

function guessMapping(headers) {
  const mapping = {};
  for (const field of Object.keys(FIELD_PATTERNS)) {
    const patterns = FIELD_PATTERNS[field];
    const match = headers.find((h) => {
      const nh = normalizeHeader(h);
      return patterns.some((p) => nh.includes(p.replace(/[^a-zа-яё0-9]/gi, "")));
    });
    mapping[field] = match || "";
  }
  return mapping;
}

function parseDate(raw) {
  if (!raw) return null;
  const m = String(raw).match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = `20${y}`;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    if (!isNaN(dt.getTime())) return dt;
  }
  const generic = new Date(raw);
  return isNaN(generic.getTime()) ? null : generic;
}

function parseNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const m = String(raw).replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function resolveStatus(row, mapping) {
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
// Derived rows
// ---------------------------------------------------------------------------

function getIncludedDatasets() {
  return state.datasets.filter((d) => d.included !== false);
}

function getAllRows() {
  const out = [];
  getIncludedDatasets().forEach((ds) => {
    ds.rows.forEach((raw, idx) => {
      const m = ds.mapping;
      out.push({
        id: `${ds.id}_${idx}`,
        datasetId: ds.id,
        date: m.date ? parseDate(raw[m.date]) : null,
        dateRaw: m.date ? raw[m.date] : "",
        zone: (m.zone && raw[m.zone]) || "Без указания",
        indicator: m.indicator ? raw[m.indicator] : "",
        result: m.result ? raw[m.result] : "",
        norm: m.norm ? raw[m.norm] : "",
        status: resolveStatus(raw, m),
      });
    });
  });
  return out;
}

function getFilteredRows() {
  const rows = getAllRows();
  if (!state.filter.zone) return rows;
  return rows.filter((r) => r.zone === state.filter.zone);
}

// ---------------------------------------------------------------------------
// Sidebar: datasets
// ---------------------------------------------------------------------------

function renderDatasetList() {
  els.datasetList.querySelectorAll(".dataset-item").forEach((el) => el.remove());
  els.datasetEmpty.hidden = state.datasets.length > 0;

  state.datasets
    .slice()
    .reverse()
    .forEach((ds) => {
      const item = document.createElement("div");
      item.className = "dataset-item";
      item.innerHTML = `
        <input type="checkbox" ${ds.included !== false ? "checked" : ""} />
        <div class="dataset-info">
          <span class="dataset-name">${escapeHtml(ds.filename)}</span>
          <span class="dataset-meta">${ds.rows.length} строк · ${formatDate(ds.uploadedAt)}</span>
        </div>
        <button class="dataset-remove" title="Удалить">✕</button>
      `;
      item.querySelector('input[type="checkbox"]').addEventListener("change", (e) => {
        ds.included = e.target.checked;
        saveDatasets();
        renderZoneFilter();
        renderMain();
      });
      item.querySelector(".dataset-remove").addEventListener("click", () => {
        if (!confirm(`Удалить файл «${ds.filename}»?`)) return;
        state.datasets = state.datasets.filter((d) => d.id !== ds.id);
        saveDatasets();
        renderDatasetList();
        renderZoneFilter();
        renderMain();
      });
      els.datasetList.appendChild(item);
    });
}

// ---------------------------------------------------------------------------
// Sidebar: zone filter
// ---------------------------------------------------------------------------

function renderZoneFilter() {
  const rows = getAllRows();
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

  els.statPass.textContent = rows.filter((r) => r.status === "pass").length;
  els.statFail.textContent = rows.filter((r) => r.status === "fail").length;
  els.statUnknown.textContent = rows.filter((r) => r.status === "unknown").length;
}

function setZoneFilter(zone) {
  state.filter.zone = state.filter.zone === zone ? null : zone;
  renderZoneFilter();
  renderMain();
}

// Мобильное меню
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
// Main render
// ---------------------------------------------------------------------------

function renderMain() {
  const rows = getFilteredRows();
  const hasData = getIncludedDatasets().length > 0 && getAllRows().length > 0;

  els.emptyState.hidden = hasData;
  els.kpiRow.hidden = !hasData;
  els.chartsGrid.hidden = !hasData;
  els.tableCard.hidden = !hasData;
  els.tableSearch.hidden = !hasData;

  if (!hasData) return;

  renderKpis(rows);
  renderTrendChart(rows);
  renderZonesChart(rows);
  renderDonutChart(rows);
  renderTable(rows);
}

function renderKpis(rows) {
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

// ---------------------------------------------------------------------------
// Charts
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

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

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
    renderTable(getFilteredRows());
  }, 200)
);

// ---------------------------------------------------------------------------
// Upload dialog
// ---------------------------------------------------------------------------

function openUploadDialog() {
  state.pending = null;
  els.stepFile.hidden = false;
  els.stepMapping.hidden = true;
  els.buildChartsBtn.hidden = true;
  els.uploadError.hidden = true;
  els.fieldFile.value = "";
  els.uploadDialog.showModal();
}

els.openUploadBtn.addEventListener("click", openUploadDialog);
els.emptyUploadBtn.addEventListener("click", openUploadDialog);
els.cancelUploadBtn.addEventListener("click", () => els.uploadDialog.close());

els.dropzone.addEventListener("click", () => els.fieldFile.click());
els.fieldFile.addEventListener("change", () => {
  const file = els.fieldFile.files[0];
  if (file) handleFile(file);
});

["dragover", "dragenter"].forEach((evt) =>
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.add("dragover");
  })
);
["dragleave", "drop"].forEach((evt) =>
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.remove("dragover");
  })
);
els.dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const { headers, rows } = parseCsv(String(reader.result));
    if (headers.length < 2 || rows.length === 0) {
      els.uploadError.hidden = false;
      els.uploadError.textContent = "Не удалось прочитать файл. Проверьте, что это CSV-таблица с заголовками.";
      return;
    }
    state.pending = { filename: file.name, headers, rows };
    els.uploadError.hidden = true;
    showMappingStep();
  };
  reader.onerror = () => {
    els.uploadError.hidden = false;
    els.uploadError.textContent = "Ошибка чтения файла.";
  };
  reader.readAsText(file, "utf-8");
}

function showMappingStep() {
  const { filename, headers, rows } = state.pending;
  const guess = guessMapping(headers);

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

  els.stepFile.hidden = true;
  els.stepMapping.hidden = false;
  els.buildChartsBtn.hidden = false;
}

els.buildChartsBtn.addEventListener("click", () => {
  if (!state.pending) return;
  const dataset = {
    id: cryptoId(),
    filename: state.pending.filename,
    uploadedAt: Date.now(),
    headers: state.pending.headers,
    rows: state.pending.rows,
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
  state.datasets.push(dataset);
  saveDatasets();
  els.uploadDialog.close();
  state.filter.zone = null;
  renderDatasetList();
  renderZoneFilter();
  renderMain();
});

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatShortDate(d) {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
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

renderDatasetList();
renderZoneFilter();
renderMain();
