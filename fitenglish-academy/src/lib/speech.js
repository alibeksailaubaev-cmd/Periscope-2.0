/**
 * Speech layer.
 *
 * Text-to-speech quality is decided by the voices the operating system exposes,
 * and those range from genuinely native-sounding neural voices (Google UK
 * English, Microsoft "Natural", Apple Premium/Enhanced) to the robotic eSpeak
 * fallback shipped with bare Linux. So we do three things:
 *
 *   1. rank the installed English voices and pick the most native-sounding one,
 *   2. throw out the novelty and formant-synthesis voices outright,
 *   3. let the learner override the choice and remember it.
 *
 * Listening tracks prefer a real human recording when one exists (`audioUrl`)
 * and only fall back to synthesis — see `playRecording` in ListeningSection.
 */
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

/* ------------------------------------------------------------------ */
/* Voice ranking                                                       */
/* ------------------------------------------------------------------ */

/** macOS/iOS novelty voices and formant synthesisers — never acceptable here. */
const REJECT =
  /espeak|e-speak|albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|princess|bruce|agnes|victoria|grandma|grandpa|rocko|shelley|sandy|flo\b|eddy|reed|pipe organ|compact|eloquence/i

/** Neural / native-speaker voice families, best first. */
const QUALITY = [
  [/natural|neural/i, 100],
  [/\bgoogle\b/i, 90],
  [/premium|enhanced/i, 70],
  // Apple's native human-recorded voices.
  [/samantha|daniel|karen|moira|serena|tessa|fiona|aaron|nicky|siri/i, 60],
  // Microsoft's online voices.
  [/sonia|libby|ryan|aria|jenny|guy|michelle|abbi|alfie|maisie|thomas/i, 55],
]

const ACCENTS = {
  'en-gb': 'UK', 'en-us': 'US', 'en-au': 'Australia', 'en-ie': 'Ireland',
  'en-ca': 'Canada', 'en-nz': 'New Zealand', 'en-za': 'South Africa', 'en-in': 'India',
}

/** Accents spoken natively — put these ahead of second-language accents. */
const NATIVE_ACCENT_SCORE = { 'en-gb': 30, 'en-us': 26, 'en-au': 20, 'en-ie': 18, 'en-ca': 16, 'en-nz': 14 }

function scoreVoice(voice) {
  const name = `${voice.name} ${voice.voiceURI}`
  if (REJECT.test(name)) return -1

  let score = 10
  for (const [pattern, points] of QUALITY) {
    if (pattern.test(name)) {
      score += points
      break
    }
  }
  score += NATIVE_ACCENT_SCORE[voice.lang?.toLowerCase()] ?? 0
  // Network voices are almost always the neural ones; local ones are often the
  // old concatenative fallback.
  if (voice.localService === false) score += 20
  return score
}

/**
 * Which family a voice belongs to.
 * 'google'  — Chrome's free Google voices (network, neural, native-sounding)
 * 'neural'  — Microsoft Natural / Apple Premium & Enhanced
 * 'basic'   — everything else that survived the reject list
 */
export function voiceTier(voice) {
  const name = `${voice.name} ${voice.voiceURI}`
  if (/\bgoogle\b/i.test(name)) return 'google'
  if (/natural|neural|premium|enhanced/i.test(name)) return 'neural'
  return 'basic'
}

/** The voice that will actually speak, given the learner's choice (or none). */
export function activeVoice(uri) {
  return resolveVoice(uri)
}

export function accentOf(voice) {
  return ACCENTS[voice.lang?.toLowerCase()] ?? voice.lang ?? ''
}

/** A short, human label: "Sonia · UK · Natural". */
export function voiceLabel(voice) {
  const name = voice.name
    .replace(/^(Microsoft|Google)\s+/i, '')
    .replace(/\s*Online\s*/i, ' ')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    // Trailing language tails like "Sonia - English" or "Heera - English (India)".
    .replace(/\s*[-–—]\s*English.*$/i, '')
    .replace(/\s+English\s+(Female|Male)$/i, ' $1')
    .replace(/\s{2,}/g, ' ')
    .trim()
  const kind = /natural|neural/i.test(voice.name)
    ? 'Natural'
    : /premium|enhanced/i.test(voice.name)
      ? 'Premium'
      : /google/i.test(voice.name)
        ? 'Google'
        : ''
  const accent = accentOf(voice)
  // Don't repeat the accent when the voice name already carries it
  // ("UK Female · UK · Google" reads worse than "UK Female · Google").
  const parts = [name, new RegExp(accent, 'i').test(name) ? '' : accent, kind]
  return parts.filter(Boolean).join(' · ')
}

let allVoices = []
let chosenURI = null

