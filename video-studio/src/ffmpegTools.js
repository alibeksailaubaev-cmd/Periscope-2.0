import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

const ffprobePath = ffprobeStatic.path;

function run(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${binary} завершился с кодом ${code}: ${stderr.slice(-800)}`));
    });
  });
}

export async function runFfmpeg(args) {
  await run(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
}

export async function probeDurationSeconds(filePath) {
  const { stdout } = await run(ffprobePath, [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', filePath,
  ]);
  const seconds = parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Не удалось определить длительность ${filePath}`);
  return seconds;
}

// Silent placeholder narration track, used by the offline TTS fallback.
export function makeSilentAudio(durationSeconds, outPath) {
  return runFfmpeg([
    '-f', 'lavfi', '-i', `anullsrc=r=24000:cl=mono`,
    '-t', String(durationSeconds),
    '-q:a', '9', '-acodec', 'libmp3lame',
    outPath,
  ]);
}

// A single Ken-Burns (slow zoom) video clip out of one still image, with
// the scene's narration track laid over it and trimmed to match its length.
export async function buildSceneClip({ imagePath, audioPath, outPath, width, height, fps = 30 }) {
  const duration = await probeDurationSeconds(audioPath);
  const frames = Math.max(1, Math.round(duration * fps));
  // Scale to cover and centre-crop, so an image of any aspect ratio fills
  // the frame instead of being stretched into it.
  const fill = `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase,crop=${width * 2}:${height * 2}`;
  const zoompan = `zoompan=z='min(zoom+0.0008,1.15)':d=${frames}:s=${width}x${height}:fps=${fps}`;
  await runFfmpeg([
    '-loop', '1', '-i', imagePath,
    '-i', audioPath,
    '-filter_complex', `[0:v]${fill},${zoompan},format=yuv420p[v]`,
    '-map', '[v]', '-map', '1:a',
    '-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p',
    '-shortest', '-t', String(duration),
    outPath,
  ]);
  return duration;
}

// The closing frame of a clip, used as the opening reference for the next
// one so an animated sequence continues instead of restarting.
export async function extractLastFrame(videoPath, outPath) {
  await runFfmpeg(['-sseof', '-0.4', '-i', videoPath, '-frames:v', '1', '-q:v', '2', outPath]);
}

// Lays the narration over a generated clip. The clip is almost always
// shorter than the voice track, so it loops until the narration ends
// rather than leaving the scene silent or cutting the sentence short.
export async function fitClipToAudio({ videoPath, audioPath, outPath, width, height, fps = 30 }) {
  const duration = await probeDurationSeconds(audioPath);
  await runFfmpeg([
    '-stream_loop', '-1', '-i', videoPath,
    '-i', audioPath,
    '-filter_complex',
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,` +
    `crop=${width}:${height},fps=${fps},format=yuv420p[v]`,
    '-map', '[v]', '-map', '1:a',
    '-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p',
    '-t', String(duration),
    outPath,
  ]);
}

// Re-encodes on concat (rather than -c copy) so clips of slightly
// different frame counts still produce a clean, seekable final file.
export async function concatClips(clipPaths, outPath) {
  const listContent = clipPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  const os = await import('node:os');
  const path = await import('node:path');
  const fs = await import('node:fs');
  const listFile = path.join(os.tmpdir(), `concat_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(listFile, listContent);
  try {
    await runFfmpeg([
      '-f', 'concat', '-safe', '0', '-i', listFile,
      '-c:v', 'libx264', '-c:a', 'aac', '-pix_fmt', 'yuv420p',
      outPath,
    ]);
  } finally {
    fs.rmSync(listFile, { force: true });
  }
}
