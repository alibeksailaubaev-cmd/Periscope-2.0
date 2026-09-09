import { getJob, saveJob } from './store.js';
import { runJob } from './pipeline.js';

// Single-worker FIFO queue: one job renders at a time, mirroring a real
// GPU/API-bound pipeline where running several jobs at once would just
// mean hitting free-tier rate limits faster.
const queue = [];
let activeJobId = null;

function pump() {
  if (activeJobId || queue.length === 0) return;
  const jobId = queue.shift();
  activeJobId = jobId;
  runJob(jobId).finally(() => {
    activeJobId = null;
    pump();
  });
}

export function enqueue(jobId) {
  if (!queue.includes(jobId) && activeJobId !== jobId) queue.push(jobId);
  pump();
}

export function status() {
  return { activeJobId, queued: [...queue] };
}

export function pauseJob(jobId) {
  const job = getJob(jobId);
  if (!job) throw new Error('Задание не найдено');
  if (job.status === 'running') {
    job.pauseRequested = true; // the running pipeline holds the same object and will notice this
    saveJob(job);
  } else if (job.status === 'queued') {
    const idx = queue.indexOf(jobId);
    if (idx !== -1) queue.splice(idx, 1);
    job.status = 'paused';
    saveJob(job);
  }
  return job;
}

export function resumeJob(jobId) {
  const job = getJob(jobId);
  if (!job) throw new Error('Задание не найдено');
  if (job.status !== 'paused' && job.status !== 'failed') {
    throw new Error('Продолжить можно только остановленное или упавшее задание');
  }
  job.status = 'queued';
  job.pauseRequested = false;
  job.error = null;
  saveJob(job);
  enqueue(jobId);
  return job;
}
