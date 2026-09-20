import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useSfx, useT } from '@/hooks/useLesson'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * Vocabulary card with a 3D flip: front shows the English word, back shows the
 * translation and an example sentence. +5 XP the first time it is marked learned.
 */
export default function WordCard({ word, index = 0 }) {
  const [flipped, setFlipped] = useState(false)
  const t = useT()
  const sfx = useSfx()
  const learned = useAppStore((s) => s.learnedWords.includes(word.id))
  const toggleWordLearned = useAppStore((s) => s.toggleWordLearned)

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.45, ease: 'easeOut' }}
      whileHover={{ scale: 1.02 }}
      className="[perspective:1200px]"
    >
      <motion.div
        className="relative h-[210px] w-full preserve-3d"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.3, 0.8, 0.3, 1] }}
      >
        {/* Front ------------------------------------------------------ */}
        <button
          type="button"
          onClick={() => {
            setFlipped(true)
            sfx('click')
          }}
          className={cn(
            'absolute inset-0 flex w-full flex-col justify-between rounded-xl border p-4 text-left shadow-premium backface-hidden',
            learned ? 'bg-mint-50 border-mint-200 dark:bg-mint-900/25' : 'surface',
          )}
        >
          <div className="flex items-start justify-between">
            <span className="text-3xl" aria-hidden="true">{word.emoji}</span>
            <Badge variant={learned ? 'success' : 'neutral'}>{word.category}</Badge>
          </div>
          <div>
            <p className="font-display text-xl font-bold leading-tight">{word.word}</p>
            <p className="mt-1 font-mono text-xs text-muted">{word.pronunciation}</p>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blaze">Tap to flip →</p>
        </button>

        {/* Back ------------------------------------------------------- */}
        <div
          className="absolute inset-0 flex flex-col justify-between rounded-xl border bg-grad-ink p-4 text-white shadow-premium backface-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <button type="button" onClick={() => setFlipped(false)} className="text-left">
            <p className="font-display text-lg font-bold">{word.translation}</p>
            <p className="mt-2 text-[13px] leading-snug text-white/80">“{word.example}”</p>
          </button>

          <div className="flex items-center justify-end gap-2">

            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
              <Checkbox
                checked={learned}
                onCheckedChange={() => {
                  toggleWordLearned(word.id)
                  sfx(learned ? 'click' : 'correct')
                }}
                aria-label={`Mark ${word.word} as learned`}
              />
              {t('common.learned')} {!learned && <span className="text-mint-300">+5 XP</span>}
            </label>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
