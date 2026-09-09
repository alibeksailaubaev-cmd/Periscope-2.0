"use strict";

/**
 * Фотоотчёт — Бройлерное производство (aitas mpf). Три независимых
 * раздела — «Бройлерные площадки», «АТЦ», «Мойка» (см. SECTIONS) —
 * переключаются сегментированным контролом в сайдбаре; у каждого свой
 * список записей и свой ключ в IndexedDB (см. state.bySection). В
 * отличие от дашборда Инкубатора здесь нет раздела сравнения с
 * эталоном — все три раздела однотипные (несоответствия). Данные
 * хранятся локально в IndexedDB — фото уходят внутрь как dataURL
 * (уменьшенные и пережатые в JPEG, см. compressDataUrl), видео — как
 * есть (см. fileToMediaItem), так что всё работает полностью офлайн,
 * без бэкенда.
 *
 * Это отдельная копия дашборда Инкубатора (js/discrepancies.js) для
 * другого цеха — своя база IndexedDB (IDB_NAME) и свои ключи
 * localStorage, чтобы данные двух цехов не пересекались, даже если оба
 * дашборда открыты в одном браузере.
 *
 * Важно: браузерное хранилище привязано к конкретному браузеру на
 * конкретном устройстве — если просто переслать этот файл другому
 * человеку, у него фото/видео видно не будет. Поэтому есть кнопка
 * «Скачать копию для отправки», которая сохраняет отдельный .html-файл
 * со всеми тремя разделами, уже вшитыми внутрь (см. #embeddedData и
 * exportShareableCopy ниже) — именно этот файл и нужно пересылать,
 * чтобы получатель сразу всё увидел. При большом количестве видео файл
 * может получиться очень тяжёлым — exportShareableCopy предупреждает
 * об этом перед скачиванием.
 */

const STORAGE_KEY = "aitas_broiler_discrepancies_v1"; // старый localStorage до многораздельности — миграция только в раздел "sites"
const OLD_STORAGE_KEYS = [];

// Три раздела дашборда. key — используется как ключ в IndexedDB и как
// data-section в разметке переключателя; defaultLocation подставляется,
// если поле "место" оставили пустым.
const SECTIONS = [
  {
    key: "sites",
    label: "Бройлерные площадки",
    defaultLocation: "Бройлерная площадка",
    fieldLocationPlaceholder: "напр. Птичник №3, Кормоцех",
    exportPrefix: "broiler-sites",
  },
  {
    key: "atc",
    label: "АТЦ",
    defaultLocation: "АТЦ",
    fieldLocationPlaceholder: "напр. Бокс №2, Мойка колёс",
    exportPrefix: "atc",
  },
  {
    key: "washing",
    label: "Мойка",
    defaultLocation: "Мойка",
    fieldLocationPlaceholder: "напр. Моечная зона №1",
    exportPrefix: "washing",
  },
];

// Тексты интерфейса, одинаковые для всех трёх разделов.
const COMMON_TEXT = {
  sidebarTotal: "Всего записей",
  addHint: "Можно выбрать сразу много файлов (100+) — по умолчанию каждый станет отдельной карточкой. Видео весит намного больше фото — предпочтительны короткие ролики.",
  fieldLocationLabel: "Место / участок",
  fieldTextLabel: "Описание несоответствия",
  addDialogTitleOne: "Новая запись",
  addDialogTitleMany: (n) => `Новые записи (${n} файлов)`,
  cardTextLabel: "Описание несоответствия",
  cardTextPlaceholder: "Опишите, что не так...",
  deleteConfirm: "Удалить эту запись?",
};

function currentSection() {
  return SECTIONS.find((s) => s.key === state.section);
}

const els = {
  dash: document.querySelector(".dash"),
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  sidebarClose: document.getElementById("sidebarClose"),
  menuBtn: document.getElementById("menuBtn"),
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),

  countAll: document.getElementById("countAll"),
  sidebarTotalLabel: document.getElementById("sidebarTotalLabel"),
  addHint: document.getElementById("addHint"),
  sectionToggle: document.getElementById("sectionToggle"),

  exportBtn: document.getElementById("exportBtn"),
  exportPptxBtn: document.getElementById("exportPptxBtn"),

  viewTitle: document.getElementById("viewTitle"),
  progressLabel: document.getElementById("progressLabel"),
  viewer: document.getElementById("viewer"),
  emptyState: document.getElementById("emptyState"),
  emptyStateText: document.getElementById("emptyStateText"),
  emptyAddBtn: document.getElementById("emptyAddBtn"),
  cardStage: document.getElementById("cardStage"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  dots: document.getElementById("dots"),
  viewToggle: document.getElementById("viewToggle"),
  listView: document.getElementById("listView"),

  lightbox: document.getElementById("lightbox"),
  lightboxImg: document.getElementById("lightboxImg"),
  lightboxVideo: document.getElementById("lightboxVideo"),
  lightboxCaption: document.getElementById("lightboxCaption"),
  lightboxClose: document.getElementById("lightboxClose"),
  lightboxPrev: document.getElementById("lightboxPrev"),
  lightboxNext: document.getElementById("lightboxNext"),

  openAddBtn: document.getElementById("openAddBtn"),
  addDialog: document.getElementById("addDialog"),
  addDialogTitle: document.getElementById("addDialogTitle"),
  addForm: document.getElementById("addForm"),
  cancelAddBtn: document.getElementById("cancelAddBtn"),
  fieldLocation: document.getElementById("fieldLocation"),
  fieldLocationLabel: document.getElementById("fieldLocationLabel"),
  locationOptions: document.getElementById("locationOptions"),
  fieldPhoto: document.getElementById("fieldPhoto"),
  fieldText: document.getElementById("fieldText"),
  fieldTextLabel: document.getElementById("fieldTextLabel"),
  fieldSolution: document.getElementById("fieldSolution"),
  fieldSolutionWrap: document.getElementById("fieldSolutionWrap"),
  dropzone: document.getElementById("dropzone"),
  dropPreview: document.getElementById("dropPreview"),
  dropzoneHint: document.getElementById("dropzoneHint"),
  dropzoneNote: document.getElementById("dropzoneNote"),
  splitToggle: document.getElementById("splitToggle"),
  fieldSplitCards: document.getElementById("fieldSplitCards"),
};

