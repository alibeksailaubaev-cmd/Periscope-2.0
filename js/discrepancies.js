"use strict";

/**
 * Фотоотчёт по несоответствиям (aitas ukpf).
 * Данные хранятся локально в localStorage — фото уходят внутрь как dataURL,
 * так что всё работает полностью офлайн, без бэкенда. Статус намеренно не
 * ведётся — только раздел, место, серьёзность, фото, описание и
 * предлагаемое решение, чтобы в любой момент можно было просто посмотреть
 * все несоответствия.
 */

const STORAGE_KEY = "aitas_discrepancies_v2";
const OLD_STORAGE_KEY = "aitas_discrepancies_v1"; // формат с полем status — мигрируем один раз

const CATEGORY_LABEL = {
  incubator: "Инкубатор",
  broiler: "Бройлерные площадки",
};

const SEVERITY_LABEL = {
  critical: "Критично",
  medium: "Средне",
  low: "Незначительно",
};

const els = {
  dash: document.querySelector(".dash"),
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  sidebarClose: document.getElementById("sidebarClose"),
  menuBtn: document.getElementById("menuBtn"),

  filterAll: document.getElementById("filterAll"),
  countAll: document.getElementById("countAll"),
  countIncubator: document.getElementById("countIncubator"),
  countBroiler: document.getElementById("countBroiler"),
  subIncubator: document.getElementById("subIncubator"),
  subBroiler: document.getElementById("subBroiler"),
  navGroups: document.getElementById("navGroups"),

  statCritical: document.getElementById("statCritical"),
  statMedium: document.getElementById("statMedium"),
  statLow: document.getElementById("statLow"),

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
  fieldCategory: document.getElementById("fieldCategory"),
  fieldLocation: document.getElementById("fieldLocation"),
  locationOptions: document.getElementById("locationOptions"),
  fieldSeverity: document.getElementById("fieldSeverity"),
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
  filter: { category: "all", location: null },
  index: 0,
  pendingPhotos: [], // dataURL[]
  viewMode: "cards", // "cards" | "list"
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // Миграция со старого формата (со статусом) — переносим один раз,
    // просто отбрасывая поле status, остальное сохраняем как есть.
    const old = localStorage.getItem(OLD_STORAGE_KEY);
    if (old) {
      const entries = JSON.parse(old).map((e) => ({
        id: e.id,
        category: e.category,
        location: e.location,
        severity: e.severity || "medium",
        text: e.text || "",
        solution: e.solution || "",
        photo: e.photo || null,
        date: e.date,
      }));
      return entries;
    }

    return seedDemo();
  } catch (err) {
    console.warn("Не удалось прочитать локальные данные", err);
    return [];
  }
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
      category: "incubator",
      location: "Инкубатор",
      severity: "medium",
      text: "Загрязнённый дренажный лоток, остатки скорлупы и пуха в отверстиях решётки.",
      solution: "Провести внеплановую мойку решётки и дренажного лотка, усилить контроль после смены.",
      photo: null,
      date: Date.now(),
    },
    {
      id: cryptoId(),
      category: "broiler",
      location: "Бройлерная площадка №1",
      severity: "low",
      text: "Следы коррозии на потолочном коробе, требуется зачистка и подкраска.",
      solution: "Включить в план ремонта на этой неделе: зачистка, грунтовка, покраска короба.",
      photo: null,
      date: Date.now(),
    },
  ];
}

