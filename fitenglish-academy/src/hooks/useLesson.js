import { useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { playSfx } from '@/lib/audio'
import { translate } from '@/data/i18n'

/** Sound effects that respect the global mute switch. */
export function useSfx() {
  const soundOn = useAppStore((s) => s.soundOn)
  return useCallback((name) => playSfx(name, soundOn), [soundOn])
}

/** t('nav.games') — falls back to English, then to the key itself. */
export function useT() {
  const lang = useAppStore((s) => s.lang)
  return useCallback((key) => translate(lang, key), [lang])
}