const state = {
  section: SECTIONS[0].key,
  bySection: {}, // key -> entries[], заполняется в boot()
  entries: [], // алиас на bySection[state.section] — см. setSection/setEntries
  index: 0,
  pendingMedia: [], // {type: "photo"|"video", src: dataURL}[]
  viewMode: "cards", // "cards" | "list"
};

// state.entries — это алиас на state.bySection[state.section].
// Присваивание нового массива (например, через filter) разрывает эту
// связь, поэтому такие места обновляют оба поля разом.
function setEntries(newEntries) {
  state.entries = newEntries;
  state.bySection[state.section] = newEntries;
}

// ---------------------------------------------------------------------------
// Storage (IndexedDB, с миграцией из старого localStorage)
// ---------------------------------------------------------------------------

const IDB_NAME = "aitas_broiler_dashboard";
const IDB_VERSION = 1;
const IDB_STORE = "sections"; // по записи на раздел: {key: "sites"|"atc"|"washing", data: [...]}

let dbPromise = null;
function getDb() {
  if (!window.indexedDB) return Promise.reject(new Error("IndexedDB недоступен в этом браузере"));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

// Никогда не отклоняется — любая проблема с IndexedDB трактуется как
// "записи ещё нет", чтобы вызывающий код спокойно шёл по цепочке
// миграции (localStorage → встроенные данные → демо).
function idbGet(key) {
  return getDb()
    .then(
      (db) =>
        new Promise((resolve) => {
          try {
            const tx = db.transaction(IDB_STORE, "readonly");
            const req = tx.objectStore(IDB_STORE).get(key);
            req.onsuccess = () => resolve(req.result ? req.result.data : null);
            req.onerror = () => resolve(null);
          } catch (err) {
            resolve(null);
          }
        })
    )
    .catch(() => null);
}

function idbSet(key, data) {
  return getDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put({ key, data });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

// #embeddedData хранит объект вида {sites: [...], atc: [...], washing: [...]}
// (см. exportShareableCopy). Файлы, экспортированные до появления
// разделов, несли туда просто массив — читаем оба формата, старый массив
// трактуем как данные первого раздела ("sites").
let embeddedAllCache;
function getEmbeddedAll() {
  if (embeddedAllCache !== undefined) return embeddedAllCache;
  try {
    const tag = document.getElementById("embeddedData");
    embeddedAllCache = null;
    if (tag) {
      const data = JSON.parse(tag.textContent.trim());
      if (Array.isArray(data)) {
        embeddedAllCache = data.length ? { [SECTIONS[0].key]: data } : null;
      } else if (data && typeof data === "object") {
        embeddedAllCache = data;
      }
    }
  } catch (err) {
    embeddedAllCache = null;
  }
  return embeddedAllCache;
}

async function loadSectionEntries(sectionKey) {
  try {
    const stored = await idbGet(sectionKey);
    if (stored !== null) return stored;

    // Открыт файл-копия, полученный от кого-то другого через «Скачать
    // копию для отправки» — в нём уже вшиты данные. Подхватываем
    // встроенные данные как стартовые.
    const embeddedAll = getEmbeddedAll();
    if (embeddedAll && embeddedAll[sectionKey] && embeddedAll[sectionKey].length) {
      const normalized = normalizeEntries(embeddedAll[sectionKey], sectionKey);
      await idbSet(sectionKey, normalized).catch(() => {});
      return normalized;
    }

    // Миграция из состояния "до разделов" — единственный раздел тогда
    // хранился под ключом IndexedDB "discrepancies" (а до этого — в
    // localStorage). Переносим его в самый первый раздел ("sites"),
    // чтобы не потерять уже накопленные записи.
    if (sectionKey === SECTIONS[0].key) {
      const oldIdb = await idbGet("discrepancies");
      if (oldIdb !== null) {
        await idbSet(sectionKey, oldIdb).catch(() => {});
        return oldIdb;
      }

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const normalized = normalizeEntries(JSON.parse(raw), sectionKey);
        await idbSet(sectionKey, normalized).catch(() => {});
        return normalized;
      }
      for (const oldKey of OLD_STORAGE_KEYS) {
        const old = localStorage.getItem(oldKey);
        if (!old) continue;
        const normalized = normalizeEntries(JSON.parse(old), sectionKey);
        await idbSet(sectionKey, normalized).catch(() => {});
        return normalized;
      }

      const demo = seedDemo();
      await idbSet(sectionKey, demo).catch(() => {});
      return demo;
    }

    return [];
  } catch (err) {
    console.warn("Не удалось прочитать локальные данные", err);
    return [];
  }
}

function normalizeEntries(raw, sectionKey) {
  const defaultLocation = (SECTIONS.find((s) => s.key === sectionKey) || SECTIONS[0]).defaultLocation;
  return raw.map((e) => ({
    id: e.id || cryptoId(),
    location: e.location || defaultLocation,
    text: e.text || "",
    solution: e.solution || "",
    note: e.note || "",
    media: Array.isArray(e.media)
      ? e.media
      : Array.isArray(e.photos)
      ? e.photos.map((src) => ({ type: "photo", src }))
      : e.photo
      ? [{ type: "photo", src: e.photo }]
      : [],
    date: e.date || Date.now(),
  }));
}

// Пишет в IndexedDB асинхронно в фоне — вызывающий код не ждёт (как и
// раньше с localStorage.setItem), но здесь лимит на порядки больше.
function saveEntries() {
  idbSet(state.section, state.entries).catch((err) => {
    console.warn("Не удалось сохранить данные локально", err);
    alert("Не удалось сохранить изменения в хранилище браузера. Попробуйте перезагрузить страницу или освободить место на диске.");
  });
}

function seedDemo() {
  return [
    {
      id: cryptoId(),
      location: "Птичник №1 — кормовая линия",
      text: "Остатки корма в кормушках, признаки плесени у стенки бункера.",
      solution: "Провести внеплановую очистку кормушек и бункера, скорректировать график раздачи корма.",
      media: [],
      date: Date.now(),
    },
    {
      id: cryptoId(),
      location: "Поилки",
      text: "Подтекание в системе поения, влажная подстилка вокруг ниппелей.",
      solution: "Проверить герметичность соединений, заменить повреждённые ниппели, просушить подстилку.",
      media: [],
      date: Date.now(),
    },
  ];
}

function cryptoId() {
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Экспорт копии файла с вшитыми данными — для отправки другим
// ---------------------------------------------------------------------------

// Быстрая оценка суммарного объёма фото+видео во всех разделах — просто
// складывает длины уже существующих строк (.src.length), без единой
// новой аллокации. dataURL — это base64 поверх ASCII, так что длина в
// символах практически равна размеру в байтах.
function estimateTotalMediaBytes() {
  let total = 0;
  SECTIONS.forEach((s) => {
    (state.bySection[s.key] || []).forEach((entry) => {
      (entry.media || []).forEach((item) => {
        if (item && item.src) total += item.src.length;
      });
    });
  });
  return total;
}

function exportShareableCopy() {
  if (els.addDialog.open) els.addDialog.close();
  if (!els.lightbox.hidden) closeLightbox();

  // Предупреждаем ДО попытки собрать файл, а не после: само формирование
  // (JSON.stringify + Blob) на практике надёжно роняет вкладку при
  // суммарном объёме видео в несколько сотен МБ — проверять итоговый
  // размер по факту тут уже поздно.
  const estimatedMb = estimateTotalMediaBytes() / 1024 / 1024;
  if (estimatedMb > 150) {
    const proceed = confirm(
      `Общий объём фото и видео во всех разделах — ≈ ${estimatedMb.toFixed(0)} МБ.\n\n` +
        "При таком объёме (особенно если там тяжёлые видео) формирование файла-копии может надолго " +
        "зависнуть или уронить вкладку браузера — почта и мессенджеры такой файл тоже могут не принять.\n\n" +
        "Надёжнее: удалить/вынести самые тяжёлые ролики перед экспортом, передать их отдельно " +
        "(облако, флешка, сам мессенджер напрямую), а в копии оставить фото и короткие видео.\n\n" +
        "Всё равно попробовать сформировать файл целиком?"
    );
    if (!proceed) return;
  }

  // С тяжёлыми видео тут легко перевалить за сотни МБ — поэтому дальше
  // ни разу не склеиваем всё это в одну гигантскую JS-строку (лишний
  // расход памяти на пустом месте увеличивает риск уронить вкладку).
  // document.documentElement.cloneNode(true) дублировал бы весь живой DOM
  // (там уже есть dataURL в src текущей карточки) — вместо этого берём
  // outerHTML один раз как строку, режем её на части вокруг #embeddedData
  // и кормим Blob уже кусками, каждый раздел сериализуем в JSON отдельно.
  const html = document.documentElement.outerHTML;
  const openTag = html.match(/<script id="embeddedData"[^>]*>/);
  const parts = ["<!DOCTYPE html>\n"];

  if (openTag) {
    const openIdx = openTag.index;
    const openEnd = openIdx + openTag[0].length;
    // Строка разбита на части, чтобы не содержать литерал "</scr"+"ipt>" —
    // иначе при сборке standalone-версии (JS вставляется прямо внутрь
    // <script> в HTML) браузер закрыл бы тег раньше времени прямо на этой
    // строке кода.
    const closeIdx = html.indexOf("</scr" + "ipt>", openEnd);
    parts.push(html.slice(0, openEnd));
    parts.push("{");
    SECTIONS.forEach((s, i) => {
      if (i > 0) parts.push(",");
      parts.push(JSON.stringify(s.key) + ":" + JSON.stringify(state.bySection[s.key] || []));
    });
    parts.push("}");
    parts.push(html.slice(closeIdx));
  } else {
    // На всякий случай — тег не нашёлся, экспортируем страницу как есть.
    parts.push(html);
  }

  const blob = new Blob(parts, { type: "text/html;charset=utf-8" });

  const url = URL.createObjectURL(blob);

  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `broiler-vse-razdely-${stamp}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

els.exportBtn.addEventListener("click", exportShareableCopy);

// ---------------------------------------------------------------------------
// Экспорт в PowerPoint — один слайд на карточку (фото + место + описание).
// Использует PptxGenJS (js/vendor/pptxgen.bundle.js), собранный полностью
// на клиенте — фото уже сжаты в JPEG при загрузке (см. compressDataUrl),
// так что даже сотни карточек дают файл разумного размера.
// ---------------------------------------------------------------------------

const PPTX_COLORS = {
  ink: "201F1A",
  inkSecondary: "55534A",
  inkMuted: "8B8779",
  teal: "17A398",
  tealDark: "0D7F76",
  tealSoft: "E8F6F4",
  cream: "F6F2E4",
  creamLine: "D8D0AE",
  surface: "FCFBF5",
};

// Видео в PPTX не встраиваем (ненадёжно воспроизводится без предпросмотра
// и сильно раздувает файл) — вместо этого показываем подписанный плейсхолдер,
// сам ролик остаётся в дашборде. Для фото — обычная вставка изображения.
function addPptxMediaBox(pptx, slide, item, box) {
  if (item && item.type === "photo") {
    slide.addImage({ data: item.src, x: box.x, y: box.y, w: box.w, h: box.h, sizing: { type: "contain", w: box.w, h: box.h } });
    return;
  }
  slide.addShape(pptx.ShapeType.rect, {
    x: box.x, y: box.y, w: box.w, h: box.h, fill: { color: PPTX_COLORS.cream }, line: { color: PPTX_COLORS.creamLine },
  });
  const label = item && item.type === "video" ? "🎥 Видео — смотрите в дашборде" : "Нет фото";
  slide.addText(label, {
    x: box.x, y: box.y + box.h / 2 - 0.3, w: box.w, h: 0.6, align: "center", fontSize: 16, color: PPTX_COLORS.inkMuted,
  });
}

async function exportToPowerPoint() {
  if (typeof PptxGenJS === "undefined") {
    alert("Не удалось загрузить модуль PowerPoint. Проверьте, что файл js/vendor/pptxgen.bundle.js доступен рядом с дашбордом.");
    return;
  }
  const sec = currentSection();
  const entries = state.entries;
  if (!entries.length) {
    alert("В этом разделе пока нет записей для экспорта.");
    return;
  }

  els.exportPptxBtn.disabled = true;
  const originalLabel = els.exportPptxBtn.textContent;
  els.exportPptxBtn.textContent = "⏳ Формирую файл...";

  try {
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
    pptx.layout = "WIDE";

    const title = pptx.addSlide();
    title.background = { color: PPTX_COLORS.surface };
    title.addText("aitas mpf — Макинская птицефабрика · Бройлерное производство", {
      x: 0.6, y: 2.7, w: 12, h: 0.6, fontSize: 18, bold: true, color: PPTX_COLORS.inkSecondary,
    });
    title.addText(sec.label, {
      x: 0.6, y: 3.3, w: 12, h: 1, fontSize: 32, bold: true, color: PPTX_COLORS.teal,
    });
    title.addText(`Всего записей: ${entries.length} · ${new Date().toLocaleDateString("ru-RU")}`, {
      x: 0.6, y: 4.35, w: 12, h: 0.5, fontSize: 14, color: PPTX_COLORS.inkSecondary,
    });

    entries.forEach((entry) => {
      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };

      slide.addText(entry.location || "", {
        x: 0.5, y: 0.3, w: 12.3, h: 0.6, fontSize: 22, bold: true, color: PPTX_COLORS.ink,
      });
      slide.addText(formatDate(entry.date), {
        x: 0.5, y: 0.85, w: 6, h: 0.35, fontSize: 11, color: PPTX_COLORS.inkMuted,
      });

      const media = entry.media || [];
      const first = media[0];
      addPptxMediaBox(pptx, slide, first, { x: 0.5, y: 1.3, w: 6.5, h: 5.7 });

      slide.addText(COMMON_TEXT.cardTextLabel, { x: 7.3, y: 1.3, w: 5.5, h: 0.4, fontSize: 13, bold: true, color: PPTX_COLORS.inkSecondary });
      slide.addText(entry.text || "—", { x: 7.3, y: 1.7, w: 5.5, h: 2, fontSize: 14, color: PPTX_COLORS.ink, valign: "top" });

      if (entry.solution) {
        slide.addText("💡 Предлагаемое решение", { x: 7.3, y: 3.9, w: 5.5, h: 0.4, fontSize: 13, bold: true, color: PPTX_COLORS.tealDark });
        slide.addText(entry.solution, {
          x: 7.3, y: 4.3, w: 5.5, h: 2.3, fontSize: 14, color: PPTX_COLORS.ink, valign: "top", fill: { color: PPTX_COLORS.tealSoft },
        });
      }

      if (media.length > 1) {
        slide.addText(`Ещё файлов: ${media.length - 1} (см. следующие слайды)`, {
          x: 7.3, y: 6.7, w: 5.5, h: 0.4, fontSize: 11, italic: true, color: PPTX_COLORS.inkMuted,
        });
        media.slice(1).forEach((item, i) => {
          const extraSlide = pptx.addSlide();
          extraSlide.addText(`${entry.location || ""} — файл ${i + 2} из ${media.length}`, {
            x: 0.5, y: 0.3, w: 12.3, h: 0.5, fontSize: 16, bold: true, color: PPTX_COLORS.ink,
          });
          addPptxMediaBox(pptx, extraSlide, item, { x: 1.5, y: 1, w: 10.3, h: 6.1 });
        });
      }
    });

    const stamp = new Date().toISOString().slice(0, 10);
    await pptx.writeFile({ fileName: `${sec.exportPrefix}-${stamp}.pptx` });
  } catch (err) {
    console.warn("Не удалось создать PowerPoint-файл", err);
    alert("Не удалось создать PowerPoint-файл: " + (err && err.message ? err.message : err));
  } finally {
    els.exportPptxBtn.disabled = false;
    els.exportPptxBtn.textContent = originalLabel;
  }
}

els.exportPptxBtn.addEventListener("click", exportToPowerPoint);

// ---------------------------------------------------------------------------
// Derived data
// ---------------------------------------------------------------------------

function getFiltered() {
  return state.entries;
}

// ---------------------------------------------------------------------------
// Sidebar rendering
// ---------------------------------------------------------------------------

function renderSidebar() {
  els.countAll.textContent = state.entries.length;
  els.sidebarTotalLabel.textContent = COMMON_TEXT.sidebarTotal;
  els.addHint.textContent = COMMON_TEXT.addHint;

  // Обновляем подсказки для поля "место" в форме добавления
  const allLocations = new Set(state.entries.map((e) => e.location));
  els.locationOptions.innerHTML = [...allLocations]
    .map((loc) => `<option value="${escapeHtml(loc)}"></option>`)
    .join("");
}

function setSection(key) {
  if (state.section === key) return;
  state.section = key;
  state.entries = state.bySection[key];
  state.index = 0;

  els.sectionToggle.querySelectorAll(".section-toggle-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === key);
  });

  renderSidebar();
  renderView();
}

els.sectionToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".section-toggle-btn");
  if (btn) setSection(btn.dataset.section);
});


// Мобильное меню
function openSidebar() {
  els.dash.classList.add("sidebar-open");
}
function closeSidebar() {
  els.dash.classList.remove("sidebar-open");
}
els.menuBtn.addEventListener("click", openSidebar);
els.sidebarBackdrop.addEventListener("click", closeSidebar);
els.sidebarClose.addEventListener("click", (e) => {
  e.preventDefault();
  closeSidebar();
});

// Сворачивание панели на десктопе (кнопкой ◀/▶) — освобождает место под
// карточку, см. .dash.sidebar-collapsed в CSS. Состояние запоминается в
// localStorage (это просто флажок, а не фото — квота не при чём).
const SIDEBAR_COLLAPSED_KEY = "aitas_broiler_sidebar_collapsed";

function setSidebarCollapsed(collapsed) {
  els.dash.classList.toggle("sidebar-collapsed", collapsed);
  els.sidebarToggleBtn.textContent = collapsed ? "▶" : "◀";
  els.sidebarToggleBtn.title = collapsed ? "Показать панель" : "Скрыть панель";
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch (err) {
    // некритично — просто не запомнится между сессиями
  }
}

els.sidebarToggleBtn.addEventListener("click", () => {
  setSidebarCollapsed(!els.dash.classList.contains("sidebar-collapsed"));
});

try {
  if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1") setSidebarCollapsed(true);
} catch (err) {
  // некритично
}

// ---------------------------------------------------------------------------
// Main viewer
// ---------------------------------------------------------------------------

function renderView(direction = 0) {
  const list = getFiltered();
  const sec = currentSection();

  els.viewTitle.textContent = sec.label;

  if (!list.length) {
    els.emptyStateText.textContent = `Пока нет записей в разделе «${sec.label}»`;
    els.emptyState.hidden = false;
    els.cardStage.innerHTML = "";
    els.listView.innerHTML = "";
    els.prevBtn.disabled = true;
    els.nextBtn.disabled = true;
    els.dots.innerHTML = "";
    els.progressLabel.textContent = "";
    return;
  }

  els.emptyState.hidden = true;

  if (state.viewMode === "list") {
    els.cardStage.parentElement.querySelectorAll(".nav-arrow").forEach((b) => (b.hidden = true));
    els.cardStage.hidden = true;
    els.listView.hidden = false;
    els.dots.hidden = true;
    els.progressLabel.textContent = `${list.length} шт.`;
    renderListView(list);
    return;
  }

  els.cardStage.parentElement.querySelectorAll(".nav-arrow").forEach((b) => (b.hidden = false));
  els.cardStage.hidden = false;
  els.listView.hidden = true;

  if (state.index >= list.length) state.index = list.length - 1;
  if (state.index < 0) state.index = 0;

  const entry = list[state.index];
  renderCard(entry, direction);

  els.prevBtn.disabled = state.index === 0;
  els.nextBtn.disabled = state.index === list.length - 1;
  els.progressLabel.textContent = `${state.index + 1} / ${list.length}`;

  renderDots(list.length, state.index);
}

// Разметка миниатюры одного элемента (фото или видео) — переиспользуется
// в списке и в полоске миниатюр карточки.
function mediaThumbMarkup(item) {
  if (!item) return "";
  if (item.type === "video") {
    return `<video src="${item.src}" muted preload="metadata"></video><span class="media-video-badge">▶</span>`;
  }
  return `<img src="${item.src}" alt="" />`;
}

function renderListView(list) {
  els.listView.innerHTML = list
    .map(
      (entry, idx) => `
        <div class="list-card" data-idx="${idx}">
          <div class="list-card-photo" data-role="photo" title="${entry.media.length ? "Открыть целиком" : "Нет фото/видео"}">
            ${entry.media.length ? mediaThumbMarkup(entry.media[0]) : "📷"}
            ${entry.media.length > 1 ? `<span class="photo-count-badge">+${entry.media.length - 1}</span>` : ""}
            ${entry.media.length ? '<span class="zoom-hint">⤢</span>' : ""}
          </div>
          <div class="list-card-body" data-role="open">
            <div class="list-card-location">${escapeHtml(entry.location)}</div>
            <div class="list-card-text">${escapeHtml(entry.text) || "—"}</div>
            ${entry.solution ? `<div class="list-card-solution">💡 ${escapeHtml(entry.solution)}</div>` : ""}
            <div class="list-card-meta">
              <span class="list-card-date">${formatShortDate(entry.date)}</span>
            </div>
          </div>
        </div>
      `
    )
    .join("");

  els.listView.querySelectorAll(".list-card").forEach((card) => {
    const idx = Number(card.dataset.idx);
    const entry = list[idx];
    card.querySelector('[data-role="photo"]').addEventListener("click", () => {
      if (entry.media.length) openLightbox(entry.media, 0, entry.location);
      else {
        state.index = idx;
        setViewMode("cards");
      }
    });
    card.querySelector('[data-role="open"]').addEventListener("click", () => {
      state.index = idx;
      setViewMode("cards");
    });
  });
}

// ---------------------------------------------------------------------------
// Полноэкранный просмотр фото
// ---------------------------------------------------------------------------

const lightboxState = { items: [], index: 0, caption: "" };

function openLightbox(items, index, caption) {
  lightboxState.items = items;
  lightboxState.index = index;
  lightboxState.caption = caption || "";
  renderLightbox();
  els.lightbox.hidden = false;
}

function renderLightbox() {
  const { items, index, caption } = lightboxState;
  const item = items[index];
  const isVideo = item && item.type === "video";

  els.lightboxVideo.pause();
  if (isVideo) {
    els.lightboxImg.hidden = true;
    els.lightboxImg.src = "";
    els.lightboxVideo.hidden = false;
    els.lightboxVideo.src = item.src;
  } else {
    els.lightboxVideo.hidden = true;
    els.lightboxVideo.src = "";
    els.lightboxImg.hidden = false;
    els.lightboxImg.src = item ? item.src : "";
  }

  const multi = items.length > 1;
  els.lightboxCaption.textContent = multi ? `${caption} · ${index + 1} из ${items.length}` : caption;
  els.lightboxPrev.hidden = !multi;
  els.lightboxNext.hidden = !multi;
}

function closeLightbox() {
  els.lightbox.hidden = true;
  els.lightboxImg.src = "";
  els.lightboxVideo.pause();
  els.lightboxVideo.src = "";
}

function lightboxPrev() {
  if (!lightboxState.items.length) return;
  lightboxState.index = (lightboxState.index - 1 + lightboxState.items.length) % lightboxState.items.length;
  renderLightbox();
}

function lightboxNext() {
  if (!lightboxState.items.length) return;
  lightboxState.index = (lightboxState.index + 1) % lightboxState.items.length;
  renderLightbox();
}

els.lightboxClose.addEventListener("click", closeLightbox);
els.lightboxPrev.addEventListener("click", (e) => {
  e.stopPropagation();
  lightboxPrev();
});
els.lightboxNext.addEventListener("click", (e) => {
  e.stopPropagation();
  lightboxNext();
});
els.lightbox.addEventListener("click", (e) => {
  if (e.target === els.lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (els.lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") lightboxPrev();
  if (e.key === "ArrowRight") lightboxNext();
});

function setViewMode(mode) {
  state.viewMode = mode;
  els.viewToggle.querySelectorAll(".view-toggle-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  renderView();
}

els.viewToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".view-toggle-btn");
  if (btn) setViewMode(btn.dataset.mode);
});

// Растягиваем textarea по содержимому — без внутренней прокрутки, весь
// текст виден сразу.
function autoGrow(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function renderCard(entry, direction) {
  const old = els.cardStage.querySelector(".card");
  if (old) {
    old.classList.add("leaving");
    old.style.setProperty("--card-dx", direction < 0 ? "-32px" : "32px");
    setTimeout(() => old.remove(), 220);
  }

  const card = document.createElement("div");
  card.className = "card";
  card.style.setProperty("--card-dx", direction < 0 ? "-32px" : "32px");

  const hasMedia = entry.media.length > 0;
  const firstItem = entry.media[0];
  const isFirstVideo = firstItem && firstItem.type === "video";

  card.innerHTML = `
    <div class="card-photo" id="cardPhoto" title="${hasMedia ? "" : "Нажмите, чтобы загрузить фото/видео"}">
      ${
        hasMedia
          ? isFirstVideo
            ? `<video src="${firstItem.src}" controls preload="metadata"></video>`
            : `<img src="${firstItem.src}" alt="Фото" />`
          : `<div class="card-photo-placeholder"><div class="icon">📷</div><p>Нажмите, чтобы загрузить фото/видео</p></div>`
      }
      <button class="card-delete" id="cardDelete" title="Удалить">✕</button>
    </div>
    <div class="card-photo-strip" id="cardPhotoStrip"></div>
    <div class="card-body">
      <input class="card-location-input" id="cardLocationInput" value="${escapeHtml(entry.location)}" placeholder="${COMMON_TEXT.fieldLocationLabel}" />
      <div class="card-date">${formatDate(entry.date)}</div>

      <label class="card-field-label">${COMMON_TEXT.cardTextLabel}</label>
      <textarea class="card-text" id="cardText" rows="2" placeholder="${COMMON_TEXT.cardTextPlaceholder}">${escapeHtml(entry.text || "")}</textarea>

      <label class="card-field-label card-field-label-solution">💡 Предлагаемое решение</label>
      <textarea class="card-text card-solution" id="cardSolution" rows="2" placeholder="Что нужно сделать, чтобы устранить...">${escapeHtml(entry.solution || "")}</textarea>
    </div>
  `;

  els.cardStage.appendChild(card);

  card.querySelector("#cardPhoto").addEventListener("click", (e) => {
    if (e.target.closest("#cardDelete")) return;
    if (e.target.tagName === "VIDEO") return; // не мешаем нативным элементам управления видео
    if (entry.media.length) openLightbox(entry.media, 0, entry.location);
    else promptAddMedia(entry.id);
  });

  card.querySelector("#cardDelete").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteEntry(entry.id);
  });

  renderMediaStrip(card, entry);

  const locationInput = card.querySelector("#cardLocationInput");
  locationInput.addEventListener(
    "input",
    debounce(() => {
      entry.location = locationInput.value.trim() || currentSection().defaultLocation;
      saveEntries();
      renderSidebar();
    }, 300)
  );

  const textarea = card.querySelector("#cardText");
  autoGrow(textarea);
  const saveText = debounce(() => {
    entry.text = textarea.value;
    saveEntries();
  }, 300);
  textarea.addEventListener("input", () => {
    autoGrow(textarea);
    saveText();
  });

  const solutionArea = card.querySelector("#cardSolution");
  if (solutionArea) {
    autoGrow(solutionArea);
    const saveSolution = debounce(() => {
      entry.solution = solutionArea.value;
      saveEntries();
    }, 300);
    solutionArea.addEventListener("input", () => {
      autoGrow(solutionArea);
      saveSolution();
    });
  }

}

function renderDots(count, active) {
  els.dots.innerHTML = "";
  if (count > 24) {
    els.dots.hidden = true;
    return;
  }
  els.dots.hidden = false;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("button");
    dot.className = "dot-item" + (i === active ? " active" : "");
    dot.addEventListener("click", () => {
      const dir = i > state.index ? 1 : -1;
      state.index = i;
      renderView(dir);
    });
    els.dots.appendChild(dot);
  }
}

function goPrev() {
  if (state.index > 0) {
    state.index--;
    renderView(-1);
  }
}

function goNext() {
  const list = getFiltered();
  if (state.index < list.length - 1) {
    state.index++;
    renderView(1);
  }
}

els.prevBtn.addEventListener("click", goPrev);
els.nextBtn.addEventListener("click", goNext);

document.addEventListener("keydown", (e) => {
  if (els.addDialog.open) return;
  const t = e.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
  if (e.key === "ArrowLeft") goPrev();
  if (e.key === "ArrowRight") goNext();
});

// Свайп на мобильных
let touchStartX = null;
els.viewer.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.touches[0].clientX;
  },
  { passive: true }
);
els.viewer.addEventListener(
  "touchend",
  (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX = null;
  },
  { passive: true }
);

function deleteEntry(id) {
  if (!confirm(COMMON_TEXT.deleteConfirm)) return;
  setEntries(state.entries.filter((e) => e.id !== id));
  saveEntries();
  renderSidebar();
  renderView();
}

// Полоска миниатюр под фото карточки — позволяет прикрепить к одному
// несоответствию сразу несколько фотографий, открыть любую из них целиком
// или удалить отдельное фото.
function renderMediaStrip(card, entry) {
  const strip = card.querySelector("#cardPhotoStrip");
  strip.innerHTML = "";

  entry.media.forEach((item, idx) => {
    const thumb = document.createElement("button");
    thumb.className = "photo-thumb";
    thumb.type = "button";
    thumb.title = "Открыть целиком";
    thumb.innerHTML = `${mediaThumbMarkup(item)}<span class="photo-thumb-delete" title="Удалить">✕</span>`;
    thumb.addEventListener("click", (e) => {
      if (e.target.closest(".photo-thumb-delete")) {
        e.stopPropagation();
        deleteMediaFromEntry(entry.id, idx);
        return;
      }
      openLightbox(entry.media, idx, entry.location);
    });
    strip.appendChild(thumb);
  });

  const addThumb = document.createElement("button");
  addThumb.className = "photo-thumb photo-thumb-add";
  addThumb.type = "button";
  addThumb.title = "Добавить ещё фото/видео";
  addThumb.textContent = "+";
  addThumb.addEventListener("click", () => promptAddMedia(entry.id));
  strip.appendChild(addThumb);
}

function promptAddMedia(entryId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,video/*";
  input.multiple = true;
  input.addEventListener("change", () => {
    const files = Array.from(input.files).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!files.length) return;
    Promise.all(files.map(fileToMediaItem)).then((items) => {
      const entry = state.entries.find((e) => e.id === entryId);
      if (!entry) return;
      entry.media.push(...items.filter(Boolean));
      saveEntries();
      renderView();
    });
  });
  input.click();
}

function deleteMediaFromEntry(entryId, mediaIndex) {
  const entry = state.entries.find((e) => e.id === entryId);
  if (!entry) return;
  entry.media.splice(mediaIndex, 1);
  saveEntries();
  renderView();
}

// ---------------------------------------------------------------------------
// Add dialog (в т.ч. массовая загрузка нескольких фото сразу)
// ---------------------------------------------------------------------------

function openAddDialog() {
  els.addForm.reset();
  state.pendingMedia = [];
  els.dropPreview.hidden = true;
  els.dropzoneHint.hidden = false;
  els.dropzoneNote.hidden = true;
  els.splitToggle.hidden = true;
  els.fieldSplitCards.checked = true;

  els.fieldLocationLabel.textContent = COMMON_TEXT.fieldLocationLabel;
  els.fieldLocation.placeholder = currentSection().fieldLocationPlaceholder;
  els.fieldTextLabel.textContent = COMMON_TEXT.fieldTextLabel;

  updateAddDialogMode();
  els.addDialog.showModal();
}

function updateAddDialogMode() {
  const n = state.pendingMedia.length;
  els.addDialogTitle.textContent = n > 1 ? COMMON_TEXT.addDialogTitleMany(n) : COMMON_TEXT.addDialogTitleOne;
}

els.openAddBtn.addEventListener("click", openAddDialog);
els.emptyAddBtn.addEventListener("click", openAddDialog);
els.cancelAddBtn.addEventListener("click", () => els.addDialog.close());

els.dropzone.addEventListener("click", () => els.fieldPhoto.click());

els.fieldPhoto.addEventListener("change", () => {
  if (els.fieldPhoto.files.length) handlePickedFiles(els.fieldPhoto.files);
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
  const files = e.dataTransfer.files;
  if (files && files.length) handlePickedFiles(files);
});

async function handlePickedFiles(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
  if (!files.length) return;

  state.pendingMedia = (await Promise.all(files.map(fileToMediaItem))).filter(Boolean);
  if (!state.pendingMedia.length) return;
  updateAddDialogMode();

  const photoCount = state.pendingMedia.filter((m) => m.type === "photo").length;
  const videoCount = state.pendingMedia.filter((m) => m.type === "video").length;

  if (state.pendingMedia.length === 1 && state.pendingMedia[0].type === "photo") {
    els.dropPreview.src = state.pendingMedia[0].src;
    els.dropPreview.hidden = false;
    els.dropzoneHint.hidden = true;
    els.dropzoneNote.hidden = true;
    els.splitToggle.hidden = true;
  } else if (state.pendingMedia.length === 1 && state.pendingMedia[0].type === "video") {
    els.dropPreview.hidden = true;
    els.dropzoneHint.hidden = true;
    els.dropzoneNote.hidden = false;
    els.dropzoneNote.textContent = "🎥 Выбрано видео.";
    els.splitToggle.hidden = true;
  } else {
    els.dropPreview.hidden = true;
    els.dropzoneHint.hidden = true;
    els.dropzoneNote.hidden = false;
    const parts = [];
    if (photoCount) parts.push(`фото: ${photoCount}`);
    if (videoCount) parts.push(`видео: ${videoCount}`);
    els.dropzoneNote.textContent = `Выбрано — ${parts.join(", ")}.`;
    els.splitToggle.hidden = false;
  }
}

// Фото с телефонов часто весят по 3-8 МБ каждое — при десятках/сотнях
// фото это быстро упирается в лимит localStorage (~5-10 МБ на домен) и
// делает экспортированный .html неудобным для пересылки. Поэтому перед
// сохранением уменьшаем длинную сторону и пережимаем в JPEG — почти без
// потери в читаемости, но в разы меньше по размеру.
const MAX_PHOTO_DIMENSION = 1600;
const PHOTO_JPEG_QUALITY = 0.82;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file) {
  return readFileAsDataUrl(file).then(compressDataUrl);
}

// Видео (в отличие от фото) на клиенте не пережимается — нет простого
// надёжного способа перекодировать видео в браузере без тяжёлых
// библиотек. Проверено на практике: один файл, приближающийся к 500 МБ,
// надёжно роняет вкладку при формировании копии для отправки (там всё
// содержимое собирается в одну JSON-строку) — поэтому лимит здесь
// заметно строже верхней границы, которую теоретически можно прочитать
// в память.
const MAX_VIDEO_BYTES = 250 * 1024 * 1024; // ~250 МБ

async function fileToMediaItem(file) {
  if (file.type.startsWith("video/")) {
    if (file.size > MAX_VIDEO_BYTES) {
      alert(
        `Видео «${file.name}» слишком большое (${(file.size / 1024 / 1024).toFixed(0)} МБ, лимит ~250 МБ). ` +
          "Более тяжёлые ролики надёжно роняют вкладку при формировании копии для отправки — сожмите видео или снимите более короткий ролик."
      );
      return null;
    }
    const src = await readFileAsDataUrl(file);
    return { type: "video", src };
  }
  const src = await fileToDataUrl(file);
  return { type: "photo", src };
}

function compressDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
      // Изображение уже маленькое (скриншот, значок и т.п.) — не трогаем.
      if (scale >= 1) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

els.addForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const text = els.fieldText.value.trim();
  const solution = els.fieldSolution.value.trim();
  const locationInput = els.fieldLocation.value.trim();
  const location = locationInput || currentSection().defaultLocation;

  // При массовой загрузке (100+ файлов) по умолчанию каждый файл — своя
  // карточка, чтобы к каждой можно было дописать своё описание. Флажок
  // можно снять, если это несколько файлов одного случая — тогда все
  // уходят в одну карточку.
  const splitIntoCards = state.pendingMedia.length > 1 && els.fieldSplitCards.checked;

  const newEntries = splitIntoCards
    ? state.pendingMedia.map((item) => ({
        id: cryptoId(),
        location,
        text,
        solution,
        note: "",
        media: [item],
        date: Date.now(),
      }))
    : [
        {
          id: cryptoId(),
          location,
          text,
          solution,
          note: "",
          media: [...state.pendingMedia],
          date: Date.now(),
        },
      ];

  state.entries.unshift(...newEntries);
  saveEntries();

  els.addDialog.close();

  state.index = 0;
  renderSidebar();
  renderView();
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
  const d = new Date(ts);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(ts) {
  return new Date(ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
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

async function boot() {
  const results = await Promise.all(SECTIONS.map((sec) => loadSectionEntries(sec.key)));
  state.bySection = {};
  SECTIONS.forEach((sec, i) => {
    state.bySection[sec.key] = results[i];
  });
  state.entries = state.bySection[state.section];
  renderSidebar();
  renderView();
}

boot();
