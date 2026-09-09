import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const JOBS_DIR = path.join(DATA_DIR, 'jobs');

export const ENV_FILE = path.join(ROOT_DIR, '.env');

// Windows text editors happily save as UTF-16 or prepend a UTF-8 BOM;
// reading such a file as plain utf8 yields garbage that silently parses
// into nothing, so sniff the byte-order mark before decoding.
function readTextFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.toString('utf16le', 2);
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return buffer.swap16().toString('utf16le', 2);
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return buffer.toString('utf8', 3);
  return buffer.toString('utf8');
}

// Minimal .env loader (no extra dependency): lines of KEY=VALUE, '#'
// comments and blank lines ignored. Never overrides a variable already
// set in the real environment.
function loadDotEnv() {
  if (!fs.existsSync(ENV_FILE)) return;
  for (const line of readTextFile(ENV_FILE).split('\n')) {
    const trimmed = line.trim().replace(/^﻿/, '');
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

// When set, script/voice/images all switch to the paid OpenAI APIs
// (much more reliable and higher quality than the keyless free tier),
// still falling back to the free providers and then offline placeholders
// if a call fails. Read through functions rather than constants: the key
// can also be set from the dashboard while the server is running.
export const openaiApiKey = () => process.env.OPENAI_API_KEY || null;
export const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
export const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'tts-1';
export const OPENAI_TTS_VOICE = process.env.OPENAI_TTS_VOICE || 'alloy';
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';

// Persists the key so it survives a restart, and applies it immediately
// so the running pipeline picks it up without one.
export function saveOpenAIKey(key) {
  process.env.OPENAI_API_KEY = key;
  const others = fs.existsSync(ENV_FILE)
    ? readTextFile(ENV_FILE).split('\n').filter((line) => !line.trim().startsWith('OPENAI_API_KEY='))
    : [];
  const content = [...others.map((l) => l.trimEnd()), `OPENAI_API_KEY=${key}`]
    .filter((line, i, all) => line !== '' || i < all.length - 1)
    .join('\n');
  fs.writeFileSync(ENV_FILE, content + '\n', 'utf8');
}

// Force every generation step to use the offline placeholder providers
// (silent audio, gradient images, template script). Useful for demoing
// the pipeline without depending on third-party services, or when a
// sandboxed network blocks outbound requests to them.
export const OFFLINE_MODE = process.env.OFFLINE_MODE === '1';

export const PORT = Number(process.env.PORT || 4100);

// "Long" vs "Short" presets control how many scenes the script is split
// into and roughly how many words of narration each scene gets.
export const FORMAT_PRESETS = {
  long: { scenes: 12, wordsPerScene: 70, width: 1280, height: 720 },
  short: { scenes: 5, wordsPerScene: 18, width: 720, height: 1280 },
};

export const VISUAL_STYLES = {
  realism: 'photorealistic, cinematic lighting, highly detailed',
  illustration: 'digital painting, illustrated, rich color palette',
  cinematic: 'cinematic still, dramatic lighting, film grain, wide shot',
};
