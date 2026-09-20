import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Eye, RotateCcw } from 'lucide-react'
import { crossword } from '@/data/games'
import { useAppStore } from '@/store/useAppStore'
import { useSfx } from '@/hooks/useLesson'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const key = (row, col) => `${row}-${col}`

/** Build the solution map and the per-cell entry numbers once. */
function buildGrid() {
  const solution = {}
  const numbers = {}
  crossword.entries.forEach((entry) => {
    entry.answer.split('').forEach((letter, i) => {
      const row = entry.direction === 'across' ? entry.row : entry.row + i
      const col = entry.direction === 'across' ? entry.col + i : entry.col
      solution[key(row, col)] = letter
    })
    numbers[key(entry.row, entry.col)] = entry.number
  })
  return { solution, numbers }
}

export default function Crossword() {
  const sfx = useSfx()
  const setGameScore = useAppStore((s) => s.setGameScore)
  const completeExercise = useAppStore((s) => s.completeExercise)

  const { solution, numbers } = useMemo(buildGrid, [])
  const [values, setValues] = useState({})
  const [checked, setChecked] = useState(false)
  const inputs = useRef({})

  const cells = Object.keys(solution)
  const correctCount = cells.filter((k) => (values[k] || '').toUpperCase() === solution[k]).length
  const complete = correctCount === cells.length

  const setCell = (k, letter) => {
    setValues((v) => ({ ...v, [k]: letter.toUpperCase().slice(-1) }))
    setChecked(false)
  }

  const check = () => {
    setChecked(true)
    const score = correctCount * 3
    setGameScore('crossword', score)
    if (complete) {
      completeExercise(40, 4)
      sfx('levelUp')
    } else {
      sfx(correctCount > cells.length / 2 ? 'correct' : 'wrong')
    }
  }

  const reveal = () => {
    setValues(Object.fromEntries(cells.map((k) => [k, solution[k]])))
    setChecked(true)
    sfx('click')
  }

  const across = crossword.entries.filter((e) => e.direction === 'across')
  const down = crossword.entries.filter((e) => e.direction === 'down')

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      {/* Grid ------------------------------------------------------- */}
      <div className="overflow-x-auto">
        <div
          className="grid w-fit gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${crossword.size}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: crossword.size * crossword.size }, (_, i) => {
            const row = Math.floor(i / crossword.size)
            const col = i % crossword.size
            const k = key(row, col)
            const isCell = Boolean(solution[k])
            if (!isCell) return <div key={k} className="h-9 w-9" />

            const value = values[k] ?? ''
            const right = checked && value.toUpperCase() === solution[k]
            const wrong = checked && value && value.toUpperCase() !== solution[k]

            return (
              <div key={k} className="relative">
                {numbers[k] && (
                  <span className="pointer-events-none absolute left-[3px] top-[1px] z-10 text-[9px] font-bold text-muted">
                    {numbers[k]}
                  </span>
                )}
                <input
                  ref={(el) => {
                    inputs.current[k] = el
                  }}
                  value={value}
                  onChange={(e) => {
                    setCell(k, e.target.value)
                    if (e.target.value) inputs.current[key(row, col + 1)]?.focus()
                  }}
                  maxLength={1}
                  aria-label={`Row ${row + 1} column ${col + 1}`}
                  className={cn(
                    'h-9 w-9 rounded-md border text-center font-display text-sm font-bold uppercase outline-none transition',
                    right && 'border-mint bg-mint-50 text-mint-700 dark:bg-mint-900/30',
                    wrong && 'border-red-400 bg-red-50 text-red-600 dark:bg-red-900/25',
                    !right && !wrong && 'surface focus:border-blaze focus:shadow-glow',
                  )}
                />
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <Button onClick={check}>
            <Check className="h-4 w-4" /> Check
          </Button>
          <Button variant="outline" onClick={reveal}>
            <Eye className="h-4 w-4" /> Reveal
          </Button>
          <Button variant="ghost" onClick={() => { setValues({}); setChecked(false) }}>
            <RotateCcw className="h-4 w-4" /> Clear
          </Button>
          {checked && (
            <Badge variant={complete ? 'success' : 'neutral'}>
              {correctCount} / {cells.length} letters
            </Badge>
          )}
        </div>
      </div>

      {/* Clues ------------------------------------------------------ */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {[
          ['Across', across],
          ['Down', down],
        ].map(([label, list]) => (
          <div key={label}>
            <h4 className="mb-2.5 font-display text-sm font-bold uppercase tracking-wider text-blaze">{label}</h4>
            <ol className="flex flex-col gap-2">
              {list.map((entry) => (
                <motion.li
                  key={`${entry.direction}-${entry.number}`}
                  whileHover={{ x: 3 }}
                  className="flex gap-2.5 text-sm"
                >
                  <span className="font-mono font-bold text-muted">{entry.number}.</span>
                  <span>
                    {entry.clue}{' '}
                    <span className="text-muted">({entry.answer.length})</span>
                  </span>
                </motion.li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  )
}
