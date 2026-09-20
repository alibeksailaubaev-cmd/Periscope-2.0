import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, RotateCcw } from 'lucide-react'
import { matchPairs } from '@/data/games'
import { useAppStore } from '@/store/useAppStore'
import { useSfx } from '@/hooks/useLesson'
import { shuffle, cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/**
 * Drag an English word onto its picture + translation.
 * Touch devices get the same game through tap-to-select, tap-to-drop.
 */
export default function WordMatch() {
  const sfx = useSfx()
  const setGameScore = useAppStore((s) => s.setGameScore)
  const completeExercise = useAppStore((s) => s.completeExercise)

  const [words, setWords] = useState(() => shuffle(matchPairs))
  const [targets] = useState(() => shuffle(matchPairs))
  const [placed, setPlaced] = useState({})
  const [selected, setSelected] = useState(null)
  const [wrongTarget, setWrongTarget] = useState(null)

  const solvedCount = Object.keys(placed).length
  const finished = solvedCount === matchPairs.length
  const score = useMemo(() => solvedCount * 10, [solvedCount])

  const drop = (targetId, wordId) => {
    if (!wordId || placed[targetId]) return
    if (targetId === wordId) {
      const next = { ...placed, [targetId]: wordId }
      setPlaced(next)
      setWords((list) => list.filter((w) => w.id !== wordId))
      setSelected(null)
      sfx('correct')
      completeExercise(10, 1)
      if (Object.keys(next).length === matchPairs.length) {
        setGameScore('wordMatch', matchPairs.length * 10)
        sfx('levelUp')
      }
    } else {
      setWrongTarget(targetId)
      setSelected(null)
      sfx('wrong')
      setTimeout(() => setWrongTarget(null), 450)
    }
  }

  const restart = () => {
    setWords(shuffle(matchPairs))
    setPlaced({})
    setSelected(null)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Drag each word onto the matching card — or tap a word, then tap its card.
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="mint">
            {solvedCount} / {matchPairs.length} matched
          </Badge>
          <Badge>{score} pts</Badge>
        </div>
      </div>

      {/* Word bank ------------------------------------------------- */}
      <div className="mb-5 flex min-h-[60px] flex-wrap gap-2.5 rounded-xl border border-dashed surface-muted p-4">
        {words.map((word) => (
          <motion.button
            key={word.id}
            layout
            type="button"
            draggable
            onDragStart={(e) => e.dataTransfer?.setData('text/plain', word.id)}
            onClick={() => setSelected(selected === word.id ? null : word.id)}
            whileHover={{ y: -2 }}
            className={cn(
              'cursor-grab rounded-full border px-4 py-2 text-sm font-semibold transition active:cursor-grabbing',
              selected === word.id ? 'border-blaze bg-blaze-50 text-blaze dark:bg-blaze-900/30' : 'surface hover:border-mint',
            )}
          >
            {word.word}
          </motion.button>
        ))}
        {!words.length && (
          <p className="py-2 text-sm font-semibold text-mint">All words placed — well done.</p>
        )}
      </div>

      {/* Drop targets ---------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {targets.map((target) => {
          const solved = Boolean(placed[target.id])
          return (
            <motion.div
              key={target.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                drop(target.id, e.dataTransfer.getData('text/plain'))
              }}
              onClick={() => selected && drop(target.id, selected)}
              animate={wrongTarget === target.id ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
              transition={{ duration: 0.42 }}
              className={cn(
                'flex min-h-[112px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-4 text-center transition',
                solved
                  ? 'border-solid border-mint bg-mint-50 dark:bg-mint-900/25'
                  : wrongTarget === target.id
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/25'
                    : 'surface hover:border-blaze',
              )}
            >
              <span className="text-3xl" aria-hidden="true">{target.emoji}</span>
              <p className="text-sm text-muted">{target.translation}</p>
              {solved && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 font-display text-[15px] font-bold text-mint-700 dark:text-mint-300"
                >
                  <Check className="h-4 w-4" /> {target.word}
                </motion.p>
              )}
            </motion.div>
          )
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button variant="outline" onClick={restart}>
          <RotateCcw className="h-4 w-4" /> Restart
        </Button>
        {finished && <p className="text-sm font-semibold text-mint">Perfect round — {score} points banked.</p>}
      </div>
    </div>
  )
}