function refresh() {
  if (!canSpeak) return
  try {
    allVoices = window.speechSynthesis
      .getVoices()
      .filter((v) => /^en/i.test(v.lang || ''))
      .map((v) => ({ voice: v, score: scoreVoice(v) }))
      .filter((v) => v.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((v) => v.voice)
  } catch {
    allVoices = []
  }
}

if (canSpeak) {
  refresh()
  try {
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
  } catch {
    try {
      window.speechSynthesis.onvoiceschanged = refresh
    } catch {
      /* Some Safari builds throw on assignment. */
    }
  }
}

/** English voices, most native-sounding first. Empty until the list loads. */
export function englishVoices() {
  if (!allVoices.length) refresh()
  return allVoices
}

/** True when the browser offers no voice we would be willing to use. */
export function hasUsableVoice() {
  return englishVoices().length > 0
}

export function setVoiceURI(uri) {
  chosenURI = uri || null
}

export function getVoiceURI() {
  return chosenURI
}

function resolveVoice(uri) {
  const voices = englishVoices()
  return voices.find((v) => v.voiceURI === (uri ?? chosenURI)) ?? voices[0] ?? null
}

/* ------------------------------------------------------------------ */
/* Speaking                                                            */
/* ------------------------------------------------------------------ */

/**
 * Chrome cuts an utterance off after roughly fifteen seconds, which wrecks a
 * whole article read aloud. Splitting the text into sentence-sized chunks and
 * chaining them keeps every chunk well under that ceiling.
 */
const MAX_CHUNK = 190

function chunk(text) {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?;:])\s+/)
    .filter(Boolean)

  const chunks = []
  let current = ''
  sentences.forEach((sentence) => {
    // A single sentence longer than the ceiling is split on commas.
    if (sentence.length > MAX_CHUNK) {
      if (current) {
        chunks.push(current)
        current = ''
      }
      sentence.split(/(?<=,)\s+/).forEach((part) => {
        if ((current + ' ' + part).trim().length > MAX_CHUNK) {
          if (current) chunks.push(current.trim())
          current = part
        } else {
          current = `${current} ${part}`.trim()
        }
      })
      return
    }
    if ((current + ' ' + sentence).trim().length > MAX_CHUNK) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current = `${current} ${sentence}`.trim()
    }
  })
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

let session = 0
let watchdog = null

function clearWatchdog() {
  if (watchdog) {
    clearTimeout(watchdog)
    watchdog = null
  }
}

/**
 * Speak English text aloud.
 * `rate` 0.5–1 slows the voice down for weaker learners; `onEnd` fires once the
 * last chunk has finished (or the speech was stopped), so the UI can reset its
 * play button instead of sitting on "Stop" forever.
 */
export function speak(text, { rate = 0.98, enabled = true, voiceURI, onEnd } = {}) {
  if (!enabled || !canSpeak || !text) {
    onEnd?.()
    return
  }

  const mySession = ++session
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* no-op */
  }
  clearWatchdog()

  const voice = resolveVoice(voiceURI)
  const parts = chunk(String(text))

  const sayNext = (index) => {
    if (mySession !== session) return
    if (index >= parts.length) {
      clearWatchdog()
      onEnd?.()
      return
    }

    let advanced = false
    const advance = () => {
      if (advanced || mySession !== session) return
      advanced = true
      clearWatchdog()
      sayNext(index + 1)
    }

    try {
      const utterance = new SpeechSynthesisUtterance(parts[index])
      if (voice) {
        utterance.voice = voice
        utterance.lang = voice.lang
      } else {
        utterance.lang = 'en-GB'
      }
      utterance.rate = rate
      utterance.pitch = 1
      utterance.onend = advance
      utterance.onerror = advance

      // Safety net: if the engine silently drops an utterance (it happens on
      // Chrome when the tab loses focus) move on rather than stalling.
      const budget = 2500 + (parts[index].length / Math.max(0.5, rate)) * 110
      watchdog = setTimeout(advance, budget)

      window.speechSynthesis.speak(utterance)
    } catch {
      advance()
    }
  }

  sayNext(0)
}

export function stopSpeaking() {
  session += 1
  clearWatchdog()
  if (!canSpeak) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* no-op */
  }
}

/* ------------------------------------------------------------------ */
/* Speech-to-text (used by the pronunciation recorder)                 */
/* ------------------------------------------------------------------ */

const Recognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined

export const canRecognise = Boolean(Recognition)

/**
 * Listen once and resolve with a transcript.
 * Without the Web Speech API the promise resolves with a mocked transcript
 * derived from `expected`, so the UI flow can still be demonstrated.
 */
export function recogniseOnce({ expected = '', onStart } = {}) {
  if (!Recognition) {
    onStart?.()
    return new Promise((resolve) => {
      setTimeout(() => resolve({ transcript: mockTranscript(expected), mocked: true }), 2200)
    })
  }

  return new Promise((resolve) => {
    const recognition = new Recognition()
    recognition.lang = 'en-GB'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    let settled = false
    const finish = (payload) => {
      if (settled) return
      settled = true
      resolve(payload)
    }

    recognition.onresult = (event) =>
      finish({ transcript: event.results[0][0].transcript, mocked: false })
    recognition.onerror = () => finish({ transcript: mockTranscript(expected), mocked: true })
    recognition.onend = () => finish({ transcript: '', mocked: false })

    onStart?.()
    try {
      recognition.start()
    } catch {
      finish({ transcript: mockTranscript(expected), mocked: true })
    }
  })
}

/** Drop or mangle a word or two so the mocked score is never a flat 100%. */
function mockTranscript(expected) {
  const words = expected.split(/\s+/).filter(Boolean)
  if (words.length < 4) return expected
  const dropAt = Math.floor(Math.random() * words.length)
  return words.filter((_, i) => i !== dropAt).join(' ')
}

/** Rough word-overlap score between what was said and what was expected. */
export function pronunciationScore(said, expected) {
  const clean = (s) => s.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  const target = clean(expected)
  if (!target.length) return 0
  const spoken = new Set(clean(said))
  const hits = target.filter((word) => spoken.has(word)).length
  return Math.round((hits / target.length) * 100)
}
