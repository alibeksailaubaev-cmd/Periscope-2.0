"use strict";

/**
 * Потоковый парсер «Свод рабочих журналов МБ» (смывы/вода).
 * Портировано из эталонного дэшборда пользователя — для очень больших
 * .xlsx-файлов (сотни тысяч строк) обычный SheetJS-разбор (весь файл в
 * памяти как объект) может зависать или "терять" лист. Здесь файл читается
 * как zip (JSZip) и XML одного листа обрабатывается потоково небольшими
 * кусками, без сборки полного DOM/массива в памяти.
 *
 * Все имена в этом файле намеренно с префиксом mbs*, чтобы не пересекаться
 * с js/washing.js, который тоже объявляет глобальные функции/константы.
 */

// ---------------------------------------------------------------------------
// XML / ячейки
// ---------------------------------------------------------------------------

function mbsDecodeXmlEntities(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

async function mbsStreamXmlElements(zipEntryFile, tagName, handler, chunkSizeBytes) {
  chunkSizeBytes = chunkSizeBytes || 8 * 1024 * 1024;
  const u8 = await zipEntryFile.async("uint8array");
  const decoder = new TextDecoder("utf-8");
  const closeTag = "</" + tagName + ">";
  const elementRegex = new RegExp("<" + tagName + "\\b[^>]*>([\\s\\S]*?)<\\/" + tagName + ">", "g");
  let buffer = "";
  let iter = 0;

  function flush(isFinal) {
    let cutIdx;
    if (isFinal) {
      cutIdx = buffer.length;
    } else {
      const idx = buffer.lastIndexOf(closeTag);
      if (idx === -1) return;
      cutIdx = idx + closeTag.length;
    }
    const completeRegion = buffer.slice(0, cutIdx);
    buffer = buffer.slice(cutIdx);
    elementRegex.lastIndex = 0;
    let m;
    while ((m = elementRegex.exec(completeRegion)) !== null) {
      handler(m[1]);
    }
  }

  if (u8.length === 0) return;

  for (let offset = 0; offset < u8.length; offset += chunkSizeBytes) {
    const end = Math.min(offset + chunkSizeBytes, u8.length);
    const slice = u8.subarray(offset, end);
    const isLastSlice = end >= u8.length;
    buffer += decoder.decode(slice, { stream: !isLastSlice });
    flush(false);
    iter++;
    if (iter % 4 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  flush(true);
}

function mbsExtractRowCells(rowXml) {
  const cells = [];
  const cellRegex = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m,
    autoIdx = 0;
  while ((m = cellRegex.exec(rowXml)) !== null) {
    const attrs = m[1] || "";
    const rM = attrs.match(/\br="([A-Z]+)\d+"/);
    let col;
    if (rM) {
      col = rM[1];
      autoIdx = mbsColLetterToIndex(col) + 1;
    } else {
      col = mbsColIndexToLetter(autoIdx);
      autoIdx++;
    }
    cells.push({ col, attrs, inner: m[2] || "" });
  }
  return cells;
}

function mbsColLetterToIndex(letters) {
  let n = 0;
  for (let i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64);
  return n - 1;
}
function mbsColIndexToLetter(idx) {
  let s = "";
  idx = idx + 1;
  while (idx > 0) {
    const rem = (idx - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    idx = Math.floor((idx - 1) / 26);
  }
  return s;
}

function mbsGetCellValue(cell, sharedStrings) {
  if (!cell.inner) return null;
  const typeMatch = cell.attrs.match(/\st="([^"]*)"/);
  const type = typeMatch ? typeMatch[1] : null;

  if (type === "inlineStr") {
    let text = "";
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let tm;
    while ((tm = tRegex.exec(cell.inner)) !== null) {
      text += mbsDecodeXmlEntities(tm[1]);
    }
    return text;
  }
  if (type === "e") return null;

  const vMatch = cell.inner.match(/<v>([\s\S]*?)<\/v>/);
  if (!vMatch) return null;
  const raw = vMatch[1];

  if (type === "d") return mbsDecodeXmlEntities(raw);
  if (type === "s") {
    const idx = parseInt(raw, 10);
    return sharedStrings[idx] !== undefined ? sharedStrings[idx] : "";
  }
  if (type === "str" || type === "b") return mbsDecodeXmlEntities(raw);
  return raw;
}

function mbsNormKey(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/ /g, " ")
    .replace(/[ёЁ]/g, "е")
    .replace(/[_\-–—]+/g, " ")
    .replace(/[.,;:«»"'()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function mbsToDate(v) {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    const utcDays = Math.floor(v - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    if (!isNaN(d.getTime())) return d;
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!isNaN(d.getTime())) return d;
  }
  const d2 = new Date(s);
  return isNaN(d2.getTime()) ? null : d2;
}

function mbsDateOnly(d) {
  const rounded = new Date(d.getTime() + 12 * 60 * 60 * 1000);
  return new Date(rounded.getFullYear(), rounded.getMonth(), rounded.getDate());
}

async function mbsListSheets(zip) {
  const wbFile = zip.file("xl/workbook.xml");
  if (!wbFile) throw new Error("Файл не похож на .xlsx: внутри нет xl/workbook.xml.");
  const workbookXml = await wbFile.async("string");
  const sheetTags = workbookXml.match(/<sheet\b[^>]*\/?>/g) || [];

  const relsFile = zip.file("xl/_rels/workbook.xml.rels");
  const relsXml = relsFile ? await relsFile.async("string") : "";
  const relTags = relsXml.match(/<Relationship\b[^>]*\/?>/g) || [];
  const relMap = {};
  relTags.forEach((tag) => {
    const idM = tag.match(/Id="([^"]*)"/);
    const targetM = tag.match(/Target="([^"]*)"/);
    if (idM && targetM) relMap[idM[1]] = targetM[1];
  });

  const sheets = [];
  sheetTags.forEach((tag) => {
    const nameM = tag.match(/name="([^"]*)"/);
    const ridM = tag.match(/r:id="([^"]*)"/);
    if (!nameM || !ridM) return;
    const target = relMap[ridM[1]];
    if (!target) return;
    const path = target.startsWith("/") ? target.slice(1) : "xl/" + target.replace(/^\.?\//, "");
    sheets.push({ name: mbsDecodeXmlEntities(nameM[1]), path });
  });
  return sheets;
}

