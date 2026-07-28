"use strict";

/**
 * Periscope-style frontend.
 * Talks to /api/messages and /api/like (Vercel serverless functions, see /api).
 * If the backend is unreachable (e.g. opened as a local file), falls back
 * to a self-contained demo simulation so the UI still works standalone.
 */

const API_BASE = "/api";
const POLL_INTERVAL_MS = 2000;
const CHAT_MAX_ITEMS = 40;
const CHAT_LIFETIME_MS = 12000;

const els = {
  video: document.getElementById("video"),
  placeholder: document.getElementById("videoPlaceholder"),
  goLiveBtn: document.getElementById("goLiveBtn"),
  closeBtn: document.getElementById("closeBtn"),
  liveBadge: document.getElementById("liveBadge"),
  viewersCount: document.getElementById("viewersCount"),
  hostName: document.getElementById("hostName"),
  chatList: document.getElementById("chatList"),
  chatForm: document.getElementById("chatForm"),
  chatInput: document.getElementById("chatInput"),
  heartsLayer: document.getElementById("heartsLayer"),
  likeBtn: document.getElementById("likeBtn"),
  stream: document.querySelector(".stream"),
  nickDialog: document.getElementById("nickDialog"),
  nickForm: document.getElementById("nickForm"),
  nickInput: document.getElementById("nickInput"),
};

const state = {
  nickname: "",
  color: randomColor(),
  lastMessageId: 0,
  backendAvailable: true,
  viewers: 1,
  likeTotal: 0,
};

// ---------------------------------------------------------------------------
// Nickname
// ---------------------------------------------------------------------------

function initNickname() {
  const saved = localStorage.getItem("periscope_nick");
  if (saved) {
    state.nickname = saved;
    els.hostName.textContent = saved;
    return;
  }
  els.nickDialog.showModal();
  els.nickForm.addEventListener("submit", () => {
    const value = els.nickInput.value.trim() || `Гость${Math.floor(Math.random() * 1000)}`;
    state.nickname = value;
    localStorage.setItem("periscope_nick", value);
    els.hostName.textContent = value;
    pushSystemMessage(`${value} присоединился к эфиру`);
  });
}

// ---------------------------------------------------------------------------
// Video / "Go Live"
// ---------------------------------------------------------------------------

async function goLive() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: true,
    });
    els.video.srcObject = stream;
    els.placeholder.hidden = true;
    els.liveBadge.hidden = false;
    pushSystemMessage("Трансляция началась");
    startViewerSimulation();
  } catch (err) {
    alert(
      "Не удалось получить доступ к камере/микрофону. Разрешите доступ в браузере, чтобы начать эфир."
    );
    console.error(err);
  }
}

els.goLiveBtn.addEventListener("click", goLive);

els.closeBtn.addEventListener("click", () => {
  const tracks = els.video.srcObject?.getTracks?.() || [];
  tracks.forEach((t) => t.stop());
  els.video.srcObject = null;
  els.placeholder.hidden = false;
  els.liveBadge.hidden = true;
});

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

function pushSystemMessage(text) {
  renderMessage({ nick: null, text, id: `sys-${Date.now()}`, system: true });
}

function renderMessage({ nick, text, color, system }) {
  const li = document.createElement("li");
  if (system) {
    li.className = "system";
    li.textContent = text;
  } else {
    li.innerHTML = `<span class="nick" style="color:${color || "#1e90ff"}">${escapeHtml(
      nick
    )}:</span>${escapeHtml(text)}`;
  }
  els.chatList.appendChild(li);

  while (els.chatList.children.length > CHAT_MAX_ITEMS) {
    els.chatList.removeChild(els.chatList.firstChild);
  }

  setTimeout(() => li.remove(), CHAT_LIFETIME_MS);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function sendMessage(text) {
  renderMessage({ nick: state.nickname, text, color: state.color });

  if (!state.backendAvailable) return;

  try {
    await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nick: state.nickname, text, color: state.color }),
    });
  } catch (err) {
    state.backendAvailable = false;
    console.warn("Backend unavailable, switching to local-only mode.", err);
  }
}

els.chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = els.chatInput.value.trim();
  if (!text) return;
  if (!state.nickname) {
    els.nickDialog.showModal();
    return;
  }
  sendMessage(text);
  els.chatInput.value = "";
});

