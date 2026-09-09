import fs from 'node:fs';
import sharp from 'sharp';
import { generateVideoOpenAI, openaiConfigured } from './openai.js';
import { generateVideoVeo, veoConfigured } from './veo.js';
import { probeDurationSeconds, fitClipToAudio } from '../ffmpegTools.js';

// The video API only accepts these exact clip lengths. Narration rarely
// matches one of them, so the nearest is picked and the clip is looped to
// cover the rest of the line.
const ALLOWED_CLIP_SECONDS = [4, 8, 12];

function nearestAllowedSeconds(seconds) {
  return ALLOWED_CLIP_SECONDS.reduce(
    (best, value) => (Math.abs(value - seconds) < Math.abs(best - seconds) ? value : best),
  );
}

export async function animateScene(
  { imagePath, audioPath, prompt, outPath, width, height, continueFrom, provider = 'openai' },
  logger,
) {
  const useVeo = provider === 'veo';
  if (useVeo && !veoConfigured()) throw new Error('анимация через Veo требует ключ Google');
  if (!useVeo && !openaiConfigured()) throw new Error('анимация требует ключ OpenAI');

  // Sora takes fixed clip lengths; Veo renders whatever is asked within
  // its own range, so it can match the narration more closely.
  const narrationSeconds = await probeDurationSeconds(audioPath);
  const seconds = useVeo
    ? Math.min(8, Math.max(4, Math.round(narrationSeconds)))
    : nearestAllowedSeconds(narrationSeconds);

  // Starting from the previous clip's closing frame makes the sequence read
  // as one continuous shot; otherwise the scene's own still is the anchor.
  const referencePath = `${outPath}.ref.jpg`;
  const source = continueFrom || imagePath;
  if (continueFrom) logger.line('Продолжаю с последнего кадра предыдущей сцены');
  // The video API rejects a reference frame whose dimensions differ from
  // the requested clip size, and the image models return their own sizes.
  await sharp(source).resize(width, height, { fit: 'cover' }).jpeg({ quality: 92 }).toFile(referencePath);

  const rawPath = `${outPath}.raw.mp4`;
  try {
    const generate = useVeo ? generateVideoVeo : generateVideoOpenAI;
    const video = await generate(
      { prompt, seconds, width, height, imagePath: referencePath },
      (message) => logger.line(message),
    );
    fs.writeFileSync(rawPath, video);
    await fitClipToAudio({ videoPath: rawPath, audioPath, outPath, width, height });
  } finally {
    fs.rmSync(rawPath, { force: true });
    fs.rmSync(referencePath, { force: true });
  }
}
