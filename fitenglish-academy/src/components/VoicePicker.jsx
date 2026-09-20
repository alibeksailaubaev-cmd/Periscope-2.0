import { Mic2, Play } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useVoices } from '@/hooks/useLesson'
import { voiceLabel, speak, canSpeak } from '@/lib/speech'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const SAMPLE = 'A balanced diet and eight hours of sleep will do more for you than any supplement.'

/**
 * Lets the learner choose which installed English voice reads the lessons.
 * The list is already sorted most-native-first, so the default is the best
 * voice the device has; this exists for when a learner prefers another accent.
 */
export default function VoicePicker({ className, compact = false }) {
  const voices = useVoices()
  const voiceURI = useAppStore((s) => s.voiceURI)
  const setVoiceURI = useAppStore((s) => s.setVoiceURI)
  const soundOn = useAppStore((s) => s.soundOn)

  if (!canSpeak || !voices.length) {
    return (
      <p className={cn('text-[13px] text-muted', className)}>
        This browser offers no English voice. Chrome, Edge and Safari all ship native-quality ones.
      </p>
    )
  }

  const current = voiceURI ?? voices[0].voiceURI

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {!compact && <Mic2 className="h-4 w-4 shrink-0 text-blaze" />}
      <select
        value={current}
        onChange={(e) => setVoiceURI(e.target.value)}
        aria-label="Reading voice"
        className="h-10 min-w-0 flex-1 rounded-xl border surface-muted px-3 text-[13px] font-medium outline-none transition focus:border-blaze focus:shadow-glow"
      >
        {voices.map((voice) => (
          <option key={voice.voiceURI} value={voice.voiceURI}>
            {voiceLabel(voice)}
          </option>
        ))}
      </select>
      <Button
        variant="outline"
        size="sm"
        onClick={() => speak(SAMPLE, { voiceURI: current, enabled: soundOn })}
        title="Hear this voice"
      >
        <Play className="h-3.5 w-3.5" /> Test
      </Button>
    </div>
  )
}
