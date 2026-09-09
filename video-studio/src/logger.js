import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

// One Logger per job: appends to <jobDir>/log.txt and re-emits every line
// so the dashboard can tail it live over SSE.
export class JobLogger extends EventEmitter {
  constructor(jobDir) {
    super();
    this.filePath = path.join(jobDir, 'log.txt');
    this.setMaxListeners(50);
  }

  line(message) {
    const stamped = `[${new Date().toISOString().slice(11, 19)}] ${message}`;
    fs.appendFileSync(this.filePath, stamped + '\n');
    this.emit('line', stamped);
    return stamped;
  }

  tail(maxLines = 500) {
    if (!fs.existsSync(this.filePath)) return [];
    const content = fs.readFileSync(this.filePath, 'utf8').trimEnd();
    if (!content) return [];
    const lines = content.split('\n');
    return lines.slice(-maxLines);
  }
}