// ---------------------------------------------------------------------------
// Определение шапки и смысловые фильтры (Предприятие/Подразделение/Группа)
// ---------------------------------------------------------------------------

function mbsDetectHeaderRow(cells, sharedStrings) {
  const found = { date: null, point: null, result: null, ok: null, dept: null, zone: null, company: null, matGroup: null, matSubgroup: null, labels: {} };
  let nonEmpty = 0;

  cells.forEach((c) => {
    const raw = mbsGetCellValue(c, sharedStrings);
    const n = mbsNormKey(raw);
    if (!n) return;
    nonEmpty++;

    if (!found.date && n.includes("дата") && n.includes("отбор")) {
      found.date = c.col;
      found.labels.date = String(raw).trim();
      return;
    }
    if (!found.point && n.includes("точка")) {
      found.point = c.col;
      found.labels.point = String(raw).trim();
      return;
    }
    if (!found.ok && (n.includes("допустим") || (n.includes("ок") && n.includes("nok")) || n.includes("ok или nok"))) {
      found.ok = c.col;
      found.labels.ok = String(raw).trim();
      return;
    }
    if (!found.result && n.startsWith("результат")) {
      found.result = c.col;
      found.labels.result = String(raw).trim();
      return;
    }
    if (!found.dept && n.includes("подразделен")) {
      found.dept = c.col;
      found.labels.dept = String(raw).trim();
      return;
    }
    if (!found.zone && (n.includes("корпус") || n.includes("помещен"))) {
      found.zone = c.col;
      found.labels.zone = String(raw).trim();
      return;
    }
    if (!found.company && (n.includes("предприят") || n.includes("организац") || n.includes("компания"))) {
      found.company = c.col;
      found.labels.company = String(raw).trim();
      return;
    }
    if (!found.matSubgroup && n.includes("подгруппа")) {
      found.matSubgroup = c.col;
      found.labels.matSubgroup = String(raw).trim();
      return;
    }
    if (!found.matGroup && n.includes("группа") && n.includes("материал")) {
      found.matGroup = c.col;
      found.labels.matGroup = String(raw).trim();
      return;
    }
  });

  if (found.date && (found.ok || found.result) && nonEmpty >= 3) return found;
  return null;
}

function mbsIsIncubationDept(v) {
  const s = mbsNormKey(v);
  return !!s && (s.includes("инкубац") || s.includes("инкубатор"));
}
function mbsIsMpfCompany(v) {
  const s = mbsNormKey(v);
  if (!s) return false;
  return s.includes("макинск") || s.split(" ").includes("мпф");
}
function mbsIsSmyvyGroup(v) {
  const s = mbsNormKey(v);
  if (!s) return false;
  return s.startsWith("смыв") || s.startsWith("вод") || s.includes(" смыв") || s.includes(" вод");
}
function mbsIsBahilnayaProba(v) {
  const s = mbsNormKey(v);
  return !!s && s.includes("бахильн");
}

