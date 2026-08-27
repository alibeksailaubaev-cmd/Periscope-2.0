"use strict";

/**
 * Фотоотчёт по несоответствиям — Инкубатор (aitas ukpf).
 * Данные хранятся локально в localStorage — фото уходят внутрь как dataURL,
 * так что всё работает полностью офлайн, без бэкенда. Ни статус, ни
 * серьёзность, ни раздел не ведутся — только место, фото, описание и
 * предлагаемое решение.
 *
 * Важно: localStorage привязан к конкретному браузеру на конкретном
 * устройстве — если просто переслать этот файл другому человеку, у него
 * фото видно не будет. Поэтому есть кнопка «Скачать копию для отправки»,
 * которая сохраняет отдельный .html-файл с уже вшитыми данными (см.
 * #embeddedData и exportShareableCopy ниже) — именно этот файл и нужно
 * пересылать, чтобы получатель сразу всё увидел.
 */

const STORAGE_KEY = "aitas_discrepancies_v3";
const OLD_STORAGE_KEYS = ["aitas_discrepancies_v2", "aitas_discrepancies_v1"]; // мигрируем один раз, отбрасывая status/severity/раздел
const DEFAULT_LOCATION = "Инкубатор";

const els = {
  dash: document.querySelector(".dash"),
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  sidebarClose: document.getElementById("sidebarClose"),
  menuBtn: document.getElementById("menuBtn"),

  filterAll: document.getElementById("filterAll"),
  countAll: document.getElementById("countAll"),
  subLocations: document.getElementById("subLocations"),
  navGroups: document.getElementById("navGroups"),

  exportBtn: document.getElementById("exportBtn"),

  viewTitle: document.getElementById("viewTitle"),
  progressLabel: document.getElementById("progressLabel"),
  viewer: document.getElementById("viewer"),
  emptyState: document.getElementById("emptyState"),
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

  openAddBtn: document.getElementById("openAddBtn"),
  addDialog: document.getElementById("addDialog"),
  addDialogTitle: document.getElementById("addDialogTitle"),
  addForm: document.getElementById("addForm"),
  cancelAddBtn: document.getElementById("cancelAddBtn"),
  fieldLocation: document.getElementById("fieldLocation"),
  locationOptions: document.getElementById("locationOptions"),
  fieldPhoto: document.getElementById("fieldPhoto"),
  fieldText: document.getElementById("fieldText"),
  fieldSolution: document.getElementById("fieldSolution"),
  dropzone: document.getElementById("dropzone"),
  dropPreview: document.getElementById("dropPreview"),
  dropzoneHint: document.getElementById("dropzoneHint"),
  dropzoneNote: document.getElementById("dropzoneNote"),
};

const state = {
  entries: loadEntries(),
  filter: { location: null },
  index: 0,
  pendingPhotos: [], // dataURL[]
  viewMode: "cards", // "cards" | "list"
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function readEmbeddedData() {
  try {
    const tag = document.getElementById("embeddedData");
    if (!tag) return null;
    const data = JSON.parse(tag.textContent.trim());
    return Array.isArray(data) && data.length ? data : null;
  } catch (err) {
    return null;
  }
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // Открыт файл-копия, полученный от кого-то другого через «Скачать
    // копию для отправки» — в нём уже вшиты данные, localStorage у
    // получателя ещё пуст. Подхватываем встроенные данные как стартовые.
    const embedded = readEmbeddedData();
    if (embedded) return normalizeEntries(embedded);

    // Миграция со старых форматов (со статусом/серьёзностью/разделом) —
    // переносим один раз, отбрасывая лишние поля.
    for (const oldKey of OLD_STORAGE_KEYS) {
      const old = localStorage.getItem(oldKey);
      if (!old) continue;
      return normalizeEntries(JSON.parse(old));
    }

    return seedDemo();
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
    photo: e.photo || null,
    date: e.date || Date.now(),
  }));
}

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
  } catch (err) {
    console.warn("Не удалось сохранить данные локально", err);
  }
}

