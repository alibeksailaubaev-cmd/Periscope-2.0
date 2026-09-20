import { useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { playSfx } from '@/lib/audio'
import { speak as speakRaw } from '@/lib/speech'
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
  return useCallback(
    (text, options = {}) => speakRaw(text, { enabled: soundOn, ...options }),
    [soundOn],
  )
}

/** t('nav.games') — falls back to English, then to the key itself. */
export function useT() {
  const lang = useAppStore((s) => s.lang)
  return useCallback((key) => translate(lang, key), [lang])
}
