import fs from 'node:fs';
import { generateVideoOpenAI, openaiConfigured } from './openai.js';
import { probeDurationSeconds, fitClipToAudio } from '../ffmpegTools.js';

// Video models render fixed short durations; narration is usually longer,
// so the clip is slowed/looped to cover the scene rather than cutting the
// voice off.
const MAX_CLIP_SECONDS = 12;

export async function animateScene({ imagePath, audioPath, prompt, outPath, width, height }, logger) {
  if (!openaiConfigured()) throw new Error('анимация требует ключ OpenAI');

  const narrationSeconds = await probeDurationSeconds(audioPath);
  const seconds = Math.min(MAX_CLIP_SECONDS, Math.max(4, Math.round(narrationSeconds)));

  const video = await generateVideoOpenAI(
    { prompt, seconds, width, height, imagePath },
    (message) => logger.line(message),
  );

  const rawPath = `${outPath}.raw.mp4`;
  fs.writeFileSync(rawPath, video);
  try {
    await fitClipToAudio({ videoPath: rawPath, audioPath, outPath, width, height });
  } finally {
    fs.rmSync(rawPath, { force: true });
  }
}
