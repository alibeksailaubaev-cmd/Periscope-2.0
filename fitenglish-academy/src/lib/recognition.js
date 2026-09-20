/**
 * Speech-to-text for the pronunciation recorder.
 *
 * This is the learner's own voice, not narration: the app itself never speaks.
 * Where the Web Speech API is unavailable, a deterministic mock keeps the
 * practice flow usable.
 */
const Recognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined

export const canRecognise = Boolean(Recognition)

/** Listen once and resolve with a transcript. */
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

/** Drop a word so the mocked score is never a flat 100%. */
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
