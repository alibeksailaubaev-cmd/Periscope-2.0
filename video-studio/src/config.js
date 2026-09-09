import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const JOBS_DIR = path.join(DATA_DIR, 'jobs');

// Minimal .env loader (no extra dependency): lines of KEY=VALUE, '#'
// comments and blank lines ignored. Never overrides a variable already
// set in the real environment.
function loadDotEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
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
// if a call fails.
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
export const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
export const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'tts-1';
export const OPENAI_TTS_VOICE = process.env.OPENAI_TTS_VOICE || 'alloy';
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';

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
