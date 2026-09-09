import {
  OPENAI_API_KEY, OPENAI_CHAT_MODEL, OPENAI_TTS_MODEL, OPENAI_TTS_VOICE, OPENAI_IMAGE_MODEL,
} from '../config.js';

const REQUEST_TIMEOUT_MS = 60_000;

function authHeaders() {
  return { authorization: `Bearer ${OPENAI_API_KEY}`, 'content-type': 'application/json' };
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

export async function generateImageOpenAI(prompt, width, height) {
  const response = await withTimeoutFetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: closestDalleSize(width, height),
      quality: 'standard',
      response_format: 'b64_json',
      n: 1,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI images: ${await readErrorMessage(response)}`);
  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI images: пустой ответ');
  return Buffer.from(b64, 'base64');
}

export const openaiConfigured = Boolean(OPENAI_API_KEY);
