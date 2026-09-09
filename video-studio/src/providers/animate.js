import fs from 'node:fs';
import sharp from 'sharp';
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

  // The video API rejects a reference frame whose dimensions differ from
  // the requested clip size, and the image models return their own sizes.
  const referencePath = `${outPath}.ref.jpg`;
  await sharp(imagePath).resize(width, height, { fit: 'cover' }).jpeg({ quality: 92 }).toFile(referencePath);

  const rawPath = `${outPath}.raw.mp4`;
  try {
    const video = await generateVideoOpenAI(
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
