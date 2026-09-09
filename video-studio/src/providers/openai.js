import fs from 'node:fs';
import {
  openaiApiKey, OPENAI_CHAT_MODEL, OPENAI_TTS_MODEL, OPENAI_TTS_VOICE,
  OPENAI_IMAGE_MODEL, OPENAI_IMAGE_QUALITY, OPENAI_VIDEO_MODEL,
} from '../config.js';

const REQUEST_TIMEOUT_MS = 120_000;
const RATE_LIMIT_RETRIES = 4;

function authHeaders() {
  return { authorization: `Bearer ${openaiApiKey()}`, 'content-type': 'application/json' };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function plainFetch(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// New accounts get a low images-per-minute allowance, and a documentary
// fires a dozen requests back to back, so waiting out a 429 is normal
// operation here rather than an error worth falling back over.
// `notify` takes a ready-to-show line for the job log.
async function withTimeoutFetch(url, options, notify) {
  for (let attempt = 0; ; attempt++) {
    const response = await plainFetch(url, options);
    if (response.status !== 429 || attempt >= RATE_LIMIT_RETRIES) return response;
    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(60_000, 5_000 * 2 ** attempt);
    notify?.(`Лимит OpenAI — жду ${Math.round(waitMs / 1000)} с и повторяю`);
    await sleep(waitMs);
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

export async function generateScriptOpenAI(systemPrompt, userPrompt) {
  const response = await withTimeoutFetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model: OPENAI_CHAT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!response.ok) throw new Error(`OpenAI chat: ${await readErrorMessage(response)}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI chat: пустой ответ');
  return content;
}

export async function synthesizeSpeechOpenAI(text, notify) {
  const response = await withTimeoutFetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ model: OPENAI_TTS_MODEL, voice: OPENAI_TTS_VOICE, input: text }),
  }, notify);
  if (!response.ok) throw new Error(`OpenAI TTS: ${await readErrorMessage(response)}`);
  return Buffer.from(await response.arrayBuffer());
}

// OpenAI retires image models (dall-e-3 is already gone) and each
// generation takes a different parameter set, so try known models newest
// first and remember whichever one the account can actually use.
const IMAGE_MODEL_CANDIDATES = ['gpt-image-1', 'dall-e-3', 'dall-e-2'];
const MODEL_UNAVAILABLE = /does not exist|do not have access|unknown model|invalid model|must be verified|verification/i;
let knownGoodImageModel = null;

function imageBodyFor(model, prompt, width, height) {
  const orientation = width === height ? 'square' : (width > height ? 'landscape' : 'portrait');
  if (model.startsWith('gpt-image')) {
    const size = { square: '1024x1024', landscape: '1536x1024', portrait: '1024x1536' }[orientation];
    return { model, prompt, size, quality: OPENAI_IMAGE_QUALITY, n: 1 };
  }
  if (model === 'dall-e-3') {
    const size = { square: '1024x1024', landscape: '1792x1024', portrait: '1024x1792' }[orientation];
    return { model, prompt, size, quality: 'standard', n: 1 };
  }
  return { model, prompt, size: '1024x1024', n: 1 };
}

function requestImage(body, notify) {
  return withTimeoutFetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }, notify);
}

async function generateWithModel(model, prompt, width, height, notify) {
  let response = await requestImage(imageBodyFor(model, prompt, width, height), notify);
  if (response.status === 400) {
    // Parameters shift between model generations; retry bare before
    // giving up on a model that may otherwise work fine.
    const message = await readErrorMessage(response);
    if (!/unknown parameter|unsupported|invalid value/i.test(message)) {
      throw new Error(`OpenAI images: ${message}`);
    }
    response = await requestImage({ model, prompt }, notify);
  }
  if (!response.ok) throw new Error(`OpenAI images: ${await readErrorMessage(response)}`);

  const image = (await response.json())?.data?.[0];
  if (image?.b64_json) return Buffer.from(image.b64_json, 'base64');
  if (image?.url) {
    const file = await withTimeoutFetch(image.url, {});
    if (!file.ok) throw new Error(`OpenAI images: картинка не скачалась (HTTP ${file.status})`);
    return Buffer.from(await file.arrayBuffer());
  }
  throw new Error('OpenAI images: пустой ответ');
}

export async function generateImageOpenAI(prompt, width, height, notify) {
  const candidates = knownGoodImageModel
    ? [knownGoodImageModel]
    : [OPENAI_IMAGE_MODEL, ...IMAGE_MODEL_CANDIDATES.filter((m) => m !== OPENAI_IMAGE_MODEL)];

  let lastError;
  for (const model of candidates) {
    try {
      const image = await generateWithModel(model, prompt, width, height, notify);
      if (knownGoodImageModel !== model) {
        knownGoodImageModel = model;
        notify?.(`Модель картинок: ${model}`);
      }
      return image;
    } catch (err) {
      lastError = err;
      if (!MODEL_UNAVAILABLE.test(err.message)) throw err;
    }
  }
  throw lastError;
}

// Video generation is asynchronous: the request returns a job that has to
// be polled until the render finishes, then the file is downloaded
// separately. Model names churn like the image ones, so try in order.
const VIDEO_MODEL_CANDIDATES = ['sora-2', 'sora-2-pro', 'sora-1'];
const VIDEO_POLL_INTERVAL_MS = 5_000;
const VIDEO_TIMEOUT_MS = 15 * 60_000;
let knownGoodVideoModel = null;

function videoSizeFor(width, height) {
  return width > height ? '1280x720' : '720x1280';
}

async function startVideoJob(model, prompt, seconds, width, height, imagePath, notify) {
  const size = videoSizeFor(width, height);
  const url = 'https://api.openai.com/v1/videos';

  // With a reference frame the clip keeps the look of the still we already
  // generated, so the animated scenes match the rest of the documentary.
  if (imagePath) {
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', prompt);
    form.append('size', size);
    form.append('seconds', String(seconds));
    form.append('input_reference', new Blob([await fs.promises.readFile(imagePath)], { type: 'image/jpeg' }), 'reference.jpg');
    const response = await withTimeoutFetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${openaiApiKey()}` },
      body: form,
    }, notify);
    if (response.ok) return (await response.json())?.id;
    const message = await readErrorMessage(response);
    notify?.(`Кадр как референс не принят (${message}) — генерирую по описанию`);
  }

  const response = await withTimeoutFetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ model, prompt, size, seconds: String(seconds) }),
  }, notify);
  if (!response.ok) throw new Error(`OpenAI video: ${await readErrorMessage(response)}`);
  return (await response.json())?.id;
}

