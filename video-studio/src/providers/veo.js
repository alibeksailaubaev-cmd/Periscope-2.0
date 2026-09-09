import fs from 'node:fs';
import { geminiApiKey, VEO_MODEL } from '../config.js';

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta';
const REQUEST_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 10_000;
const RENDER_TIMEOUT_MS = 15 * 60_000;

// Google renames video models between generations the same way OpenAI
// does, so try known ids and keep whichever one the account can use.
const MODEL_CANDIDATES = ['veo-3.0-fast-generate-001', 'veo-3.0-generate-001', 'veo-2.0-generate-001'];
const MODEL_UNAVAILABLE = /not found|not supported|does not exist|unsupported model|permission|not enabled/i;
let knownGoodModel = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { 'x-goog-api-key': geminiApiKey(), ...(options.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readErrorMessage(response) {
  try {
    const data = await response.json();
    return data?.error?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function startRender(model, prompt, seconds, width, height, imagePath) {
  const instance = { prompt };
  if (imagePath) {
    instance.image = {
      bytesBase64Encoded: (await fs.promises.readFile(imagePath)).toString('base64'),
      mimeType: 'image/jpeg',
    };
  }
  const response = await call(`${API_ROOT}/models/${model}:predictLongRunning`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      instances: [instance],
      parameters: {
        aspectRatio: width > height ? '16:9' : '9:16',
        durationSeconds: seconds,
        personGeneration: 'allow_all',
      },
    }),
  });
  if (!response.ok) throw new Error(`Veo: ${await readErrorMessage(response)}`);
  const operation = (await response.json())?.name;
  if (!operation) throw new Error('Veo: ответ без идентификатора операции');
  return operation;
}

async function waitForRender(operation, notify) {
  const deadline = Date.now() + RENDER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const response = await call(`${API_ROOT}/${operation}`);
    if (!response.ok) throw new Error(`Veo: ${await readErrorMessage(response)}`);
    const status = await response.json();
    if (status.error) throw new Error(`Veo: ${status.error.message || 'рендер не удался'}`);
    if (status.done) return status.response;
    notify?.('Veo рендерит клип...');
  }
  throw new Error('Veo: рендер не уложился в 15 минут');
}

// The finished video comes back either inline as base64 or as a URI that
// still needs the API key to fetch.
async function collectVideo(result) {
  const video = result?.generatedVideos?.[0]?.video
    || result?.generateVideoResponse?.generatedSamples?.[0]?.video
    || result?.predictions?.[0];
  const inline = video?.bytesBase64Encoded || video?.videoBytes;
  if (inline) return Buffer.from(inline, 'base64');

  const uri = video?.uri || video?.gcsUri;
  if (!uri) throw new Error('Veo: в ответе нет видео');
  const response = await call(uri);
  if (!response.ok) throw new Error(`Veo: скачивание не удалось (HTTP ${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

export async function generateVideoVeo({ prompt, seconds, width, height, imagePath }, notify) {
  const candidates = knownGoodModel
    ? [knownGoodModel]
    : [VEO_MODEL, ...MODEL_CANDIDATES.filter((m) => m !== VEO_MODEL)];

  let lastError;
  for (const model of candidates) {
    try {
      const operation = await startRender(model, prompt, seconds, width, height, imagePath);
      if (knownGoodModel !== model) {
        knownGoodModel = model;
        notify?.(`Модель анимации: ${model}`);
      }
      return await collectVideo(await waitForRender(operation, notify));
    } catch (err) {
      lastError = err;
      if (!MODEL_UNAVAILABLE.test(err.message)) throw err;
    }
  }
  throw lastError;
}

export const veoConfigured = () => Boolean(geminiApiKey());
