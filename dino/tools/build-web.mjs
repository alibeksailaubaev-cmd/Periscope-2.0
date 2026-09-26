// Копирует файлы игры в www/ — оттуда Capacitor упаковывает их в APK.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

rmSync('www', { recursive: true, force: true });
mkdirSync('www');
for (const p of ['index.html', 'style.css', 'src', 'vendor', 'sounds']) cpSync(p, `www/${p}`, { recursive: true });
console.log('www/ готов');