function mbsPrettyValue(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/_+/g, " ").replace(/\s+/g, " ").trim();
}

function mbsCollectSample(set, v) {
  if (set.size >= 8) return;
  const s = v === null || v === undefined ? "" : String(v).trim();
  if (s) set.add(s);
}
function mbsSampleList(set) {
  return Array.from(set)
    .slice(0, 8)
    .map((s) => "«" + s + "»")
    .join(", ");
}

// ---------------------------------------------------------------------------
// Разбор файла целиком
// ---------------------------------------------------------------------------

async function mbsParseFile(file) {
  let zip;
  try {
    const buf = await file.arrayBuffer();
    zip = await JSZip.loadAsync(buf);
  } catch (e) {
    throw new Error("Не удалось открыть файл как .xlsx (это архив zip): " + e.message);
  }

  const sharedStrings = [];
  const sstFile = zip.file("xl/sharedStrings.xml");
  if (sstFile) {
    await mbsStreamXmlElements(sstFile, "si", (inner) => {
      let text = "";
      const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
      let tm;
      while ((tm = tRegex.exec(inner)) !== null) text += mbsDecodeXmlEntities(tm[1]);
      sharedStrings.push(text);
    });
  }

  const sheets = await mbsListSheets(zip);
  sheets.sort((a, b) => (a.name.toLowerCase() === "sheet1" ? -1 : 0) - (b.name.toLowerCase() === "sheet1" ? -1 : 0));

  let lastDiag = null;
  let lastSheetName = "";
  const triedSheets = [];

  for (const sheet of sheets) {
    const sheetFile = zip.file(sheet.path);
    if (!sheetFile) continue;
    triedSheets.push(sheet.name);
    const parsed = await mbsParseSheet(sheetFile, sharedStrings, sheet.name);
    if (parsed.rows.length > 0) return parsed.rows;
    if (!lastDiag || (parsed.meta.headerFound && !lastDiag.headerFound) || (parsed.meta.headerFound === lastDiag.headerFound && parsed.meta.rowsWithDate > lastDiag.rowsWithDate)) {
      lastDiag = parsed.meta;
      lastSheetName = sheet.name;
    }
  }

  throw new Error(mbsBuildDiagnostics(lastDiag, lastSheetName, triedSheets));
}