function cryptoId() {
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Derived data
// ---------------------------------------------------------------------------

function getFiltered() {
  return state.entries.filter((e) => {
    if (state.filter.category === "all") return true;
    if (e.category !== state.filter.category) return false;
    if (state.filter.location && e.location !== state.filter.location) return false;
    return true;
  });
}

function locationsFor(category) {
  const map = new Map();
  state.entries
    .filter((e) => e.category === category)
    .forEach((e) => map.set(e.location, (map.get(e.location) || 0) + 1));
  return map;
}

// ---------------------------------------------------------------------------
// Sidebar rendering
// ---------------------------------------------------------------------------

function renderSidebar() {
  const total = state.entries.length;
  const incubatorEntries = state.entries.filter((e) => e.category === "incubator");
  const broilerEntries = state.entries.filter((e) => e.category === "broiler");

  els.countAll.textContent = total;
  els.countIncubator.textContent = incubatorEntries.length;
  els.countBroiler.textContent = broilerEntries.length;

  renderSubList(els.subIncubator, locationsFor("incubator"), "incubator");
  renderSubList(els.subBroiler, locationsFor("broiler"), "broiler");

  els.statCritical.textContent = state.entries.filter((e) => e.severity === "critical").length;
  els.statMedium.textContent = state.entries.filter((e) => e.severity === "medium").length;
  els.statLow.textContent = state.entries.filter((e) => e.severity === "low").length;

  els.filterAll.classList.toggle("active", state.filter.category === "all");

  document.querySelectorAll(".nav-group-head").forEach((btn) => {
    const cat = btn.closest(".nav-group").dataset.category;
    btn.classList.toggle(
      "active",
      state.filter.category === cat && !state.filter.location
    );
  });

  // Обновляем подсказки для поля "место" в форме добавления
  const allLocations = new Set(state.entries.map((e) => e.location));
  els.locationOptions.innerHTML = [...allLocations]
    .map((loc) => `<option value="${escapeHtml(loc)}"></option>`)
    .join("");
}

function renderSubList(container, map, category) {
  container.innerHTML = "";
  [...map.entries()].forEach(([location, count]) => {
    const btn = document.createElement("button");
    btn.className = "nav-sub-item";
    if (state.filter.category === category && state.filter.location === location) {
      btn.classList.add("active");
    }
    btn.innerHTML = `<span>${escapeHtml(location)}</span><span class="count">${count}</span>`;
    btn.addEventListener("click", () => setFilter(category, location));
    container.appendChild(btn);
  });
}

function setFilter(category, location = null) {
  state.filter = { category, location };
  state.index = 0;
  renderSidebar();
  renderView();
}

els.filterAll.addEventListener("click", () => setFilter("all"));

document.querySelectorAll(".nav-group-head").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const group = btn.closest(".nav-group");
    const category = group.dataset.category;
    // Клик по заголовку — фильтр по всей категории; повторный клик сворачивает список
    if (state.filter.category === category && !state.filter.location) {
      group.classList.toggle("collapsed");
    } else {
      group.classList.remove("collapsed");
    }
    setFilter(category);
  });
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

// ---------------------------------------------------------------------------
// Main viewer
// ---------------------------------------------------------------------------

