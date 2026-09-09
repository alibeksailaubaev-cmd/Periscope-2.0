import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PORT, OFFLINE_MODE, saveEnvKey, openaiApiKey, geminiApiKey } from './src/config.js';
import { createJob, listJobs, getJob, deleteJob, getLogger, jobPath, saveJob } from './src/store.js';
import { enqueue, pauseJob, resumeJob, status as queueStatus } from './src/queue.js';
import { openaiConfigured } from './src/providers/openai.js';
import { veoConfigured } from './src/providers/veo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
// A stale cached app.js silently drops newly added form fields, so the
// dashboard is always served fresh — it is a local tool, nothing to gain
// from caching it.
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => res.setHeader('cache-control', 'no-store'),
}));

function jobSummary(job) {
  const p = job.progress;
  const done = p.scriptsDone + p.voiceDone + p.framesDone + p.videoDone;
  const planned = p.scriptsTotal + p.voiceTotal + p.framesTotal + p.videoTotal;
  const percent = planned > 0 ? Math.round((done / planned) * 100) : 0;
  return {
    id: job.id,
    status: job.status,
    format: job.format,
    topic: job.topic,
    delivery: job.delivery,
    title: job.title,
    options: job.options,
    progress: p,
    percent,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    hasVideo: Boolean(job.outputVideo && fs.existsSync(jobPath(job.id, job.outputVideo))),
    hasCover: Boolean(job.coverImage && fs.existsSync(jobPath(job.id, job.coverImage))),
    characterSheet: job.characterSheet || job.script?.characterSheet || '',
  };
}

// Never sends a key itself back to the browser, only enough of it to
// recognise which one is stored.
function mask(key) {
  if (!key) return null;
  return key.length <= 12 ? '••••' : `${key.slice(0, 7)}…${key.slice(-4)}`;
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    offlineMode: OFFLINE_MODE,
    openaiConfigured: openaiConfigured(),
    openaiKeyPreview: mask(openaiApiKey()),
    veoConfigured: veoConfigured(),
    veoKeyPreview: mask(geminiApiKey()),
    ...queueStatus(),
  });
});

app.post('/api/settings/openai-key', (req, res) => {
  const key = String(req.body?.key || '').trim();
  if (!key.startsWith('sk-') || key.length < 20) {
    return res.status(400).json({ error: 'Ключ должен начинаться с "sk-" и быть полным' });
  }
  saveEnvKey('OPENAI_API_KEY', key);
  res.json({ openaiConfigured: true, openaiKeyPreview: mask(key) });
});

app.post('/api/settings/gemini-key', (req, res) => {
  const key = String(req.body?.key || '').trim();
  if (key.length < 20) return res.status(400).json({ error: 'Ключ Google выглядит неполным' });
  saveEnvKey('GEMINI_API_KEY', key);
  res.json({ veoConfigured: true, veoKeyPreview: mask(key) });
});

app.get('/api/jobs', (req, res) => {
  res.json(listJobs().map(jobSummary));
});

app.post('/api/jobs', (req, res) => {
  const { topic } = req.body || {};
  if (!topic || !String(topic).trim()) {
    return res.status(400).json({ error: 'Поле "тема" обязательно' });
  }
  const job = createJob(req.body);
  enqueue(job.id);
  res.status(201).json(jobSummary(job));
});

app.get('/api/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Задание не найдено' });
  res.json({ ...jobSummary(job), log: getLogger(job.id).tail(300) });
});

