const STATUS_LABELS = {
  queued: 'В очереди',
  running: 'Выполняется',
  paused: 'Остановлено',
  done: 'Готово',
  failed: 'Ошибка',
};

let selectedJobId = null;
let eventSource = null;

const jobListEl = document.getElementById('job-list');
const overviewEl = document.getElementById('overview');
const logEl = document.getElementById('log');
const healthEl = document.getElementById('health');
const createForm = document.getElementById('create-form');
const keyForm = document.getElementById('key-form');
const keyStatusEl = document.getElementById('key-status');
const veoForm = document.getElementById('veo-form');
const veoStatusEl = document.getElementById('veo-status');
const scenesEl = document.getElementById('scenes');
const characterBox = document.getElementById('character-box');
const characterInput = document.getElementById('character-input');

async function api(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Ошибка запроса: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function renderJobList(jobs) {
  jobListEl.innerHTML = '';
  if (jobs.length === 0) {
    jobListEl.innerHTML = '<li class="muted" style="padding:8px;">Пока нет заданий</li>';
    return;
  }
  for (const job of jobs) {
    const li = document.createElement('li');
    li.className = 'job-item' + (job.id === selectedJobId ? ' selected' : '');
    li.innerHTML = `
      <div class="topic">${escapeHtml(job.title || job.topic)}</div>
      <div class="meta">
        <span class="badge ${job.status}">${STATUS_LABELS[job.status] || job.status}</span>
        <span>${job.percent}%</span>
      </div>`;
    li.addEventListener('click', () => selectJob(job.id));
    jobListEl.appendChild(li);
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function statRow(label, done, total) {
  return `<div class="stat"><div class="label">${label}</div><div class="value">${done}/${total}</div></div>`;
}

function renderOverview(job) {
  if (!job) {
    overviewEl.innerHTML = '<p class="muted">Выберите задание слева.</p>';
    return;
  }
  const p = job.progress;
  const canPause = job.status === 'running' || job.status === 'queued';
  const canResume = job.status === 'paused' || job.status === 'failed';
  const canDelete = job.status !== 'running';

  overviewEl.innerHTML = `
    <div>
      <div class="title">${escapeHtml(job.title || job.topic)}</div>
      <span class="badge ${job.status}">${STATUS_LABELS[job.status] || job.status}</span>
      <span class="muted"> · ${job.format === 'long' ? 'Long' : 'Short'} · ${escapeHtml(job.delivery)}</span>
    </div>
    ${job.error ? `<div style="color:var(--err)">Ошибка: ${escapeHtml(job.error)}</div>` : ''}
    <div class="progress-bar"><div style="width:${job.percent}%"></div></div>
    <div class="stats">
      ${statRow('Промпты', p.scriptsDone, p.scriptsTotal)}
      ${statRow('Озвучка', p.voiceDone, p.voiceTotal)}
      ${statRow('Кадры', p.framesDone, p.framesTotal)}
      ${statRow('Видео', p.videoDone, p.videoTotal)}
    </div>
    <div class="actions">
      ${canPause ? `<button data-action="pause">Остановить</button>` : ''}
      ${canResume ? `<button data-action="resume">Продолжить</button>` : ''}
      ${canDelete ? `<button data-action="delete" class="danger">Удалить</button>` : ''}
      ${job.hasVideo ? `<a href="/api/jobs/${job.id}/video" target="_blank">Скачать видео</a>` : ''}
      ${job.hasCover ? `<a href="/api/jobs/${job.id}/cover" target="_blank">Обложка</a>` : ''}
    </div>
  `;

  overviewEl.querySelector('[data-action="pause"]')?.addEventListener('click', () => runAction(job.id, 'pause'));
  overviewEl.querySelector('[data-action="resume"]')?.addEventListener('click', () => runAction(job.id, 'resume'));
  overviewEl.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    if (!confirm('Удалить задание вместе со всеми файлами?')) return;
    await api(`/api/jobs/${job.id}`, { method: 'DELETE' });
    selectedJobId = null;
    closeStream();
    renderOverview(null);
    logEl.textContent = '';
    refreshJobList();
  });
}

async function runAction(jobId, action) {
  try {
    await api(`/api/jobs/${jobId}/${action}`, { method: 'POST' });
  } catch (err) {
    alert(err.message);
  }
}

function closeStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

function selectJob(jobId) {
  selectedJobId = jobId;
  logEl.textContent = '';
  closeStream();
  refreshJobList();

  eventSource = new EventSource(`/api/jobs/${jobId}/stream`);
  eventSource.addEventListener('log', (e) => {
    logEl.textContent += JSON.parse(e.data) + '\n';
    logEl.scrollTop = logEl.scrollHeight;
  });
  let lastSignature = '';
  eventSource.addEventListener('progress', (e) => {
    const job = JSON.parse(e.data);
    renderOverview(job);
    // Only redraw the scene list when something about it actually changed.
    const signature = JSON.stringify(job.progress) + job.status;
    if (signature !== lastSignature) {
      lastSignature = signature;
      refreshScenes().catch(() => {});
    }
  });
  refreshScenes().catch(() => {});
}

function sceneCard(scene, jobId) {
  const card = document.createElement('div');
  card.className = 'scene-card';

  const thumb = scene.hasImage
    ? `<img class="scene-thumb" src="/api/jobs/${jobId}/scenes/${scene.index}/image?t=${Date.now()}" alt="кадр ${scene.index + 1}">`
    : '<div class="scene-thumb empty">кадр<br>ещё не готов</div>';

  card.innerHTML = `
    ${thumb}
    <div class="scene-body">
      <div class="scene-head">
        <span class="scene-num">Сцена ${scene.index + 1}</span>
        <span class="scene-flags">
          <span class="flag ${scene.hasAudio ? 'on' : ''}">озвучка</span>
          <span class="flag ${scene.hasImage ? 'on' : ''}">кадр</span>
          <span class="flag ${scene.hasClip ? 'anim' : ''}">видео</span>
        </span>
      </div>
      <label class="scene-field">Закадровый текст
        <textarea rows="3" data-field="narration">${escapeHtml(scene.narration)}</textarea>
      </label>
      <label class="scene-field">Промпт кадра (на английском)
        <textarea rows="3" data-field="imagePrompt">${escapeHtml(scene.imagePrompt)}</textarea>
      </label>
      <div class="scene-actions">
        <button data-act="save">Сохранить</button>
        <button data-act="redraw">Перерисовать кадр</button>
        <button data-act="revoice">Переозвучить</button>
        ${scene.hasAudio ? `<audio controls preload="none" src="/api/jobs/${jobId}/scenes/${scene.index}/audio"></audio>` : ''}
      </div>
    </div>`;

  const readEdits = () => ({
    narration: card.querySelector('[data-field="narration"]').value,
    imagePrompt: card.querySelector('[data-field="imagePrompt"]').value,
  });
  const save = () => api(`/api/jobs/${jobId}/scenes/${scene.index}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(readEdits()),
  });
  // Edits are saved before regenerating, so the new asset uses what is on
  // screen rather than what the model originally wrote.
  const regenerate = async (parts) => {
    await save();
    await api(`/api/jobs/${jobId}/scenes/${scene.index}/regenerate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parts }),
    });
    await refreshScenes();
  };

  card.querySelector('[data-act="save"]').addEventListener('click', () => save().catch((e) => alert(e.message)));
  card.querySelector('[data-act="redraw"]').addEventListener('click', () => regenerate(['image']).catch((e) => alert(e.message)));
  card.querySelector('[data-act="revoice"]').addEventListener('click', () => regenerate(['audio']).catch((e) => alert(e.message)));
  return card;
}

