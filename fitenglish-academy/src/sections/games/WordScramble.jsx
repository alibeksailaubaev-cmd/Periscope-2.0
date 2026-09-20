import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Delete, Lightbulb, Timer } from 'lucide-react'
import { scrambleWords } from '@/data/games'
import { useAppStore } from '@/store/useAppStore'
import { useSfx } from '@/hooks/useLesson'
import { shuffle, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const ROUND_SECONDS = 45

/** Rebuild the word from shuffled letter tiles before the clock runs out. */
export default function WordScramble() {
  const sfx = useSfx()
  const setGameScore = useAppStore((s) => s.setGameScore)
  const completeExercise = useAppStore((s) => s.completeExercise)

  const [order] = useState(() => shuffle(scrambleWords))
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState([])
  const [seconds, setSeconds] = useState(ROUND_SECONDS)
  const [status, setStatus] = useState('playing') // playing | solved | timeout
  const [total, setTotal] = useState(0)
  const [showHint, setShowHint] = useState(false)

  const entry = order[index]
  const tiles = useMemo(() => {
    // Keep shuffling until the scramble is visibly different from the answer.
    let scrambled = shuffle(entry.answer.split(''))
    let guard = 0
    while (scrambled.join('') === entry.answer && guard < 12) {
      scrambled = shuffle(entry.answer.split(''))
      guard += 1
    }
    return scrambled.map((letter, i) => ({ id: `${letter}-${i}`, letter }))
  }, [entry])

  // Countdown for the current word.
  useEffect(() => {
    if (status !== 'playing') return undefined
    if (seconds <= 0) {
      setStatus('timeout')
      sfx('wrong')
      return undefined
    }
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [seconds, status, sfx])

  const attempt = picked.map((p) => p.letter).join('')

  const pick = (tile) => {
    if (status !== 'playing' || picked.some((p) => p.id === tile.id)) return
    const next = [...picked, tile]
    setPicked(next)
    sfx('click')

    if (next.length === entry.answer.length) {
      if (next.map((p) => p.letter).join('') === entry.answer) {
        const points = 20 + seconds - (showHint ? 10 : 0)
        const newTotal = total + Math.max(10, points)
        setTotal(newTotal)
        setGameScore('scramble', newTotal)
        completeExercise(Math.max(10, points), 1)
        setStatus('solved')
        sfx('levelUp')
      } else {
        sfx('wrong')
        setTimeout(() => setPicked([]), 500)
      }
    }
  }

  const nextWord = () => {
    setIndex((i) => (i + 1) % order.length)
    setPicked([])
    setSeconds(ROUND_SECONDS)
    setStatus('playing')
    setShowHint(false)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Badge variant="mint">
          Word {index + 1} / {order.length}
        </Badge>
        <div className="flex items-center gap-2">
          <Badge variant={seconds <= 10 && status === 'playing' ? 'danger' : 'neutral'}>
            <Timer className="h-3.5 w-3.5" /> {seconds}s
          </Badge>
          <Badge>{total} pts</Badge>
        </div>
      </div>

      <Progress value={(seconds / ROUND_SECONDS) * 100} indicatorClassName={seconds <= 10 ? 'bg-red-500' : 'bg-grad-mint'} className="mb-6" />

      {/* Answer slots ---------------------------------------------- */}
      <div className="mb-5 flex flex-wrap justify-center gap-2">
        {entry.answer.split('').map((_, i) => (
          <div
            key={i}
            className={cn(
              'grid h-12 w-11 place-items-center rounded-xl border-2 font-display text-xl font-bold transition',
              picked[i]
                ? status === 'solved'
                  ? 'border-mint bg-mint-50 text-mint-700 dark:bg-mint-900/30'
                  : 'border-blaze bg-blaze-50 dark:bg-blaze-900/25'
                : 'border-dashed surface-muted',
            )}
          >
            {picked[i]?.letter?.toUpperCase() ?? ''}
          </div>
        ))}
      </div>

      {/* Letter tiles ---------------------------------------------- */}
      <div className="mb-5 flex flex-wrap justify-center gap-2">
        {tiles.map((tile) => {
          const used = picked.some((p) => p.id === tile.id)
          return (
            <motion.button
              key={tile.id}
              type="button"
              whileHover={!used ? { y: -3 } : undefined}
              whileTap={{ scale: 0.94 }}
              onClick={() => pick(tile)}
              disabled={used || status !== 'playing'}
              className={cn(
                'grid h-12 w-11 place-items-center rounded-xl border font-display text-xl font-bold transition',
                used ? 'opacity-25' : 'surface shadow-premium hover:border-blaze',
              )}
            >
              {tile.letter.toUpperCase()}
            </motion.button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <Button variant="ghost" size="sm" onClick={() => setPicked((p) => p.slice(0, -1))} disabled={!picked.length || status !== 'playing'}>
          <Delete className="h-4 w-4" /> Undo
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowHint(true)} disabled={showHint}>
          <Lightbulb className="h-4 w-4" /> Hint (−10)
        </Button>
      </div>

      <AnimatePresence>
        {showHint && status === 'playing' && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-xl border-l-4 border-blaze bg-blaze-50 p-3 text-center text-sm dark:bg-blaze-900/25"
          >
            {entry.hint}
          </motion.p>
        )}

        {status !== 'playing' && (
          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 text-center">
            <p className={cn('font-display text-xl font-bold', status === 'solved' ? 'text-mint' : 'text-red-500')}>
              {status === 'solved' ? `Correct — ${entry.answer}!` : `Time! The word was “${entry.answer}”.`}
            </p>
            <Button className="mt-3" variant="mint" onClick={nextWord}>
              Next word
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
