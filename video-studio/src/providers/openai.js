import {
  openaiApiKey, OPENAI_CHAT_MODEL, OPENAI_TTS_MODEL, OPENAI_TTS_VOICE, OPENAI_IMAGE_MODEL,
} from '../config.js';

const REQUEST_TIMEOUT_MS = 60_000;

function authHeaders() {
  return { authorization: `Bearer ${openaiApiKey()}`, 'content-type': 'application/json' };
}

async function withTimeoutFetch(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
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

export async function synthesizeSpeechOpenAI(text) {
  const response = await withTimeoutFetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ model: OPENAI_TTS_MODEL, voice: OPENAI_TTS_VOICE, input: text }),
  });
  if (!response.ok) throw new Error(`OpenAI TTS: ${await readErrorMessage(response)}`);
  return Buffer.from(await response.arrayBuffer());
}

function closestDalleSize(width, height) {
  if (width === height) return '1024x1024';
  return width > height ? '1792x1024' : '1024x1792';
}

function requestImage(body) {
  return withTimeoutFetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
}

export async function generateImageOpenAI(prompt, width, height) {
  const body = { model: OPENAI_IMAGE_MODEL, prompt, size: closestDalleSize(width, height), n: 1 };
  let response = await requestImage(body);
  if (response.status === 400) {
    // The images endpoint keeps dropping optional parameters between model
    // generations; retry bare rather than failing over to a worse provider.
    const message = await readErrorMessage(response);
    if (!/unknown parameter|unsupported|invalid value/i.test(message)) {
      throw new Error(`OpenAI images: ${message}`);
    }
    response = await requestImage({ model: OPENAI_IMAGE_MODEL, prompt });
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

export const openaiConfigured = () => Boolean(openaiApiKey());
