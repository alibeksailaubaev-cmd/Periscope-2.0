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
  eventSource.addEventListener('progress', (e) => {
    renderOverview(JSON.parse(e.data));
  });
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
      delivery: data.get('delivery'),
      format: data.get('format'),
      visualStyle: data.get('visualStyle'),
      historicalAccuracy: data.get('historicalAccuracy') === 'on',
      materialsProfile: data.get('materialsProfile') === 'on',
    };
    const job = await api('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    createForm.reset();
    await refreshJobList();
    selectJob(job.id);
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

refreshJobList();
refreshHealth();
setInterval(refreshJobList, 4000);
setInterval(refreshHealth, 3000);
