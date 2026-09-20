import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lightbulb, RotateCcw } from 'lucide-react'
import { hangmanWords } from '@/data/games'
import { useAppStore } from '@/store/useAppStore'
import { useSfx, useSpeak } from '@/hooks/useLesson'
import { sample, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const MAX_MISSES = 6

/** Progressive gallows drawing — one stroke per wrong letter. */
function Gallows({ misses }) {
  const strokes = [
    <circle key="head" cx="60" cy="34" r="11" />,
    <line key="body" x1="60" y1="45" x2="60" y2="76" />,
    <line key="arm1" x1="60" y1="54" x2="46" y2="66" />,
    <line key="arm2" x1="60" y1="54" x2="74" y2="66" />,
    <line key="leg1" x1="60" y1="76" x2="48" y2="94" />,
    <line key="leg2" x1="60" y1="76" x2="72" y2="94" />,
  ]
  return (
    <svg viewBox="0 0 120 110" className="h-36 w-36" fill="none" strokeWidth="3.4" strokeLinecap="round">
      <g stroke="currentColor" className="text-ink-300 dark:text-ink-500">
        <line x1="14" y1="104" x2="52" y2="104" />
        <line x1="30" y1="104" x2="30" y2="12" />
        <line x1="30" y1="12" x2="60" y2="12" />
        <line x1="60" y1="12" x2="60" y2="23" />
      </g>
      <g stroke="#FF6B35">
        {strokes.slice(0, misses).map((stroke, i) => (
          <motion.g key={i} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.3 }}>
            {stroke}
          </motion.g>
        ))}
      </g>
    </svg>
  )
}

export default function Hangman() {
  const sfx = useSfx()
  const speak = useSpeak()
  const setGameScore = useAppStore((s) => s.setGameScore)
  const completeExercise = useAppStore((s) => s.completeExercise)

  const [entry, setEntry] = useState(() => sample(hangmanWords, 1)[0])
  const [guessed, setGuessed] = useState([])
  const [showHint, setShowHint] = useState(false)
  const [round, setRound] = useState(1)
  const [total, setTotal] = useState(0)

  const letters = entry.word.split('')
  const misses = guessed.filter((l) => !letters.includes(l)).length
  const won = letters.every((l) => guessed.includes(l))
  const lost = misses >= MAX_MISSES
  const over = won || lost

  const guess = (letter) => {
    if (guessed.includes(letter) || over) return
    const next = [...guessed, letter]
    setGuessed(next)
    const hit = letters.includes(letter)
    sfx(hit ? 'correct' : 'wrong')

    if (hit && letters.every((l) => next.includes(l))) {
      const points = Math.max(10, 60 - misses * 8)
      const newTotal = total + points
      setTotal(newTotal)
      setGameScore('hangman', newTotal)
      completeExercise(points, 2)
      sfx('levelUp')
      speak(entry.word.toLowerCase())
    }
  }

  const nextWord = () => {
    setEntry(sample(hangmanWords, 1)[0])
    setGuessed([])
    setShowHint(false)
    setRound((r) => r + 1)
  }

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-2">
        <Gallows misses={misses} />
        <Badge variant={misses >= 4 ? 'danger' : 'neutral'}>
          {MAX_MISSES - misses} lives left
        </Badge>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Badge variant="mint">Round {round}</Badge>
          <Badge>{total} pts</Badge>
        </div>

        {/* Word --------------------------------------------------- */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {letters.map((letter, i) => {
            const revealed = guessed.includes(letter) || lost
            return (
              <motion.span
                key={`${letter}-${i}`}
                animate={revealed ? { rotateX: 0 } : { rotateX: 0 }}
                className={cn(
                  'grid h-11 w-8 place-items-center rounded-lg border-b-4 font-display text-lg font-bold transition-colors sm:w-9',
                  revealed
                    ? guessed.includes(letter)
                      ? 'border-mint surface-muted'
                      : 'border-red-400 bg-red-50 text-red-600 dark:bg-red-900/25'
                    : 'border-ink-200 surface-muted text-transparent dark:border-ink-500',
                )}
              >
                {revealed ? letter : '·'}
              </motion.span>
            )
          })}
        </div>

        {/* Hint --------------------------------------------------- */}
        <div className="mb-4 min-h-[34px]">
          {showHint ? (
            <p className="rounded-lg border-l-4 border-blaze bg-blaze-50 px-3 py-2 text-sm dark:bg-blaze-900/25">
              {entry.hint}
            </p>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
              <Lightbulb className="h-4 w-4" /> Show hint (−10 pts)
            </Button>
          )}
        </div>

        {/* Keyboard ------------------------------------------------ */}
        <div className="flex flex-wrap gap-1.5">
          {ALPHABET.map((letter) => {
            const used = guessed.includes(letter)
            const hit = used && letters.includes(letter)
            return (
              <motion.button
                key={letter}
                type="button"
                whileHover={!used && !over ? { y: -2 } : undefined}
                onClick={() => guess(letter)}
                disabled={used || over}
                className={cn(
                  'h-9 w-9 rounded-lg border text-sm font-bold transition',
                  !used && 'surface hover:border-blaze',
                  hit && 'border-mint bg-mint text-white',
                  used && !hit && 'border-red-300 bg-red-50 text-red-400 dark:bg-red-900/25',
                  over && !used && 'opacity-40',
                )}
              >
                {letter}
              </motion.button>
            )
          })}
        </div>

        {over && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 flex flex-wrap items-center gap-3">
            <p className={cn('font-display font-bold', won ? 'text-mint' : 'text-red-500')}>
              {won ? 'Solved!' : `The word was ${entry.word}.`}
            </p>
            <Button variant="mint" onClick={nextWord}>
              <RotateCcw className="h-4 w-4" /> Next word
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