async function waitForVideo(videoId, notify) {
  const deadline = Date.now() + VIDEO_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const response = await withTimeoutFetch(`https://api.openai.com/v1/videos/${videoId}`, {
      headers: authHeaders(),
    }, notify);
    if (!response.ok) throw new Error(`OpenAI video: ${await readErrorMessage(response)}`);
    const job = await response.json();
    if (job.status === 'completed') return;
    if (job.status === 'failed') throw new Error(`OpenAI video: ${job?.error?.message || 'рендер не удался'}`);
    await sleep(VIDEO_POLL_INTERVAL_MS);
  }
  throw new Error('OpenAI video: рендер не уложился в 15 минут');
}

async function downloadVideo(videoId, notify) {
  const response = await withTimeoutFetch(`https://api.openai.com/v1/videos/${videoId}/content`, {
    headers: authHeaders(),
  }, notify);
  if (!response.ok) throw new Error(`OpenAI video: скачивание не удалось (HTTP ${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

export async function generateVideoOpenAI({ prompt, seconds, width, height, imagePath }, notify) {
  const candidates = knownGoodVideoModel
    ? [knownGoodVideoModel]
    : [OPENAI_VIDEO_MODEL, ...VIDEO_MODEL_CANDIDATES.filter((m) => m !== OPENAI_VIDEO_MODEL)];

  let lastError;
  for (const model of candidates) {
    try {
      const videoId = await startVideoJob(model, prompt, seconds, width, height, imagePath, notify);
      if (!videoId) throw new Error('OpenAI video: ответ без идентификатора задачи');
      if (knownGoodVideoModel !== model) {
        knownGoodVideoModel = model;
        notify?.(`Модель анимации: ${model}`);
      }
      await waitForVideo(videoId, notify);
      return await downloadVideo(videoId, notify);
    } catch (err) {
      lastError = err;
      if (!MODEL_UNAVAILABLE.test(err.message)) throw err;
    }
  }
  throw lastError;
}

export const openaiConfigured = () => Boolean(openaiApiKey());