async function refreshScenes() {
  if (!selectedJobId) return;
  const { scenes, characterSheet } = await api(`/api/jobs/${selectedJobId}/scenes`);
  characterBox.hidden = scenes.length === 0;
  if (document.activeElement !== characterInput) characterInput.value = characterSheet;

  if (scenes.length === 0) {
    scenesEl.innerHTML = '<p class="muted" style="padding:12px">Сценарий ещё не готов — сцены появятся здесь.</p>';
    return;
  }
  // Editing in place would fight the periodic refresh, so cards are only
  // rebuilt while none of their fields is focused.
  if (scenesEl.contains(document.activeElement)) return;
  scenesEl.innerHTML = '';
  for (const scene of scenes) scenesEl.appendChild(sceneCard(scene, selectedJobId));
}

async function refreshJobList() {
  const jobs = await api('/api/jobs');
  renderJobList(jobs);
}

function renderKeyStatus(health) {
  if (health.openaiConfigured) {
    keyStatusEl.textContent = `Ключ подключён: ${health.openaiKeyPreview}`;
    keyStatusEl.className = 'key-status on';
  } else {
    keyStatusEl.textContent = 'Ключ не задан — работают бесплатные API';
    keyStatusEl.className = 'key-status off';
  }
  if (health.veoConfigured) {
    veoStatusEl.textContent = `Ключ подключён: ${health.veoKeyPreview}`;
    veoStatusEl.className = 'key-status on';
  } else {
    veoStatusEl.textContent = 'Ключ не задан — Veo недоступен';
    veoStatusEl.className = 'key-status off';
  }
}

