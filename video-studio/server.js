import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PORT, OFFLINE_MODE } from './src/config.js';
import { createJob, listJobs, getJob, deleteJob, getLogger, jobPath } from './src/store.js';
import { enqueue, pauseJob, resumeJob, status as queueStatus } from './src/queue.js';
import { openaiConfigured } from './src/providers/openai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function jobSummary(job) {
  const total = Object.values(job.progress).reduce((a, b) => a + b, 0);
  const totalMax = job.progress.scriptsTotal + job.progress.voiceTotal + job.progress.framesTotal + job.progress.videoTotal;
  const percent = totalMax > 0 ? Math.round((total / (totalMax * 2)) * 100) : 0;
  return {
    id: job.id,
    status: job.status,
    format: job.format,
    topic: job.topic,
    delivery: job.delivery,
    title: job.title,
    options: job.options,
    progress: job.progress,
    percent,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    hasVideo: Boolean(job.outputVideo && fs.existsSync(jobPath(job.id, job.outputVideo))),
    hasCover: Boolean(job.coverImage && fs.existsSync(jobPath(job.id, job.coverImage))),
  };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', offlineMode: OFFLINE_MODE, openaiConfigured, ...queueStatus() });
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

app.listen(PORT, () => {
  console.log(`Video Studio запущена: http://localhost:${PORT}`);
  if (OFFLINE_MODE) console.log('OFFLINE_MODE=1 — все шаги используют локальные заглушки без сети');
});