function seedDemo() {
  return [
    {
      id: cryptoId(),
      location: "Зал вывода — моечная",
      text: "Загрязнённый дренажный лоток, остатки скорлупы и пуха в отверстиях решётки.",
      solution: "Провести внеплановую мойку решётки и дренажного лотка, усилить контроль после смены.",
      photo: null,
      date: Date.now(),
    },
    {
      id: cryptoId(),
      location: "Зал сортировки",
      text: "Скопление картонных коробок на путях перемещения персонала.",
      solution: "Обеспечить своевременный вывоз тары, организовать постоянный контроль за местами хранения.",
      photo: null,
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
  a.download = `nesootvetstviya-${stamp}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

els.exportBtn.addEventListener("click", exportShareableCopy);

// ---------------------------------------------------------------------------
// Derived data
// ---------------------------------------------------------------------------

function getFiltered() {
  if (!state.filter.location) return state.entries;
  return state.entries.filter((e) => e.location === state.filter.location);
}

function locationCounts() {
  const map = new Map();
  state.entries.forEach((e) => map.set(e.location, (map.get(e.location) || 0) + 1));
  return map;
}

// ---------------------------------------------------------------------------
// Sidebar rendering
// ---------------------------------------------------------------------------

function renderSidebar() {
  els.countAll.textContent = state.entries.length;
  els.filterAll.classList.toggle("active", !state.filter.location);

  const map = locationCounts();
  els.subLocations.innerHTML = "";

  // Если всего одно место и оно совпадает с общим значением по умолчанию —
  // отдельный список не добавляет информации, прячем его.
  const entries = [...map.entries()];
  const showList = !(entries.length === 1 && entries[0][0] === DEFAULT_LOCATION);

  if (showList) {
    entries
      .sort((a, b) => b[1] - a[1])
      .forEach(([location, count]) => {
        const btn = document.createElement("button");
        btn.className = "nav-sub-item" + (state.filter.location === location ? " active" : "");
        btn.innerHTML = `<span>${escapeHtml(location)}</span><span class="count">${count}</span>`;
        btn.addEventListener("click", () => setFilter(location));
        els.subLocations.appendChild(btn);
      });
  }

  // Обновляем подсказки для поля "место" в форме добавления
  const allLocations = new Set(state.entries.map((e) => e.location));
  els.locationOptions.innerHTML = [...allLocations]
    .map((loc) => `<option value="${escapeHtml(loc)}"></option>`)
    .join("");
}

function setFilter(location) {
  state.filter = { location };
  state.index = 0;
  renderSidebar();
  renderView();
}

els.filterAll.addEventListener("click", () => setFilter(null));

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

  els.viewTitle.textContent = state.filter.location || "Все несоответствия";

  if (!list.length) {
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
          <div class="list-card-photo" data-role="photo" title="${entry.photo ? "Открыть фото целиком" : "Нет фото"}">
            ${entry.photo ? `<img src="${entry.photo}" alt="" />` : "📷"}
            ${entry.photo ? '<span class="zoom-hint">⤢</span>' : ""}
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
      if (entry.photo) openLightbox(entry.photo, entry.location);
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

function openLightbox(src, caption) {
  els.lightboxImg.src = src;
  els.lightboxCaption.textContent = caption || "";
  els.lightbox.hidden = false;
}

function closeLightbox() {
  els.lightbox.hidden = true;
  els.lightboxImg.src = "";
}

els.lightboxClose.addEventListener("click", closeLightbox);
els.lightbox.addEventListener("click", (e) => {
  if (e.target === els.lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !els.lightbox.hidden) closeLightbox();
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

  card.innerHTML = `
    <div class="card-photo" id="cardPhoto" title="${entry.photo ? "Нажмите, чтобы посмотреть фото целиком" : "Нажмите, чтобы загрузить фото"}">
      ${
        entry.photo
          ? `<img src="${entry.photo}" alt="Фото несоответствия" />`
          : `<div class="card-photo-placeholder"><div class="icon">📷</div><p>Нажмите, чтобы загрузить фото</p></div>`
      }
      <button class="card-delete" id="cardDelete" title="Удалить">✕</button>
      ${entry.photo ? `<button class="card-photo-replace" id="cardPhotoReplace" title="Заменить фото">🔄 Заменить</button>` : ""}
    </div>
    <div class="card-body">
      <input class="card-location-input" id="cardLocationInput" value="${escapeHtml(entry.location)}" placeholder="Место / участок" />
      <div class="card-date">${formatDate(entry.date)}</div>

      <label class="card-field-label">Описание несоответствия</label>
      <textarea class="card-text" id="cardText" rows="2" placeholder="Опишите, что не так...">${escapeHtml(entry.text || "")}</textarea>

      <label class="card-field-label card-field-label-solution">💡 Предлагаемое решение</label>
      <textarea class="card-text card-solution" id="cardSolution" rows="2" placeholder="Что нужно сделать, чтобы устранить...">${escapeHtml(entry.solution || "")}</textarea>
    </div>
  `;

  els.cardStage.appendChild(card);

  card.querySelector("#cardPhoto").addEventListener("click", (e) => {
    if (e.target.closest("#cardDelete") || e.target.closest("#cardPhotoReplace")) return;
    if (entry.photo) openLightbox(entry.photo, entry.location);
    else promptReplacePhoto(entry.id);
  });

  card.querySelector("#cardPhotoReplace")?.addEventListener("click", (e) => {
    e.stopPropagation();
    promptReplacePhoto(entry.id);
  });

  card.querySelector("#cardDelete").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteEntry(entry.id);
  });

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
  if (!confirm("Удалить это несоответствие?")) return;
  state.entries = state.entries.filter((e) => e.id !== id);
  saveEntries();
  renderSidebar();
  renderView();
}

function promptReplacePhoto(entryId) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    fileToDataUrl(file).then((dataUrl) => {
      const entry = state.entries.find((e) => e.id === entryId);
      if (!entry) return;
      entry.photo = dataUrl;
      saveEntries();
      renderView();
    });
  });
  input.click();
}

// ---------------------------------------------------------------------------
// Add dialog (в т.ч. массовая загрузка нескольких фото сразу)
// ---------------------------------------------------------------------------

function openAddDialog() {
  els.addForm.reset();
  state.pendingPhotos = [];
  els.dropPreview.hidden = true;
  els.dropzoneHint.hidden = false;
  els.dropzoneNote.hidden = true;
  updateAddDialogMode();
  if (state.filter.location) {
    els.fieldLocation.value = state.filter.location;
  }
  els.addDialog.showModal();
}

function updateAddDialogMode() {
  const n = state.pendingPhotos.length;
  const bulk = n > 1;
  els.addDialogTitle.textContent = bulk ? `Новые несоответствия (${n} фото)` : "Новое несоответствие";
  els.fieldLocation.placeholder = bulk ? "необязательно — можно уточнить в каждой карточке позже" : "напр. Зал вывода, Зал сортировки";
  document.getElementById("fieldTextWrap").querySelector("span").textContent = bulk
    ? "Описание (общее для всех, можно поправить позже в каждой карточке)"
    : "Описание несоответствия";
  document.getElementById("fieldSolutionWrap").querySelector("span").textContent = bulk
    ? "Предлагаемое решение (общее для всех, можно поправить позже)"
    : "Предлагаемое решение";
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
  } else {
    els.dropPreview.hidden = true;
    els.dropzoneHint.hidden = true;
    els.dropzoneNote.hidden = false;
    els.dropzoneNote.textContent = `Выбрано фото: ${state.pendingPhotos.length}. Для каждого будет создана отдельная карточка.`;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

els.addForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const text = els.fieldText.value.trim();
  const solution = els.fieldSolution.value.trim();
  const locationInput = els.fieldLocation.value.trim();
  const photos = state.pendingPhotos.length ? state.pendingPhotos : [null];

  const newEntries = photos.map((photo) => ({
    id: cryptoId(),
    location: locationInput || DEFAULT_LOCATION,
    text,
    solution,
    photo,
    date: Date.now(),
  }));

  state.entries.unshift(...newEntries);
  saveEntries();

  els.addDialog.close();

  state.filter = { location: locationInput || null };
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

renderSidebar();
renderView();