app.post('/api/jobs/:id/pause', (req, res) => {
  try {
    res.json(jobSummary(pauseJob(req.params.id)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/jobs/:id/resume', (req, res) => {
  try {
    res.json(jobSummary(resumeJob(req.params.id)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/jobs/:id', (req, res) => {
  try {
    deleteJob(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/jobs/:id/video', (req, res) => {
  const job = getJob(req.params.id);
  if (!job?.outputVideo) return res.status(404).end();
  res.sendFile(jobPath(job.id, job.outputVideo));
});

app.get('/api/jobs/:id/cover', (req, res) => {
  const job = getJob(req.params.id);
  if (!job?.coverImage) return res.status(404).end();
  res.sendFile(jobPath(job.id, job.coverImage));
});

app.patch('/api/jobs/:id', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Задание не найдено' });
  if (job.status === 'running') return res.status(400).json({ error: 'Сначала остановите задание' });
  if (typeof req.body?.characterSheet === 'string') {
    job.characterSheet = req.body.characterSheet.trim();
    saveJob(job);
  }
  res.json(jobSummary(job));
});

function sceneAsset(job, index, kind) {
  const file = { image: `images/scene_${index}.jpg`, audio: `audio/scene_${index}.mp3`, clip: `clips/scene_${index}.mp4` }[kind];
  return file ? jobPath(job.id, file) : null;
}

// Scene index coming from a URL: must land inside this job's scene list.
function readScene(req, res) {
  const job = getJob(req.params.id);
  if (!job?.script) {
    res.status(404).json({ error: 'Сценарий ещё не готов' });
    return null;
  }
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0 || index >= job.script.scenes.length) {
    res.status(404).json({ error: 'Такой сцены нет' });
    return null;
  }
  return { job, index };
}

app.get('/api/jobs/:id/scenes', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Задание не найдено' });
  if (!job.script) return res.json({ characterSheet: '', scenes: [] });
  res.json({
    characterSheet: job.characterSheet || job.script.characterSheet || '',
    scenes: job.script.scenes.map((scene, index) => ({
      index,
      narration: scene.narration,
      imagePrompt: scene.imagePrompt,
      hasImage: fs.existsSync(sceneAsset(job, index, 'image')),
      hasAudio: fs.existsSync(sceneAsset(job, index, 'audio')),
      hasClip: fs.existsSync(sceneAsset(job, index, 'clip')),
    })),
  });
});

app.get('/api/jobs/:id/scenes/:index/:kind(image|audio|clip)', (req, res) => {
  const found = readScene(req, res);
  if (!found) return;
  const filePath = sceneAsset(found.job, found.index, req.params.kind);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(filePath);
});

app.patch('/api/jobs/:id/scenes/:index', (req, res) => {
  const found = readScene(req, res);
  if (!found) return;
  const { job, index } = found;
  if (job.status === 'running') return res.status(400).json({ error: 'Сначала остановите задание' });

  const scene = job.script.scenes[index];
  if (typeof req.body?.narration === 'string' && req.body.narration.trim()) {
    scene.narration = req.body.narration.trim();
  }
  if (typeof req.body?.imagePrompt === 'string' && req.body.imagePrompt.trim()) {
    scene.imagePrompt = req.body.imagePrompt.trim();
  }
  saveJob(job);
  res.json({ index, narration: scene.narration, imagePrompt: scene.imagePrompt });
});

// Regeneration works by deleting what the scene already has: the pipeline
// skips every step whose file exists, so resuming rebuilds exactly the
// pieces that were removed.
app.post('/api/jobs/:id/scenes/:index/regenerate', (req, res) => {
  const found = readScene(req, res);
  if (!found) return;
  const { job, index } = found;
  if (job.status === 'running') return res.status(400).json({ error: 'Сначала остановите задание' });

  const parts = Array.isArray(req.body?.parts) && req.body.parts.length
    ? req.body.parts.filter((p) => ['image', 'audio'].includes(p))
    : ['image'];
  for (const part of [...parts, 'clip']) {
    fs.rmSync(sceneAsset(job, index, part), { force: true });
  }
  // The assembled video no longer matches the scenes it was built from.
  const finalPath = jobPath(job.id, 'output', 'video.mp4');
  fs.rmSync(finalPath, { force: true });
  job.outputVideo = null;
  job.progress.framesDone = Math.min(job.progress.framesDone, index);
  job.progress.voiceDone = parts.includes('audio') ? Math.min(job.progress.voiceDone, index) : job.progress.voiceDone;
  job.progress.videoDone = Math.min(job.progress.videoDone, index);
  job.status = 'paused';
  saveJob(job);

  try {
    resumeJob(job.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/jobs/:id/stream', (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).end();
  const logger = getLogger(req.params.id);

  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  for (const line of logger.tail(300)) send('log', line);
  send('progress', jobSummary(getJob(req.params.id)));

  const onLine = (line) => send('log', line);
  logger.on('line', onLine);

  const interval = setInterval(() => {
    const current = getJob(req.params.id);
    if (current) send('progress', jobSummary(current));
  }, 1000);

  req.on('close', () => {
    logger.off('line', onLine);
    clearInterval(interval);
  });
});

// Binds to loopback only: the dashboard can read and write the API key,
// so it must not be reachable from other machines on the network.
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Video Studio запущена: http://localhost:${PORT}`);
  console.log(openaiConfigured()
    ? `Ключ OpenAI найден (${maskedKey()}) — генерация пойдёт через OpenAI`
    : 'Ключ OpenAI не задан — работают бесплатные API. Вставить ключ можно в интерфейсе студии.');
  if (OFFLINE_MODE) console.log('OFFLINE_MODE=1 — все шаги используют локальные заглушки без сети');
});
