import sharp from 'sharp';
import { OFFLINE_MODE } from '../config.js';

const REQUEST_TIMEOUT_MS = 60_000;

const PLACEHOLDER_COLORS = ['#223355', '#552233', '#2c4a3e', '#4a3c6e', '#6e5a2c'];

async function requestPollinationsImage(prompt, width, height) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const seed = Math.floor(Math.random() * 1_000_000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=${width}&height=${height}&nologo=true&seed=${seed}`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Pollinations image API вернул ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) throw new Error(`Неожиданный content-type: ${contentType}`);
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

// Keyless, offline placeholder: a gradient card with the scene prompt on
// it, so the pipeline always produces a valid image file end to end even
// without network access to the real image API.
function wrapLabel(text, maxCharsPerLine) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 6);
}

async function buildPlaceholderImage(prompt, width, height, sceneIndex) {
  const color = PLACEHOLDER_COLORS[sceneIndex % PLACEHOLDER_COLORS.length];
  const label = prompt.length > 160 ? prompt.slice(0, 157) + '…' : prompt;
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fontSize = Math.round(Math.min(width, height) * 0.045);
  const lineHeight = fontSize * 1.3;
  const lines = wrapLabel(label, Math.round((width * 0.88) / (fontSize * 0.62)));
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map((line, i) => `<tspan x="50%" y="${startY + i * lineHeight}">${escape(line)}</tspan>`)
    .join('');
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${color}"/>
    <text font-family="sans-serif" font-size="${fontSize}" fill="#ffffffcc" text-anchor="middle">${tspans}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

export async function generateImage({ prompt, width, height, sceneIndex = 0 }, logger) {
  if (OFFLINE_MODE) {
    return buildPlaceholderImage(prompt, width, height, sceneIndex);
  }
  try {
    return await requestPollinationsImage(prompt, width, height);
  } catch (err) {
    logger.line(`Изображение через API не получено (${err.message}) — использую placeholder-кадр`);
    return buildPlaceholderImage(prompt, width, height, sceneIndex);
  }
}
