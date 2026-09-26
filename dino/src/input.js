// Сенсорное управление: левая половина экрана — джойстик, правая — камера. Плюс клавиатура.
export class Input {
  constructor(layer, knob, base) {
    this.layer = layer; this.knob = knob; this.base = base;
    this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.look = { id: null, lx: 0, ly: 0, dx: 0, dy: 0 };
    this.keys = new Set();
    this.held = { run: false, act: false };
    this.pressed = {};
    this.zoom = 0;
    this.lastLook = 0;
    this.pinch = null;
    const R = 56;
    layer.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.clientX < innerWidth * 0.45 && this.joy.id === null) {
        this.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
        base.style.transform = `translate(${e.clientX - 60}px, ${e.clientY - 60}px)`;
        knob.style.transform = 'translate(0px, 0px)';
        base.hidden = false;
      } else if (this.look.id === null) {
        this.look = { id: e.pointerId, lx: e.clientX, ly: e.clientY, dx: 0, dy: 0 };
      }
      try { layer.setPointerCapture(e.pointerId); } catch { /* не критично */ }
    });
    layer.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joy.id) {
        let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
        const l = Math.hypot(dx, dy);
        if (l > R) { dx *= R / l; dy *= R / l; }
        this.joy.x = dx / R; this.joy.y = -dy / R;
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
      } else if (e.pointerId === this.look.id) {
        this.look.dx += e.clientX - this.look.lx;
        this.look.dy += e.clientY - this.look.ly;
        this.look.lx = e.clientX; this.look.ly = e.clientY;
        this.lastLook = performance.now();
      }
    });
    const end = (e) => {
      if (e.pointerId === this.joy.id) { this.joy = { id: null, x: 0, y: 0 }; base.hidden = true; }
      if (e.pointerId === this.look.id) this.look.id = null;
    };
    layer.addEventListener('pointerup', end);
    layer.addEventListener('pointercancel', end);
    layer.addEventListener('wheel', (e) => { this.zoom += Math.sign(e.deltaY) * 0.1; e.preventDefault(); }, { passive: false });
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      const map = { KeyC: 'crouch', ControlLeft: 'crouch', KeyF: 'light', KeyM: 'map', Escape: 'pause', KeyJ: 'journal', Space: 'jump', KeyQ: 'throw', KeyR: 'runToggle' };
      if (map[e.code]) { this.pressed[map[e.code]] = true; e.preventDefault(); }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  bindButton(el, name, hold) {
    const down = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (hold) this.held[name] = true; else this.pressed[name] = true;
      el.classList.add('down');
    };
    const up = () => { if (hold) this.held[name] = false; el.classList.remove('down'); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  }

  consume(name) { const v = !!this.pressed[name]; this.pressed[name] = false; return v; }

  takeLook() {
    const d = { x: this.look.dx, y: this.look.dy };
    this.look.dx = this.look.dy = 0;
    const k = this.keys;
    if (k.has('ArrowLeft')) d.x -= 6;
    if (k.has('ArrowRight')) d.x += 6;
    if (k.has('ArrowLeft') || k.has('ArrowRight')) this.lastLook = performance.now();
    return d;
  }

  get move() {
    const k = this.keys;
    let x = this.joy.x, y = this.joy.y;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyD')) x += 1;
    if (k.has('KeyA')) x -= 1;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y, mag: Math.min(1, l) };
  }

  get run() { return this.held.run || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'); }
  get act() { return this.held.act || this.keys.has('KeyE'); }
}
