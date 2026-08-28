"use strict";

/**
 * Фотоотчёт — Бройлерная площадка (aitas mpf). Только один раздел —
 * «Несоответствия»; в отличие от дашборда Инкубатора здесь нет раздела
 * сравнения с эталоном. Данные хранятся
 * локально в IndexedDB — фото уходят внутрь как dataURL (уменьшенные и
 * пережатые в JPEG, см. compressDataUrl), так что всё работает
 * полностью офлайн, без бэкенда.
 *
 * Это отдельная копия дашборда Инкубатора (js/discrepancies.js) для
 * другого цеха — своя база IndexedDB (IDB_NAME) и свои ключи
 * localStorage, чтобы данные двух цехов не пересекались, даже если оба
 * дашборда открыты в одном браузере.
 *
 * Важно: браузерное хранилище привязано к конкретному браузеру на
 * конкретном устройстве — если просто переслать этот файл другому
 * человеку, у него фото видно не будет. Поэтому есть кнопка «Скачать
 * копию для отправки», которая сохраняет отдельный .html-файл с уже
 * вшитыми данными (см. #embeddedData и exportShareableCopy ниже) —
 * именно этот файл и нужно пересылать, чтобы получатель сразу всё
 * увидел.
 */

const STORAGE_KEY = "aitas_broiler_discrepancies_v1";
const OLD_STORAGE_KEYS = []; // отдельный дашборд, мигрировать не с чего
const DEFAULT_LOCATION = "Бройлерная площадка";

const TEXT = {
  sidebarTotal: "Всего несоответствий",
  addHint: "Можно выбрать сразу много фото (100+) — по умолчанию каждое станет отдельной карточкой.",
  viewTitle: "Все несоответствия",
  emptyState: "Пока нет несоответствий в этом разделе",
  fieldLocationLabel: "Место / участок",
  fieldLocationPlaceholder: "напр. Птичник №3, Кормоцех",
  fieldTextLabel: "Описание несоответствия",
  addDialogTitleOne: "Новое несоответствие",
  addDialogTitleMany: (n) => `Новое несоответствие (${n} фото)`,
  exportPrefix: "nesootvetstviya-broiler",
  cardTextLabel: "Описание несоответствия",
  cardTextPlaceholder: "Опишите, что не так...",
  deleteConfirm: "Удалить это несоответствие?",
};

const els = {
  dash: document.querySelector(".dash"),
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  sidebarClose: document.getElementById("sidebarClose"),
  menuBtn: document.getElementById("menuBtn"),

  countAll: document.getElementById("countAll"),
  sidebarTotalLabel: document.getElementById("sidebarTotalLabel"),
  addHint: document.getElementById("addHint"),

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
  entries: [],
  index: 0,
  pendingPhotos: [], // dataURL[]
  viewMode: "cards", // "cards" | "list"
};

// ---------------------------------------------------------------------------
// Storage (IndexedDB, с миграцией из старого localStorage)
// ---------------------------------------------------------------------------

const IDB_NAME = "aitas_broiler_dashboard";
const IDB_VERSION = 1;
const IDB_STORE = "sections"; // одна запись: {key: "discrepancies", data: [...]}

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

function readEmbeddedJson(tagId) {
  try {
    const tag = document.getElementById(tagId);
    if (!tag) return null;
    const data = JSON.parse(tag.textContent.trim());
    return Array.isArray(data) && data.length ? data : null;
  } catch (err) {
    return null;
  }
}

function readEmbeddedData() {
  return readEmbeddedJson("embeddedData");
}