function renderView(direction = 0) {
  const list = getFiltered();

  els.viewTitle.textContent =
    state.filter.category === "all"
      ? "Все несоответствия"
      : (state.filter.location || CATEGORY_LABEL[state.filter.category]);

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

function severityColorVar(severity) {
  return severity === "critical" ? "var(--status-critical)" : severity === "low" ? "var(--status-good)" : "var(--status-warning)";
}

function renderListView(list) {
  els.listView.innerHTML = list
    .map((entry, idx) => {
      const severity = entry.severity || "medium";
      return `
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
              <span class="list-card-badge" style="background:${severityColorVar(severity)}">${SEVERITY_LABEL[severity]}</span>
              <span class="list-card-date">${formatShortDate(entry.date)}</span>
            </div>
          </div>
        </div>
      `;
    })
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

  const severity = entry.severity || "medium";

  card.innerHTML = `
    <div class="card-photo" id="cardPhoto" title="${entry.photo ? "Нажмите, чтобы посмотреть фото целиком" : "Нажмите, чтобы загрузить фото"}">
      ${
        entry.photo
          ? `<img src="${entry.photo}" alt="Фото несоответствия" />`
          : `<div class="card-photo-placeholder"><div class="icon">📷</div><p>Нажмите, чтобы загрузить фото</p></div>`
      }
      <div class="badge-row">
        <span class="badge badge-category">${escapeHtml(CATEGORY_LABEL[entry.category] || entry.category)}</span>
        <button class="card-delete" id="cardDelete" title="Удалить">✕</button>
      </div>
      ${entry.photo ? `<button class="card-photo-replace" id="cardPhotoReplace" title="Заменить фото">🔄 Заменить</button>` : ""}
    </div>
    <div class="card-body">
      <input class="card-location-input" id="cardLocationInput" value="${escapeHtml(entry.location)}" placeholder="Место / участок" />
      <div class="card-date">${formatDate(entry.date)}</div>

      <div class="status-row" id="severityRow">
        ${["critical", "medium", "low"]
          .map(
            (s) =>
              `<button type="button" class="status-btn severity-btn-${s} ${s === severity ? "active" : ""}" data-severity="${s}">${SEVERITY_LABEL[s]}</button>`
          )
          .join("")}
      </div>

      <label class="card-field-label">Описание несоответствия</label>
      <textarea class="card-text" id="cardText" rows="3" placeholder="Опишите, что не так...">${escapeHtml(entry.text || "")}</textarea>

      <label class="card-field-label">Предлагаемое решение</label>
      <textarea class="card-text card-solution" id="cardSolution" rows="3" placeholder="Что нужно сделать, чтобы устранить...">${escapeHtml(entry.solution || "")}</textarea>
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

  card.querySelector("#cardDelete").addEventListener("click", () => deleteEntry(entry.id));

  const locationInput = card.querySelector("#cardLocationInput");
  locationInput.addEventListener(
    "input",
    debounce(() => {
      entry.location = locationInput.value.trim() || CATEGORY_LABEL[entry.category];
      saveEntries();
      renderSidebar();
    }, 300)
  );

  const textarea = card.querySelector("#cardText");
  textarea.addEventListener(
    "input",
    debounce(() => {
      entry.text = textarea.value;
      saveEntries();
    }, 300)
  );

  const solutionArea = card.querySelector("#cardSolution");
  solutionArea.addEventListener(
    "input",
    debounce(() => {
      entry.solution = solutionArea.value;
      saveEntries();
    }, 300)
  );

  card.querySelector("#severityRow").addEventListener("click", (e) => {
    const btn = e.target.closest(".status-btn");
    if (!btn) return;
    entry.severity = btn.dataset.severity;
    saveEntries();
    renderSidebar();
    card.querySelectorAll(".status-btn").forEach((b) => b.classList.toggle("active", b === btn));
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
  if (state.filter.category !== "all") {
    els.fieldCategory.value = state.filter.category;
  }
  if (state.filter.location) {
    els.fieldLocation.value = state.filter.location;
  }
  els.addDialog.showModal();
}

function updateAddDialogMode() {
  const n = state.pendingPhotos.length;
  const bulk = n > 1;
  els.addDialogTitle.textContent = bulk ? `Новые несоответствия (${n} фото)` : "Новое несоответствие";
  els.fieldLocation.placeholder = bulk ? "необязательно — можно уточнить в каждой карточке позже" : "напр. Зал №2, Площадка №5";
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

  const category = els.fieldCategory.value;
  const severity = els.fieldSeverity.value;
  const text = els.fieldText.value.trim();
  const solution = els.fieldSolution.value.trim();
  const locationInput = els.fieldLocation.value.trim();
  const photos = state.pendingPhotos.length ? state.pendingPhotos : [null];

  const newEntries = photos.map((photo) => ({
    id: cryptoId(),
    category,
    location: locationInput || CATEGORY_LABEL[category],
    severity,
    text,
    solution,
    photo,
    date: Date.now(),
  }));

  state.entries.unshift(...newEntries);
  saveEntries();

  els.addDialog.close();

  state.filter = { category, location: locationInput || null };
  state.index = 0;
  renderSidebar();
  renderView();

  const group = document.querySelector(`.nav-group[data-category="${category}"]`);
  if (group) group.classList.remove("collapsed");
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
