import crypto from 'node:crypto';
import fs from 'node:fs';
import { WebSocket } from 'ws';
import { OFFLINE_MODE } from '../config.js';
import { makeSilentAudio } from '../ffmpegTools.js';

const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_VOICE = 'ru-RU-SvetlanaNeural';
const WORDS_PER_SECOND = 2.4; // rough speaking pace, used only for the offline fallback

// Reverse-engineered Microsoft Edge "Read Aloud" endpoint. Microsoft added
// an anti-abuse "Sec-MS-GEC" token requirement to this protocol at some
// point; without it the handshake is rejected with HTTP 403. The token is
// a SHA-256 hash of a Windows file-time timestamp (rounded down to a 5
// minute window) concatenated with a publicly known trusted client token.
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WIN_EPOCH = 11644473600; // seconds between 1601-01-01 and 1970-01-01
const BASE_HOST = 'speech.platform.bing.com/consumer/speech/synthesize/readaloud';
const CHROMIUM_VERSION = '130.0.2849.68';

function secMsGec() {
  let ticks = Date.now() / 1000 + WIN_EPOCH;
  ticks -= ticks % 300; // round down to the nearest 5-minute window
  const windowsTicks = Math.round(ticks * 1e7); // 100-nanosecond intervals
  return crypto.createHash('sha256').update(`${windowsTicks}${TRUSTED_CLIENT_TOKEN}`).digest('hex').toUpperCase();
}

function estimateSilenceDuration(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / WORDS_PER_SECOND));
}

function synthesizeWithEdge(text, voice) {
  return new Promise((resolve, reject) => {
    const wsUrl = `wss://${BASE_HOST}/edge/v1` +
      `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
      `&Sec-MS-GEC=${secMsGec()}` +
      `&Sec-MS-GEC-Version=1-${CHROMIUM_VERSION}` +
      `&ConnectionId=${crypto.randomUUID().replaceAll('-', '')}`;

    const ws = new WebSocket(wsUrl, {
      origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      headers: {
        'user-agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ` +
          `Chrome/${CHROMIUM_VERSION} Safari/537.36 Edg/${CHROMIUM_VERSION}`,
      },
    });

    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error('превышено время ожидания'));
    }, REQUEST_TIMEOUT_MS);

    const audioChunks = [];

    ws.on('open', () => {
      const speechConfig = JSON.stringify({
        context: { synthesis: { audio: {
          metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
          outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        } } },
      });
      ws.send(
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n${speechConfig}`,
      );

      const requestId = crypto.randomUUID().replaceAll('-', '');
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${text}</prosody></voice></speak>`;
      ws.send(
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${new Date().toISOString()}\r\nPath:ssml\r\n\r\n${ssml}`,
      );
    });

    ws.on('message', (data, isBinary) => {
      if (!isBinary) {
        if (data.toString('utf8').includes('Path:turn.end')) {
          clearTimeout(timer);
          ws.close();
          resolve(Buffer.concat(audioChunks));
        }
        return;
      }
      const separator = 'Path:audio\r\n';
      const idx = data.indexOf(separator);
      if (idx !== -1) audioChunks.push(data.subarray(idx + separator.length));
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

export async function synthesizeSpeech({ text, outPath, voice = DEFAULT_VOICE }, logger) {
  if (OFFLINE_MODE) {
    await makeSilentAudio(estimateSilenceDuration(text), outPath);
    return;
  }
  try {
    const audio = await synthesizeWithEdge(text, voice);
    if (audio.length === 0) throw new Error('пустой аудио-ответ');
    fs.writeFileSync(outPath, audio);
  } catch (err) {
    logger.line(`Озвучка через Edge TTS не удалась (${err.message}) — использую тишину-заглушку`);
    await makeSilentAudio(estimateSilenceDuration(text), outPath);
  }
}
