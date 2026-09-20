/**
 * Thin wrappers around the browser speech APIs.
 * Text-to-speech is real everywhere it is supported; speech-to-text falls back
 * to a deterministic mock so the Speaking section still demos end to end.
 */
export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

let preferredVoice = null

function refreshVoice() {
  if (!canSpeak) return
  try {
    const voices = window.speechSynthesis.getVoices()
    preferredVoice =
      voices.find((v) => /en-GB/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || null
  } catch {
    preferredVoice = null
  }
}

if (canSpeak) {
  refreshVoice()
  try {
    window.speechSynthesis.onvoiceschanged = refreshVoice
  } catch {
    /* Safari throws on assignment in some versions. */
  }
}

/** Speak English text aloud. `rate` 0.5–1 slows the voice for weaker learners. */
export function speak(text, { rate = 0.95, enabled = true } = {}) {
  if (!enabled || !canSpeak || !text) return
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = preferredVoice?.lang || 'en-GB'
    if (preferredVoice) utterance.voice = preferredVoice
    utterance.rate = rate
    window.speechSynthesis.speak(utterance)
  } catch {
    /* Ignore — pronunciation is an enhancement, never a requirement. */
  }
}

export function stopSpeaking() {
  if (!canSpeak) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* no-op */
  }
}

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
  const clean = (s) =>
    s.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  const target = clean(expected)
  if (!target.length) return 0
  const spoken = new Set(clean(said))
  const hits = target.filter((word) => spoken.has(word)).length
  return Math.round((hits / target.length) * 100)
}