async function pollMessages() {
  if (!state.backendAvailable) return;
  try {
    const res = await fetch(`${API_BASE}/messages?after=${state.lastMessageId}`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    (data.messages || []).forEach((m) => {
      if (m.nick === state.nickname) return; // already rendered locally
      renderMessage(m);
      state.lastMessageId = Math.max(state.lastMessageId, m.id);
    });
  } catch (err) {
    state.backendAvailable = false;
  }
}

// ---------------------------------------------------------------------------
// Hearts / likes
// ---------------------------------------------------------------------------

const HEART_EMOJIS = ["❤️", "💛", "💙", "💚", "💜"];

function spawnHeart() {
  const heart = document.createElement("span");
  heart.className = "heart";
  heart.textContent = HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];

  const dxStart = (Math.random() - 0.5) * 60;
  const dxEnd = dxStart + (Math.random() - 0.5) * 140;
  const rot = (Math.random() - 0.5) * 40;
  const rotEnd = (Math.random() - 0.5) * 60;

  heart.style.setProperty("--dx-start", `${dxStart}px`);
  heart.style.setProperty("--dx-end", `${dxEnd}px`);
  heart.style.setProperty("--rot", `${rot}deg`);
  heart.style.setProperty("--rot-end", `${rotEnd}deg`);
  heart.style.right = `${20 + Math.random() * 20}px`;
  heart.style.fontSize = `${20 + Math.random() * 14}px`;

  els.heartsLayer.appendChild(heart);
  heart.addEventListener("animationend", () => heart.remove());
}

function burstHearts(count = 1) {
  for (let i = 0; i < count; i++) {
    setTimeout(spawnHeart, i * 90);
  }
}

async function sendLike() {
  burstHearts(1);
  state.likeTotal++;

  if (!state.backendAvailable) return;
  try {
    await fetch(`${API_BASE}/like`, { method: "POST" });
  } catch (err) {
    state.backendAvailable = false;
  }
}

els.likeBtn.addEventListener("click", sendLike);

let lastTap = 0;
els.video.addEventListener("click", () => {
  const now = Date.now();
  if (now - lastTap < 300) {
    burstHearts(6);
    sendLike();
  }
  lastTap = now;
});

async function pollLikes() {
  if (!state.backendAvailable) return;
  try {
    const res = await fetch(`${API_BASE}/like`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const delta = (data.total || 0) - state.likeTotal;
    if (delta > 0) {
      burstHearts(Math.min(delta, 8));
      state.likeTotal = data.total;
    }
  } catch (err) {
    state.backendAvailable = false;
  }
}

// ---------------------------------------------------------------------------
// Viewers (local simulation — replace with real presence data if needed)
// ---------------------------------------------------------------------------

function startViewerSimulation() {
  updateViewers();
  setInterval(updateViewers, 4000);
}

function updateViewers() {
  state.viewers = Math.max(1, state.viewers + Math.floor(Math.random() * 5) - 2);
  els.viewersCount.textContent = `👁 ${state.viewers} зрителей`;
}

function randomColor() {
  const palette = ["#1e90ff", "#ff6b6b", "#feca57", "#1dd1a1", "#a55eea", "#54a0ff"];
  return palette[Math.floor(Math.random() * palette.length)];
}

// ---------------------------------------------------------------------------
// Local demo fallback (no backend reachable)
// ---------------------------------------------------------------------------

const DEMO_NAMES = ["Аня", "Марат", "Диас", "Сара", "Тимур", "Лея"];
const DEMO_PHRASES = [
  "Привет всем! 👋",
  "Классный эфир!",
  "Откуда вещаешь?",
  "🔥🔥🔥",
  "Первый раз тебя смотрю",
  "Продолжай в том же духе",
];

function startDemoSimulation() {
  setInterval(() => {
    if (state.backendAvailable) return;
    if (Math.random() < 0.6) {
      renderMessage({
        nick: DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)],
        text: DEMO_PHRASES[Math.floor(Math.random() * DEMO_PHRASES.length)],
        color: randomColor(),
      });
    }
    if (Math.random() < 0.4) {
      burstHearts(1 + Math.floor(Math.random() * 3));
    }
  }, 2500);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

initNickname();
updateViewers();
setInterval(pollMessages, POLL_INTERVAL_MS);
setInterval(pollLikes, POLL_INTERVAL_MS);
startDemoSimulation();