async function loadEntries() {
  try {
    const stored = await idbGet("discrepancies");
    if (stored !== null) return stored;

    // Открыт файл-копия, полученный от кого-то другого через «Скачать
    // копию для отправки» — в нём уже вшиты данные. Подхватываем
    // встроенные данные как стартовые.
    const embedded = readEmbeddedData();
    if (embedded) {
      const normalized = normalizeEntries(embedded);
      await idbSet("discrepancies", normalized).catch(() => {});
      return normalized;
    }

    // Миграция со старого localStorage (v1-v3, ограничен ~5-10 МБ) —
    // переносим один раз в IndexedDB, отбрасывая лишние поля.
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const normalized = normalizeEntries(JSON.parse(raw));
      await idbSet("discrepancies", normalized).catch(() => {});
      return normalized;
    }
    for (const oldKey of OLD_STORAGE_KEYS) {
      const old = localStorage.getItem(oldKey);
      if (!old) continue;
      const normalized = normalizeEntries(JSON.parse(old));
      await idbSet("discrepancies", normalized).catch(() => {});
      return normalized;
    }

    const demo = seedDemo();
    await idbSet("discrepancies", demo).catch(() => {});
    return demo;
  } catch (err) {
    console.warn("Не удалось прочитать локальные данные", err);
    return [];
  }
}

function normalizeEntries(raw) {
  return raw.map((e) => ({
    id: e.id || cryptoId(),
    location: e.location || DEFAULT_LOCATION,
    text: e.text || "",
    solution: e.solution || "",
    photos: Array.isArray(e.photos) ? e.photos : e.photo ? [e.photo] : [],
    date: e.date || Date.now(),
  }));
}

