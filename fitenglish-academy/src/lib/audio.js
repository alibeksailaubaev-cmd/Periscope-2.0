import { Howl } from 'howler'

/**
 * The prototype ships no media files, so every sound effect is synthesised
 * into a WAV data URI at runtime and handed to Howler for playback.
 * That keeps the audio layer real (and swappable for mp3 URLs later)
 * without committing binary assets to the repository.
 */
const SAMPLE_RATE = 22050

function writeString(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i))
}

/** Render a list of {freq, ms, type, gain} segments into a base64 WAV data URI. */
function renderWav(segments) {
  const total = segments.reduce((n, s) => n + Math.round((s.ms / 1000) * SAMPLE_RATE), 0)
  const buffer = new ArrayBuffer(44 + total * 2)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + total * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, total * 2, true)

  let cursor = 44
  segments.forEach(({ freq, ms, type = 'sine', gain = 0.3 }) => {
    const frames = Math.round((ms / 1000) * SAMPLE_RATE)
    for (let i = 0; i < frames; i += 1) {
      const t = i / SAMPLE_RATE
      const phase = 2 * Math.PI * freq * t
      const raw = type === 'square' ? Math.sign(Math.sin(phase)) : Math.sin(phase)
      // Short attack, exponential decay — stops the click at the edges.
      const envelope = Math.min(1, i / 120) * Math.exp((-3.2 * i) / frames)
      view.setInt16(cursor, raw * envelope * gain * 32767, true)
      cursor += 2
    }
  })

  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return `data:audio/wav;base64,${btoa(binary)}`
}

const RECIPES = {
  correct: [
    { freq: 659, ms: 110 },
    { freq: 988, ms: 190 },
  ],
  wrong: [{ freq: 165, ms: 240, type: 'square', gain: 0.18 }],
  levelUp: [
    { freq: 523, ms: 110 },
    { freq: 659, ms: 110 },
    { freq: 784, ms: 130 },
    { freq: 1046, ms: 260 },
  ],
  click: [{ freq: 880, ms: 55, gain: 0.14 }],
  chime: [
    { freq: 880, ms: 130 },
    { freq: 1175, ms: 220 },
  ],
}

const cache = new Map()

function howlFor(name) {
  if (!cache.has(name)) {
    cache.set(
      name,
      new Howl({ src: [renderWav(RECIPES[name])], format: ['wav'], volume: 0.5, html5: false }),
    )
  }
  return cache.get(name)
}

/** Play one of the named effects. Silently no-ops when sound is off. */
export function playSfx(name, enabled = true) {
  if (!enabled || !RECIPES[name]) return
  try {
    howlFor(name).play()
  } catch {
    /* Autoplay policy or an unsupported browser — never break the lesson. */
  }
}
