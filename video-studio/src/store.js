import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { JOBS_DIR } from './config.js';
import { JobLogger } from './logger.js';

fs.mkdirSync(JOBS_DIR, { recursive: true });

const jobs = new Map(); // id -> job object (kept in sync with job.json on disk)
const loggers = new Map(); // id -> JobLogger

function jobDir(id) {
  return path.join(JOBS_DIR, id);
}

function jobFile(id) {
  return path.join(jobDir(id), 'job.json');
}

export function getLogger(id) {
  if (!loggers.has(id)) loggers.set(id, new JobLogger(jobDir(id)));
  return loggers.get(id);
}

export function saveJob(job) {
  job.updatedAt = new Date().toISOString();
  jobs.set(job.id, job);
  fs.mkdirSync(jobDir(job.id), { recursive: true });
  fs.writeFileSync(jobFile(job.id), JSON.stringify(job, null, 2));
  return job;
}

export function getJob(id) {
  return jobs.get(id) || null;
}

export function listJobs() {
  return [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createJob(input) {
  const id = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '_' + crypto.randomBytes(3).toString('hex');
  const format = input.format === 'short' ? 'short' : 'long';
  const job = {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'queued',
    pauseRequested: false,
    format,
    topic: String(input.topic || '').trim(),
    delivery: String(input.delivery || '').trim() || 'Документальная',
    options: {
      historicalAccuracy: Boolean(input.historicalAccuracy),
      materialsProfile: Boolean(input.materialsProfile),
      visualStyle: ['realism', 'illustration', 'cinematic'].includes(input.visualStyle)
        ? input.visualStyle
        : 'realism',
      animation: ['none', 'first', 'all'].includes(input.animation) ? input.animation : 'none',
    },
    title: null,
    script: null,
    progress: {
      scriptsTotal: 0, scriptsDone: 0,
      voiceTotal: 0, voiceDone: 0,
      framesTotal: 0, framesDone: 0,
      videoTotal: 0, videoDone: 0,
    },
    error: null,
    outputVideo: null,
    coverImage: null,
    runsCount: 0,
    startedAt: null,
    finishedAt: null,
  };
  fs.mkdirSync(jobDir(id), { recursive: true });
  fs.mkdirSync(path.join(jobDir(id), 'audio'), { recursive: true });
  fs.mkdirSync(path.join(jobDir(id), 'images'), { recursive: true });
  fs.mkdirSync(path.join(jobDir(id), 'clips'), { recursive: true });
  fs.mkdirSync(path.join(jobDir(id), 'output'), { recursive: true });
  return saveJob(job);
}

export function deleteJob(id) {
  const job = getJob(id);
  if (!job) return false;
  if (job.status === 'running') throw new Error('Нельзя удалить активное задание, сначала остановите его');
  fs.rmSync(jobDir(id), { recursive: true, force: true });
  jobs.delete(id);
  loggers.delete(id);
  return true;
}

export function jobPath(id, ...segments) {
  return path.join(jobDir(id), ...segments);
}

// Load any jobs already on disk (e.g. after a server restart) so the
// dashboard and queue see them again.
function loadFromDisk() {
  if (!fs.existsSync(JOBS_DIR)) return;
  for (const entry of fs.readdirSync(JOBS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = jobFile(entry.name);
    if (!fs.existsSync(file)) continue;
    try {
      const job = JSON.parse(fs.readFileSync(file, 'utf8'));
      // A job that was mid-run when the server stopped is neither really
      // running nor safely resumable from where it thinks it is; surface
      // it as paused so a person decides whether to continue it.
      if (job.status === 'running') job.status = 'paused';
      jobs.set(job.id, job);
    } catch {
      // Ignore a corrupted job directory rather than crashing startup.
    }
  }
}

loadFromDisk();
