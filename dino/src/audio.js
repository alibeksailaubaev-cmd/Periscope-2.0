// Звук: синтез через WebAudio. Если в sounds/sounds.json перечислены файлы,
// игра использует их вместо синтеза.
const SAMPLE_NAMES = ['roar-raptor', 'roar-trike', 'roar-rex', 'roar-strut', 'roar-anky', 'bite', 'ambient-day', 'ambient-night'];
// Взрослый размер вида: детёныши звучат выше.
const SIZE_REF = { raptor: 5.5, trike: 8.5, rex: 12, strut: 4.3, anky: 7 };

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.samples = {};
  }

  start() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.enabled ? 0.7 : 0;
    this.master.connect(c.destination);
    const len = c.sampleRate * 2;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.wind();
    this.loadSamples();
  }

  // sounds/sounds.json перечисляет файлы: {"roar-rex": "roar-rex.mp3", ...}
  async loadSamples() {
    let list;
    try {
      const r = await fetch('sounds/sounds.json');
      if (!r.ok) return;
      list = await r.json();
    } catch { return; }
    for (const n of SAMPLE_NAMES) {
      if (!list[n]) continue;
      const files = Array.isArray(list[n]) ? list[n] : [list[n]];
      for (const f of files) {
        try {
          const r = await fetch('sounds/' + f);
          if (r.ok) (this.samples[n] = this.samples[n] || []).push(await this.ctx.decodeAudioData(await r.arrayBuffer()));
        } catch { /* файл не загрузился — остаётся синтез */ }
      }
    }
    if (this.samples['ambient-night']) this.startNightLoop();
  }

  startNightLoop() {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.samples['ambient-night'][0];
    s.loop = true;
    this.nightGain = c.createGain();
    this.nightGain.gain.value = 0;
    s.connect(this.nightGain).connect(this.master);
    s.start();
  }

  playSample(name, gain = 1, rate = 1) {
    const list = this.samples[name];
    if (!list || !list.length || !this.ctx) return false;
    const s = this.ctx.createBufferSource();
    s.buffer = list[Math.floor(Math.random() * list.length)];
    s.playbackRate.value = rate;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    s.connect(g).connect(this.master);
    s.start();
    return true;
  }

  setEnabled(v) {
    this.enabled = v;
    if (this.master) this.master.gain.value = v ? 0.7 : 0;
  }

  wind() {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise; src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 380;
    const g = c.createGain();
    g.gain.value = 0.05;
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.08; lg.gain.value = 180;
    lfo.connect(lg).connect(f.frequency);
    src.connect(f).connect(g).connect(this.master);
    src.start(); lfo.start();
  }

  noiseBurst(t, dur, freq, q, gain, type = 'bandpass') {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // Голос животного на расстоянии: тише и глуше издалека.
  roarAt(spId, size, dist) {
    if (!this.ctx) return;
    const g = Math.max(0, 1 - dist / 170);
    if (g <= 0.02) return;
    const base = SIZE_REF[spId] || size;
    const rate = Math.max(0.75, Math.min(1.5, Math.sqrt(base / Math.max(size, 0.5))));
    if (this.playSample('roar-' + spId, g * g * 0.9, rate)) return;
    this.roar(spId, size, g * g);
  }

  // Рёв: низкий пилообразный тон с «хрипом», высота зависит от размера.
  roar(spId, size, vol = 1) {
    if (!this.ctx) return;
    const base0 = SIZE_REF[spId] || size;
    const rate = Math.max(0.75, Math.min(1.6, Math.sqrt(base0 / Math.max(size, 0.5))));
    if (this.playSample('roar-' + spId, vol, rate)) return;
    const c = this.ctx, t = c.currentTime;
    const base = Math.max(38, 190 / Math.sqrt(size));
    const dur = 1.1 + size * 0.07;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * vol + 0.0002, t + 0.15);
    g.gain.setValueAtTime(0.45 * vol + 0.0001, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(500 + base * 4, t); f.frequency.exponentialRampToValueAtTime(260, t + dur);
    const shaper = c.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3.5); }
    shaper.curve = curve;
    for (const [mul, type] of [[1, 'sawtooth'], [1.51, 'sawtooth'], [0.5, 'triangle']]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(base * mul * 1.25, t);
      o.frequency.linearRampToValueAtTime(base * mul, t + dur * 0.4);
      o.frequency.linearRampToValueAtTime(base * mul * 0.8, t + dur);
      const vib = c.createOscillator(), vg = c.createGain();
      vib.frequency.value = 18 + Math.random() * 10; vg.gain.value = base * 0.06;
      vib.connect(vg).connect(o.frequency);
      o.connect(shaper);
      o.start(t); o.stop(t + dur + 0.1); vib.start(t); vib.stop(t + dur + 0.1);
    }
    shaper.connect(f).connect(g).connect(this.master);
    this.noiseBurst(t, dur, 300 + base * 2, 0.8, 0.35);
  }

  bite() {
    if (!this.ctx) return;
    if (this.playSample('bite', 0.8)) return;
    const t = this.ctx.currentTime;
    this.noiseBurst(t, 0.12, 1400, 1.2, 0.5);
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.2);
  }

  hurt() { if (this.ctx) this.noiseBurst(this.ctx.currentTime, 0.25, 500, 0.7, 0.4); }
  eat() { if (this.ctx) this.noiseBurst(this.ctx.currentTime, 0.09, 2400 + Math.random() * 800, 2, 0.25); }

  drink() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(420 + Math.random() * 120, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.08);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.15);
  }

  // Птицы днём, насекомые ночью.
  ambient(dt, night, day = 1) {
    if (!this.ctx) return;
    if (this.nightGain) this.nightGain.gain.value = 0.55 * (1 - day);
    this.ambT = (this.ambT || 0) - dt;
    if (this.ambT > 0) return;
    const c = this.ctx, t = c.currentTime;
    if (!night) {
      this.ambT = 1.5 + Math.random() * 4;
      const n = 2 + Math.floor(Math.random() * 4), f0 = 2200 + Math.random() * 1800;
      for (let i = 0; i < n; i++) {
        const o = c.createOscillator(), g = c.createGain(), s = t + i * 0.13;
        o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(f0 * 1.4, s + 0.07);
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.03, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.1);
        o.connect(g).connect(this.master); o.start(s); o.stop(s + 0.12);
      }
    } else {
      this.ambT = 0.6 + Math.random() * 1.5;
      for (let i = 0; i < 6; i++) this.noiseBurst(t + i * 0.05, 0.03, 5200, 8, 0.03);
    }
  }
}
