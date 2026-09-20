import { useCallback, useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { playSfx } from '@/lib/audio'
import { speak as speakRaw, englishVoices, setVoiceURI } from '@/lib/speech'
import { translate } from '@/data/i18n'

/** Sound effects that respect the global mute switch. */
export function useSfx() {
  const soundOn = useAppStore((s) => s.soundOn)
  return useCallback((name) => playSfx(name, soundOn), [soundOn])
}

/**
 * Pronunciation helper. Speaker buttons always speak, even when UI effects
 * are muted, unless the learner explicitly turned sound off.
 */
export function useSpeak() {
  const soundOn = useAppStore((s) => s.soundOn)
  const voiceURI = useAppStore((s) => s.voiceURI)
  return useCallback(
    (text, options = {}) => speakRaw(text, { enabled: soundOn, voiceURI, ...options }),
    [soundOn, voiceURI],
  )
}

/**
 * The browser fills its voice list asynchronously, so poll briefly on mount
 * until it arrives. Returns the English voices, most native-sounding first.
 */
export function useVoices() {
  const voiceURI = useAppStore((s) => s.voiceURI)
  const [voices, setVoices] = useState(() => englishVoices())

  useEffect(() => {
    setVoiceURI(voiceURI)
  }, [voiceURI])

  useEffect(() => {
    if (voices.length) return undefined
    let tries = 0
    const id = setInterval(() => {
      const next = englishVoices()
      tries += 1
      if (next.length || tries > 20) {
        setVoices(next)
        clearInterval(id)
      }
    }, 250)
    return () => clearInterval(id)
  }, [voices.length])

  return voices
}

/** t('nav.games') — falls back to English, then to the key itself. */
export function useT() {
  const lang = useAppStore((s) => s.lang)
  return useCallback((key) => translate(lang, key), [lang])
}
