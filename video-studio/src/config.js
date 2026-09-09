import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const JOBS_DIR = path.join(DATA_DIR, 'jobs');

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
