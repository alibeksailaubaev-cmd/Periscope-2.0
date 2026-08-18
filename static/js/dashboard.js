/* Periscope 2.0 — логика дашборда: опрос статуса, управление потоком, галерея и журнал. */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const el = {
    stream: $("stream"),
    connPill: $("conn-pill"),
    connText: $("conn-text"),
    connMessage: $("conn-message"),
    fps: $("fps"),
    resolution: $("resolution"),
    backend: $("backend"),
    liveBadge: $("live-badge"),
    facesBadge: $("faces-badge"),
    statusPlate: $("status-plate"),
    statusText: $("status-text"),
    statusExtra: $("status-extra"),
    source: $("source"),
    gallery: $("gallery"),
    galleryCount: $("gallery-count"),
    logBody: $("log-body"),
    statTotal: $("stat-total"),
    statToday: $("stat-today"),
    statUptime: $("stat-uptime"),
    lightbox: $("lightbox"),
    lightboxImg: $("lightbox-img"),
    lightboxCaption: $("lightbox-caption"),
    toasts: $("toasts"),
  };

  const STATE_LABELS = {
    live: ["pill-live", "В эфире"],
    connecting: ["pill-connecting", "Подключение..."],
    error: ["pill-error", "Ошибка потока"],
    stopped: ["pill-idle", "Остановлено"],
  };

  let lastEventId = 0;
  let lastTotal = -1;

  /* ----------------------------- утилиты ----------------------------- */
  function toast(message, kind) {
    const node = document.createElement("div");
    node.className = "toast " + (kind || "");
    node.textContent = message;
    el.toasts.appendChild(node);
    setTimeout(() => {
      node.style.opacity = "0";
      node.style.transition = "opacity .3s";
      setTimeout(() => node.remove(), 300);
    }, 3600);
  }

  async function api(url, options) {
    const response = await fetch(url, options);
    let data = {};
    try { data = await response.json(); } catch (err) { /* пустой ответ */ }
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || "Ошибка запроса " + response.status);
    }
    return data;
  }

  function postJSON(url, body) {
    return api(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
  }

  function formatUptime(seconds) {
    const total = Math.max(0, Math.round(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  function escapeHtml(text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  /* ----------------------------- статус ----------------------------- */
  function renderStatus(data) {
    const [pillClass, pillLabel] = STATE_LABELS[data.state] || STATE_LABELS.stopped;
    el.connPill.className = "pill " + pillClass;
    el.connText.textContent = pillLabel;
    el.connMessage.textContent = data.message || "";
    el.fps.textContent = (data.fps || 0).toFixed(1);
    el.backend.textContent = data.backend || "—";

    const res = data.resolution || {};
    el.resolution.textContent = res.width ? `${res.width}×${res.height}` : "—";

    el.liveBadge.classList.toggle("off", data.state !== "live");
    el.liveBadge.textContent = data.state === "live" ? "● LIVE" : "○ OFFLINE";
    el.facesBadge.textContent = `Лиц: ${data.faces_count || 0}`;

    const level = data.state === "error" ? "error" : (data.status_level || "idle");
    el.statusPlate.className = "status-plate status-" + level;
    el.statusText.textContent = data.state === "error"
      ? "Нет сигнала"
      : (data.status_text || "Ожидание подключения");

    const glasses = (data.faces || []).filter((face) => face.glasses);
    if (glasses.length) {
      const best = Math.max.apply(null, glasses.map((face) => face.confidence || 0));
      el.statusExtra.textContent =
        `в очках: ${glasses.length} · уверенность ${best.toFixed(0)}%`;
    } else {
      el.statusExtra.textContent = data.faces_count
        ? `лиц в кадре: ${data.faces_count}` : "";
    }

    const stats = data.stats || {};
    el.statTotal.textContent = stats.total || 0;
    el.statToday.textContent = stats.today || 0;
    el.statUptime.textContent = formatUptime(data.uptime);

    if (lastTotal >= 0 && (stats.total || 0) > lastTotal) {
      loadEvents();
      toast("📸 Зафиксирован человек в очках", "ok");
    }
    lastTotal = stats.total || 0;
  }

  async function pollStatus() {
    try {
      renderStatus(await api("/api/status"));
    } catch (err) {
      el.connPill.className = "pill pill-error";
      el.connText.textContent = "Сервер недоступен";
    }
  }

  /* ----------------------------- события ----------------------------- */
  function renderGallery(events) {
    const shots = events.slice(0, 12);
    el.galleryCount.textContent = events.length ? `показано ${shots.length} из ${events.length}` : "";
    if (!shots.length) {
      el.gallery.innerHTML =
        '<p class="empty">Пока ничего не зафиксировано. Подключите камеру и покажите человека в очках.</p>';
      return;
    }
    el.gallery.innerHTML = shots.map((event) => `
      <figure class="shot" data-url="${escapeHtml(event.url)}"
              data-caption="${escapeHtml(event.filename)} · ${escapeHtml(event.datetime)} · ${event.confidence}%">
        <img src="${escapeHtml(event.thumb_url || event.url)}" alt="${escapeHtml(event.filename)}" loading="lazy">
        <figcaption class="shot-meta">
          <span class="shot-conf">${Number(event.confidence || 0).toFixed(0)}%</span>
          <span class="shot-time">${escapeHtml(event.time || "")}</span><br>
          <span class="shot-date">${escapeHtml(event.date || "")}</span>
        </figcaption>
      </figure>`).join("");
  }

  function renderLog(events) {
    if (!events.length) {
      el.logBody.innerHTML = '<tr class="empty-row"><td colspan="6">Записей пока нет</td></tr>';
      return;
    }
    el.logBody.innerHTML = events.map((event) => {
      const manual = event.status !== "В очках";
      const confidence = Number(event.confidence || 0);
      return `
      <tr>
        <td class="mono">#${event.id}</td>
        <td class="mono">${escapeHtml(event.datetime)}</td>
        <td><span class="status-tag ${manual ? "manual" : ""}">${manual ? "📷" : "👓"} ${escapeHtml(event.status)}</span></td>
        <td class="mono">${escapeHtml(event.filename)}</td>
        <td>
          <div class="conf-bar">
            <span class="conf-track"><span class="conf-fill" style="width:${Math.min(100, confidence)}%"></span></span>
            <span class="conf-num">${confidence.toFixed(1)}%</span>
          </div>
        </td>
        <td><a class="link" data-url="${escapeHtml(event.url)}"
               data-caption="${escapeHtml(event.filename)} · ${escapeHtml(event.datetime)}">Открыть</a></td>
      </tr>`;
    }).join("");
  }

  async function loadEvents() {
    try {
      const data = await api("/api/events?limit=200");
      const events = data.events || [];
      renderGallery(events);
      renderLog(events);
      lastEventId = events.length ? events[0].id : 0;
    } catch (err) {
      console.error(err);
    }
  }

  /* ----------------------------- лайтбокс ----------------------------- */
  function openLightbox(url, caption) {
    el.lightboxImg.src = url;
    el.lightboxCaption.textContent = caption || "";
    el.lightbox.hidden = false;
  }
  function closeLightbox() {
    el.lightbox.hidden = true;
    el.lightboxImg.src = "";
  }

  document.addEventListener("click", (event) => {
    const holder = event.target.closest("[data-url]");
    if (holder) {
      openLightbox(holder.dataset.url, holder.dataset.caption);
      return;
    }
    if (event.target === el.lightbox || event.target.id === "lightbox-close") closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });

  /* ----------------------------- управление ----------------------------- */
  function reloadStream() {
    // Перезапускаем MJPEG-соединение, чтобы браузер не держал старый кадр.
    const base = el.stream.src.split("?")[0];
    el.stream.src = base + "?t=" + Date.now();
  }

  $("btn-connect").addEventListener("click", async () => {
    const source = el.source.value.trim();
    try {
      await postJSON("/api/connect", { source });
      toast("Подключаюсь к «" + source + "»", "ok");
      setTimeout(reloadStream, 400);
    } catch (err) {
      toast(err.message, "err");
    }
  });

  el.source.addEventListener("keydown", (event) => {
    if (event.key === "Enter") $("btn-connect").click();
  });

  $("btn-disconnect").addEventListener("click", async () => {
    try {
      await postJSON("/api/disconnect");
      toast("Поток остановлен");
    } catch (err) {
      toast(err.message, "err");
    }
  });

  $("btn-snapshot").addEventListener("click", async () => {
    try {
      const data = await postJSON("/api/snapshot");
      toast("Снимок сохранён: " + data.event.filename, "ok");
      loadEvents();
    } catch (err) {
      toast(err.message, "err");
    }
  });

  $("btn-fullscreen").addEventListener("click", () => {
    const wrap = $("video-wrap");
    if (document.fullscreenElement) document.exitFullscreen();
    else if (wrap.requestFullscreen) wrap.requestFullscreen();
  });

  $("btn-clear").addEventListener("click", async () => {
    if (!confirm("Очистить журнал событий? Файлы снимков останутся на диске.")) return;
    try {
      const data = await postJSON("/api/events/clear", { delete_photos: false });
      toast("Удалено записей: " + data.removed, "ok");
      lastTotal = 0;
      loadEvents();
    } catch (err) {
      toast(err.message, "err");
    }
  });

  document.querySelectorAll(".tag[data-source]").forEach((tag) => {
    tag.addEventListener("click", () => {
      el.source.value = tag.dataset.source;
      el.source.focus();
    });
  });

  /* ----------------------------- настройки ----------------------------- */
  let settingsTimer = null;
  function pushSettings(patch, label) {
    clearTimeout(settingsTimer);
    settingsTimer = setTimeout(async () => {
      try {
        await postJSON("/api/settings", patch);
        if (label) toast(label, "ok");
      } catch (err) {
        toast(err.message, "err");
      }
    }, 250);
  }

  const cooldown = $("cooldown");
  cooldown.addEventListener("input", () => {
    $("cooldown-value").textContent = cooldown.value;
    pushSettings({ cooldown: parseFloat(cooldown.value) });
  });

  const sensitivity = $("sensitivity");
  sensitivity.addEventListener("input", () => {
    $("sensitivity-value").textContent = sensitivity.value;
    pushSettings({ sensitivity: parseFloat(sensitivity.value) / 100 });
  });

  const stable = $("stable");
  stable.addEventListener("input", () => {
    $("stable-value").textContent = stable.value;
    pushSettings({ min_stable_frames: parseInt(stable.value, 10) });
  });

  $("autosave").addEventListener("change", (event) => {
    pushSettings({ autosave: event.target.checked },
      event.target.checked ? "Автоснимки включены" : "Автоснимки выключены");
  });

  $("mirror").addEventListener("change", (event) => {
    pushSettings({ mirror: event.target.checked });
  });

  /* ----------------------------- запуск ----------------------------- */
  el.stream.addEventListener("error", () => setTimeout(reloadStream, 2000));

  pollStatus();
  loadEvents();
  setInterval(pollStatus, 800);
  setInterval(loadEvents, 15000);
})();