async function mbsParseSheet(sheetFile, sharedStrings, sheetName) {
  let header = null;
  let headerScanned = 0;
  let targetLetters = null;

  const meta = {
    sheetName,
    headerFound: false,
    headerLabels: {},
    rowsWithDate: 0,
    passCompany: 0,
    passDept: 0,
    passGroup: 0,
    passBahil: 0,
    companyFilterApplied: false,
    deptFilterApplied: false,
    matGroupFilterApplied: false,
    matSubgroupFilterApplied: false,
    samples: { dept: new Set(), company: new Set(), group: new Set() },
  };

  const kept = [];

  function handleRow(rowInner) {
    const cells = mbsExtractRowCells(rowInner);
    if (cells.length === 0) return;

    if (!header) {
      if (headerScanned++ > 200) return;
      const detected = mbsDetectHeaderRow(cells, sharedStrings);
      if (!detected) return;
      header = detected;
      meta.headerFound = true;
      meta.headerLabels = detected.labels;
      meta.companyFilterApplied = !!header.company;
      meta.deptFilterApplied = !!header.dept;
      meta.matGroupFilterApplied = !!header.matGroup;
      meta.matSubgroupFilterApplied = !!header.matSubgroup;
      targetLetters = new Set(
        Object.keys(header)
          .filter((k) => k !== "labels")
          .map((k) => header[k])
          .filter(Boolean)
      );
      return;
    }

    let dRaw = null, pointRaw = null, resultRaw = null, okRaw = null, deptRaw = null, zoneRaw = null, companyRaw = null, matGroupRaw = null, matSubgroupRaw = null;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (!targetLetters.has(c.col)) continue;
      const val = mbsGetCellValue(c, sharedStrings);
      if (c.col === header.date) dRaw = val;
      else if (c.col === header.point) pointRaw = val;
      else if (c.col === header.result) resultRaw = val;
      else if (c.col === header.ok) okRaw = val;
      else if (c.col === header.dept) deptRaw = val;
      else if (c.col === header.zone) zoneRaw = val;
      else if (c.col === header.company) companyRaw = val;
      else if (c.col === header.matGroup) matGroupRaw = val;
      else if (c.col === header.matSubgroup) matSubgroupRaw = val;
    }

    if (dRaw === null || dRaw === "") return;
    const dNum = typeof dRaw === "string" && /^-?\d+(\.\d+)?$/.test(dRaw) ? parseFloat(dRaw) : dRaw;
    const d = mbsToDate(dNum);
    if (!d) return;
    const dOnly = mbsDateOnly(d);
    meta.rowsWithDate++;

    mbsCollectSample(meta.samples.company, companyRaw);
    mbsCollectSample(meta.samples.dept, deptRaw);
    mbsCollectSample(meta.samples.group, matGroupRaw);

    if (header.company && !mbsIsMpfCompany(companyRaw)) return;
    meta.passCompany++;
    if (header.dept && !mbsIsIncubationDept(deptRaw)) return;
    meta.passDept++;
    if (header.matGroup && !mbsIsSmyvyGroup(matGroupRaw)) return;
    meta.passGroup++;
    if (header.matSubgroup && mbsIsBahilnayaProba(matSubgroupRaw)) return;
    meta.passBahil++;

    const point = mbsPrettyValue(pointRaw) || mbsPrettyValue(zoneRaw) || "(не указано)";
    const resVal = mbsPrettyValue(resultRaw);
    const okNorm = okRaw === null || okRaw === undefined ? "" : String(okRaw).trim().toUpperCase();

    let status = "unknown";
    if (okNorm.includes("NOK") || okNorm.includes("НЕ ОК") || okNorm.includes("НЕТ")) status = "fail";
    else if (okNorm.includes("OK") || okNorm.includes("ОК") || okNorm.includes("ДА")) status = "pass";
    else if (!header.ok && resVal) {
      const rn = mbsNormKey(resVal);
      if (rn.includes("не соответ") || rn.includes("обнаруж") || rn.includes("nok")) status = "fail";
      else if (rn.includes("соответ") || rn.includes("не обнаруж") || rn.includes("ok")) status = "pass";
    }

    kept.push({ dateISO: dOnly.toISOString(), zone: point, indicator: "", result: resVal, status });
  }

  try {
    await mbsStreamXmlElements(sheetFile, "row", handleRow);
  } catch (e) {
    meta.readError = e.message;
  }

  kept.sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
  return { rows: kept, meta };
}

function mbsBuildDiagnostics(meta, sheetName, triedSheets) {
  if (!meta) {
    return "Не удалось прочитать ни одного листа файла. Проверьте, что это выгрузка «Свод рабочих журналов МБ» в формате .xlsx.";
  }
  if (!meta.headerFound) {
    return (
      'На листе «' + (sheetName || "?") + '» не удалось найти строку заголовков со столбцами «Дата отбора пробы» и «Результат…». ' +
      "Просмотрены листы: " + (triedSheets.join(", ") || "—") + "."
    );
  }
  const parts = ['Лист «' + sheetName + '»: строк с датой — ' + meta.rowsWithDate + "."];
  if (meta.rowsWithDate === 0) {
    parts.push('Не удалось распознать дату в столбце «' + (meta.headerLabels.date || "Дата отбора пробы") + '».');
    return parts.join(" ");
  }
  if (meta.companyFilterApplied && meta.passCompany === 0) {
    parts.push("Фильтр «Предприятие = МПФ» отсеял все строки. В файле встречаются: " + (mbsSampleList(meta.samples.company) || "(пусто)") + ".");
  } else if (meta.deptFilterApplied && meta.passDept === 0) {
    parts.push("Фильтр «Подразделение = цех инкубации / инкубатор» отсеял все строки (по предприятию прошло " + meta.passCompany + "). В файле встречаются: " + (mbsSampleList(meta.samples.dept) || "(пусто)") + ".");
  } else if (meta.matGroupFilterApplied && meta.passGroup === 0) {
    parts.push("Фильтр «Группа материала = смывы / вода» отсеял все строки (прошло " + meta.passDept + "). В файле встречаются: " + (mbsSampleList(meta.samples.group) || "(пусто)") + ".");
  } else if (meta.passBahil === 0) {
    parts.push("Все подходящие пробы оказались бахильными и были исключены.");
  } else {
    parts.push("После фильтров осталось 0 строк.");
  }
  if (meta.readError) parts.push("Ошибка чтения листа: " + meta.readError);
  return parts.join(" ");
}