// Пишет в IndexedDB асинхронно в фоне — вызывающий код не ждёт (как и
// раньше с localStorage.setItem), но здесь лимит на порядки больше.
function saveEntries() {
  idbSet("discrepancies", state.entries).catch((err) => {
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
      photos: [],
      date: Date.now(),
    },
    {
      id: cryptoId(),
      location: "Поилки",
      text: "Подтекание в системе поения, влажная подстилка вокруг ниппелей.",
      solution: "Проверить герметичность соединений, заменить повреждённые ниппели, просушить подстилку.",
      photos: [],
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

function exportShareableCopy() {
  const doc = document.documentElement.cloneNode(true);

  const dataScript = doc.querySelector("#embeddedData");
  if (dataScript) dataScript.textContent = JSON.stringify(state.entries);

  // Диалоги/лайтбокс/дропзона могли остаться в промежуточном визуальном
  // состоянии (открыт, есть класс dragover и т.п.) — сбрасываем в копии.
  doc.querySelectorAll("dialog[open]").forEach((d) => d.removeAttribute("open"));
  const lb = doc.querySelector("#lightbox");
  if (lb) lb.setAttribute("hidden", "");

  const html = "<!DOCTYPE html>\n" + doc.outerHTML;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nesootvetstviya-broiler-${stamp}.html`;
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

async function exportToPowerPoint() {
  if (typeof PptxGenJS === "undefined") {
    alert("Не удалось загрузить модуль PowerPoint. Проверьте, что файл js/vendor/pptxgen.bundle.js доступен рядом с дашбордом.");
    return;
  }
  const t = TEXT;
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
    title.addText("aitas mpf — Макинская птицефабрика · Бройлерная площадка", {
      x: 0.6, y: 2.7, w: 12, h: 0.6, fontSize: 18, bold: true, color: PPTX_COLORS.inkSecondary,
    });
    title.addText(t.viewTitle, {
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

      const photo = entry.photos && entry.photos[0];
      if (photo) {
        slide.addImage({ data: photo, x: 0.5, y: 1.3, w: 6.5, h: 5.7, sizing: { type: "contain", w: 6.5, h: 5.7 } });
      } else {
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.5, y: 1.3, w: 6.5, h: 5.7, fill: { color: PPTX_COLORS.cream }, line: { color: PPTX_COLORS.creamLine },
        });
        slide.addText("Нет фото", { x: 0.5, y: 3.8, w: 6.5, h: 0.5, align: "center", fontSize: 16, color: PPTX_COLORS.inkMuted });
      }

      slide.addText(t.cardTextLabel, { x: 7.3, y: 1.3, w: 5.5, h: 0.4, fontSize: 13, bold: true, color: PPTX_COLORS.inkSecondary });
      slide.addText(entry.text || "—", { x: 7.3, y: 1.7, w: 5.5, h: 2, fontSize: 14, color: PPTX_COLORS.ink, valign: "top" });

      if (entry.solution) {
        slide.addText("💡 Предлагаемое решение", { x: 7.3, y: 3.9, w: 5.5, h: 0.4, fontSize: 13, bold: true, color: PPTX_COLORS.tealDark });
        slide.addText(entry.solution, {
          x: 7.3, y: 4.3, w: 5.5, h: 2.3, fontSize: 14, color: PPTX_COLORS.ink, valign: "top", fill: { color: PPTX_COLORS.tealSoft },
        });
      }

      if (entry.photos && entry.photos.length > 1) {
        slide.addText(`Ещё фото: ${entry.photos.length - 1} (см. следующие слайды)`, {
          x: 7.3, y: 6.7, w: 5.5, h: 0.4, fontSize: 11, italic: true, color: PPTX_COLORS.inkMuted,
        });
        entry.photos.slice(1).forEach((extraPhoto, i) => {
          const extraSlide = pptx.addSlide();
          extraSlide.addText(`${entry.location || ""} — фото ${i + 2} из ${entry.photos.length}`, {
            x: 0.5, y: 0.3, w: 12.3, h: 0.5, fontSize: 16, bold: true, color: PPTX_COLORS.ink,
          });
          extraSlide.addImage({ data: extraPhoto, x: 1.5, y: 1, w: 10.3, h: 6.1, sizing: { type: "contain", w: 10.3, h: 6.1 } });
        });
      }
    });

    const stamp = new Date().toISOString().slice(0, 10);
    await pptx.writeFile({ fileName: `${t.exportPrefix}-${stamp}.pptx` });
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
  const t = TEXT;
  els.countAll.textContent = state.entries.length;
  els.sidebarTotalLabel.textContent = t.sidebarTotal;
  els.addHint.textContent = t.addHint;

  // Обновляем подсказки для поля "место" в форме добавления
  const allLocations = new Set(state.entries.map((e) => e.location));
  els.locationOptions.innerHTML = [...allLocations]
    .map((loc) => `<option value="${escapeHtml(loc)}"></option>`)
    .join("");
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
els.sidebarClose.addEventListener("click", (e) => {
  e.preventDefault();
  closeSidebar();
});

// ---------------------------------------------------------------------------
// Main viewer
// ---------------------------------------------------------------------------

function renderView(direction = 0) {
  const list = getFiltered();
  const t = TEXT;

  els.viewTitle.textContent = t.viewTitle;

  if (!list.length) {
    els.emptyStateText.textContent = t.emptyState;
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

function renderListView(list) {
  els.listView.innerHTML = list
    .map(
      (entry, idx) => `
        <div class="list-card" data-idx="${idx}">
          <div class="list-card-photo" data-role="photo" title="${entry.photos.length ? "Открыть фото целиком" : "Нет фото"}">
            ${entry.photos.length ? `<img src="${entry.photos[0]}" alt="" />` : "📷"}
            ${entry.photos.length > 1 ? `<span class="photo-count-badge">+${entry.photos.length - 1}</span>` : ""}
            ${entry.photos.length ? '<span class="zoom-hint">⤢</span>' : ""}
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
      if (entry.photos.length) openLightbox(entry.photos, 0, entry.location);
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

const lightboxState = { photos: [], index: 0, caption: "" };

function openLightbox(photos, index, caption) {
  lightboxState.photos = photos;
  lightboxState.index = index;
  lightboxState.caption = caption || "";
  renderLightbox();
  els.lightbox.hidden = false;
}

function renderLightbox() {
  const { photos, index, caption } = lightboxState;
  els.lightboxImg.src = photos[index];
  const multi = photos.length > 1;
  els.lightboxCaption.textContent = multi ? `${caption} · фото ${index + 1} из ${photos.length}` : caption;
  els.lightboxPrev.hidden = !multi;
  els.lightboxNext.hidden = !multi;
}

function closeLightbox() {
  els.lightbox.hidden = true;
  els.lightboxImg.src = "";
}

function lightboxPrev() {
  if (!lightboxState.photos.length) return;
  lightboxState.index = (lightboxState.index - 1 + lightboxState.photos.length) % lightboxState.photos.length;
  renderLightbox();
}

function lightboxNext() {
  if (!lightboxState.photos.length) return;
  lightboxState.index = (lightboxState.index + 1) % lightboxState.photos.length;
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

  const hasPhotos = entry.photos.length > 0;
  const t = TEXT;

  card.innerHTML = `
    <div class="card-photo" id="cardPhoto" title="${hasPhotos ? "Нажмите, чтобы посмотреть фото целиком" : "Нажмите, чтобы загрузить фото"}">
      ${
        hasPhotos
          ? `<img src="${entry.photos[0]}" alt="Фото" />`
          : `<div class="card-photo-placeholder"><div class="icon">📷</div><p>Нажмите, чтобы загрузить фото</p></div>`
      }
      <button class="card-delete" id="cardDelete" title="Удалить">✕</button>
    </div>
    <div class="card-photo-strip" id="cardPhotoStrip"></div>
    <div class="card-body">
      <input class="card-location-input" id="cardLocationInput" value="${escapeHtml(entry.location)}" placeholder="${t.fieldLocationLabel}" />
      <div class="card-date">${formatDate(entry.date)}</div>

      <label class="card-field-label">${t.cardTextLabel}</label>
      <textarea class="card-text" id="cardText" rows="2" placeholder="${t.cardTextPlaceholder}">${escapeHtml(entry.text || "")}</textarea>

      <label class="card-field-label card-field-label-solution">💡 Предлагаемое решение</label>
      <textarea class="card-text card-solution" id="cardSolution" rows="2" placeholder="Что нужно сделать, чтобы устранить...">${escapeHtml(entry.solution || "")}</textarea>
    </div>
  `;

  els.cardStage.appendChild(card);

  card.querySelector("#cardPhoto").addEventListener("click", (e) => {
    if (e.target.closest("#cardDelete")) return;
    if (entry.photos.length) openLightbox(entry.photos, 0, entry.location);
    else promptAddPhotos(entry.id);
  });

  card.querySelector("#cardDelete").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteEntry(entry.id);
  });

  renderPhotoStrip(card, entry);

  const locationInput = card.querySelector("#cardLocationInput");
  locationInput.addEventListener(
    "input",
    debounce(() => {
      entry.location = locationInput.value.trim() || DEFAULT_LOCATION;
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
  const t = TEXT;
  if (!confirm(t.deleteConfirm)) return;
  state.entries = state.entries.filter((e) => e.id !== id);
  saveEntries();
  renderSidebar();
  renderView();
}

// Полоска миниатюр под фото карточки — позволяет прикрепить к одному
// несоответствию сразу несколько фотографий, открыть любую из них целиком
// или удалить отдельное фото.
function renderPhotoStrip(card, entry) {
  const strip = card.querySelector("#cardPhotoStrip");
  strip.innerHTML = "";

  entry.photos.forEach((photo, idx) => {
    const thumb = document.createElement("button");
    thumb.className = "photo-thumb";
    thumb.type = "button";
    thumb.title = "Открыть фото целиком";
    thumb.innerHTML = `<img src="${photo}" alt="" /><span class="photo-thumb-delete" title="Удалить это фото">✕</span>`;
    thumb.addEventListener("click", (e) => {
      if (e.target.closest(".photo-thumb-delete")) {
        e.stopPropagation();
        deletePhotoFromEntry(entry.id, idx);
        return;
      }
      openLightbox(entry.photos, idx, entry.location);
    });
    strip.appendChild(thumb);
  });

  const addThumb = document.createElement("button");
  addThumb.className = "photo-thumb photo-thumb-add";
  addThumb.type = "button";
  addThumb.title = "Добавить ещё фото";
  addThumb.textContent = "+";
  addThumb.addEventListener("click", () => promptAddPhotos(entry.id));
  strip.appendChild(addThumb);
}

function promptAddPhotos(entryId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.addEventListener("change", () => {
    const files = Array.from(input.files).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    Promise.all(files.map(fileToDataUrl)).then((dataUrls) => {
      const entry = state.entries.find((e) => e.id === entryId);
      if (!entry) return;
      entry.photos.push(...dataUrls);
      saveEntries();
      renderView();
    });
  });
  input.click();
}

function deletePhotoFromEntry(entryId, photoIndex) {
  const entry = state.entries.find((e) => e.id === entryId);
  if (!entry) return;
  entry.photos.splice(photoIndex, 1);
  saveEntries();
  renderView();
}

// ---------------------------------------------------------------------------
// Add dialog (в т.ч. массовая загрузка нескольких фото сразу)
// ---------------------------------------------------------------------------

function openAddDialog() {
  const t = TEXT;

  els.addForm.reset();
  state.pendingPhotos = [];
  els.dropPreview.hidden = true;
  els.dropzoneHint.hidden = false;
  els.dropzoneNote.hidden = true;
  els.splitToggle.hidden = true;
  els.fieldSplitCards.checked = true;

  els.fieldLocationLabel.textContent = t.fieldLocationLabel;
  els.fieldLocation.placeholder = t.fieldLocationPlaceholder;
  els.fieldTextLabel.textContent = t.fieldTextLabel;

  updateAddDialogMode();
  els.addDialog.showModal();
}

function updateAddDialogMode() {
  const t = TEXT;
  const n = state.pendingPhotos.length;
  els.addDialogTitle.textContent = n > 1 ? t.addDialogTitleMany(n) : t.addDialogTitleOne;
}

els.openAddBtn.addEventListener("click", openAddDialog);
els.emptyAddBtn.addEventListener("click", openAddDialog);
els.cancelAddBtn.addEventListener("click", () => els.addDialog.close());

els.dropzone.addEventListener("click", () => els.fieldPhoto.click());

els.fieldPhoto.addEventListener("change", () => {
  if (els.fieldPhoto.files.length) handlePickedPhotos(els.fieldPhoto.files);
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
  if (files && files.length) handlePickedPhotos(files);
});

async function handlePickedPhotos(fileList) {
  const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
  if (!files.length) return;

  state.pendingPhotos = await Promise.all(files.map(fileToDataUrl));
  updateAddDialogMode();

  if (state.pendingPhotos.length === 1) {
    els.dropPreview.src = state.pendingPhotos[0];
    els.dropPreview.hidden = false;
    els.dropzoneHint.hidden = true;
    els.dropzoneNote.hidden = true;
    els.splitToggle.hidden = true;
  } else {
    els.dropPreview.hidden = true;
    els.dropzoneHint.hidden = true;
    els.dropzoneNote.hidden = false;
    els.dropzoneNote.textContent = `Выбрано фото: ${state.pendingPhotos.length}.`;
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  }).then(compressDataUrl);
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
  const location = locationInput || DEFAULT_LOCATION;

  // При массовой загрузке (100+ фото) по умолчанию каждое фото — своя
  // карточка, чтобы к каждой можно было дописать своё описание. Флажок
  // можно снять, если это несколько ракурсов одного случая — тогда все
  // фото уходят в одну карточку.
  const splitIntoCards = state.pendingPhotos.length > 1 && els.fieldSplitCards.checked;

  const newEntries = splitIntoCards
    ? state.pendingPhotos.map((photo) => ({
        id: cryptoId(),
        location,
        text,
        solution,
        photos: [photo],
        date: Date.now(),
      }))
    : [
        {
          id: cryptoId(),
          location,
          text,
          solution,
          photos: [...state.pendingPhotos],
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
  state.entries = await loadEntries();
  renderSidebar();
  renderView();
}

boot();