async function refreshHealth() {
  try {
    const health = await api('/api/health');
    const mode = health.openaiConfigured ? 'OpenAI (платно)' : 'бесплатные API';
    const pipeline = health.activeJobId
      ? `конвейер занят · в очереди: ${health.queued.length}`
      : 'конвейер свободен';
    healthEl.textContent = `${pipeline} · ${mode}`;
    healthEl.className = 'health ' + (health.activeJobId ? 'busy' : 'idle');
    renderKeyStatus(health);
  } catch {
    healthEl.textContent = 'нет соединения с сервером';
    healthEl.className = 'health';
  }
}

keyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = keyForm.querySelector('input[name="key"]');
  try {
    await api('/api/settings/openai-key', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: input.value.trim() }),
    });
    input.value = '';
    await refreshHealth();
  } catch (err) {
    alert(err.message);
  }
});

createForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = createForm.querySelector('button');
  submitBtn.disabled = true;
  try {
    const data = new FormData(createForm);
    const payload = {
      topic: data.get('topic'),
      characterSheet: data.get('characterSheet'),
      delivery: data.get('delivery'),
      format: data.get('format'),
      visualStyle: data.get('visualStyle'),
      animation: data.get('animation'),
      videoProvider: data.get('videoProvider'),
      continuousMotion: data.get('continuousMotion') === 'on',
      historicalAccuracy: data.get('historicalAccuracy') === 'on',
      materialsProfile: data.get('materialsProfile') === 'on',
    };
    const job = await api('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // Only the topic is cleared: resetting the whole form would throw away
    // the format, style and animation choices on every submit.
    createForm.querySelector('textarea[name="topic"]').value = '';
    await refreshJobList();
    selectJob(job.id);
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

document.getElementById('character-save').addEventListener('click', async () => {
  try {
    await api(`/api/jobs/${selectedJobId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ characterSheet: characterInput.value }),
    });
    alert('Персонаж сохранён. Нажмите «Перерисовать кадр» на сценах, которые нужно обновить.');
  } catch (err) {
    alert(err.message);
  }
});

veoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = veoForm.querySelector('input[name="key"]');
  try {
    await api('/api/settings/gemini-key', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: input.value.trim() }),
    });
    input.value = '';
    await refreshHealth();
  } catch (err) {
    alert(err.message);
  }
});

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    for (const other of document.querySelectorAll('.tab')) other.classList.toggle('active', other === tab);
    document.getElementById('tab-scenes').hidden = tab.dataset.tab !== 'scenes';
    document.getElementById('tab-log').hidden = tab.dataset.tab !== 'log';
  });
}

refreshJobList();
refreshHealth();
setInterval(refreshJobList, 4000);
setInterval(refreshHealth, 3000);
