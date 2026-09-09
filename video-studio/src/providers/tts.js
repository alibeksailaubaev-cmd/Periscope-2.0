import { OFFLINE_MODE } from '../config.js';
import { makeSilentAudio } from '../ffmpegTools.js';

const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_VOICE = 'ru-RU-SvetlanaNeural';
const WORDS_PER_SECOND = 2.4; // rough speaking pace, used only for the offline fallback

function estimateSilenceDuration(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / WORDS_PER_SECOND));
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('превышено время ожидания')), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

// Microsoft Edge's free, keyless "Read Aloud" text-to-speech service.
// Imported from the subpath because the edge-tts package's own "main"
// field points at an .ts file that plain Node can't load directly.
async function synthesizeWithEdge(text, outPath, voice) {
  const { ttsSave } = await import('edge-tts/out/index.js');
  await withTimeout(ttsSave(text, outPath, { voice }), REQUEST_TIMEOUT_MS);
}

export async function synthesizeSpeech({ text, outPath, voice = DEFAULT_VOICE }, logger) {
  if (OFFLINE_MODE) {
    await makeSilentAudio(estimateSilenceDuration(text), outPath);
    return;
  }
  try {
    await synthesizeWithEdge(text, outPath, voice);
  } catch (err) {
    logger.line(`Озвучка через Edge TTS не удалась (${err.message}) — использую тишину-заглушку`);
    await makeSilentAudio(estimateSilenceDuration(text), outPath);
  }
}
