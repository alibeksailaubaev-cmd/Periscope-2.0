import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Dumbbell, RotateCcw, X } from 'lucide-react'
import { grammarExercises } from '@/data/grammar'
import { useAppStore } from '@/store/useAppStore'
import { useSfx, useT } from '@/hooks/useLesson'
import SectionHeading from '@/components/SectionHeading'
import Confetti from '@/components/Confetti'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

/** Section B — ten grammar questions with instant feedback. */
export default function GrammarGym() {
  const t = useT()
  const sfx = useSfx()
  const lang = useAppStore((s) => s.lang)
  const setGrammarBest = useAppStore((s) => s.setGrammarBest)
  const completeExercise = useAppStore((s) => s.completeExercise)
  const grammarBest = useAppStore((s) => s.grammarBest)

  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState(null)
  const [results, setResults] = useState([])
  const [finished, setFinished] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  const exercise = grammarExercises[index]
  const correctCount = results.filter(Boolean).length

  const answer = (option) => {
    if (picked) return
    const isCorrect = option === exercise.correct
    setPicked(option)
    setResults((r) => [...r, isCorrect])
    sfx(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) completeExercise(10, 1)
  }

  const next = () => {
    if (index === grammarExercises.length - 1) {
      const score = results.filter(Boolean).length
      setGrammarBest(score)
      setFinished(true)
      if (score >= 8) {
        setCelebrate(true)
        sfx('levelUp')
      }
      return
    }
    setIndex((i) => i + 1)
    setPicked(null)
  }

  const restart = () => {
    setIndex(0)
    setPicked(null)
    setResults([])
    setFinished(false)
  }

  return (
    <div>
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}

      <SectionHeading
        eyebrow="Section B"
        icon={Dumbbell}
        title="Grammar Gym"
        description="Ten reps of Form 11 grammar, every one set in the gym. Answer, read the rule, move on — your best score is kept."
        actions={
          <Card className="min-w-[190px] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Personal best</p>
            <p className="font-display text-2xl font-bold">{grammarBest} / 10</p>
          </Card>
        }
      />

      <Card className="mx-auto max-w-3xl p-6">
        {/* Progress ------------------------------------------------- */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-muted">
            <span>
              Question {Math.min(index + 1, grammarExercises.length)} of {grammarExercises.length}
            </span>
            <span>
              {t('common.score')}: {correctCount}
            </span>
          </div>
          <Progress value={((finished ? grammarExercises.length : index) / grammarExercises.length) * 100} />
          <div className="mt-2 flex gap-1">
            {grammarExercises.map((ex, i) => (
              <span
                key={ex.id}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  results[i] === true && 'bg-mint',
                  results[i] === false && 'bg-red-400',
                  results[i] === undefined && (i === index && !finished ? 'bg-blaze' : 'surface-muted border'),
                )}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!finished ? (
            <motion.div
              key={exercise.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28 }}
            >
              <Badge variant="mint" className="mb-3">{exercise.topic}</Badge>
              <p className="mb-5 font-display text-xl font-semibold leading-snug">{exercise.question}</p>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {exercise.options.map((option) => {
                  const isCorrect = option === exercise.correct
                  const isPicked = picked === option
                  const reveal = Boolean(picked)
                  return (
                    <motion.button
                      key={option}
                      type="button"
                      onClick={() => answer(option)}
                      disabled={reveal}
                      whileHover={!reveal ? { scale: 1.02 } : undefined}
                      animate={reveal && isPicked && !isCorrect ? { x: [0, -7, 7, -4, 4, 0] } : { x: 0 }}
                      transition={{ duration: 0.4 }}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition',
                        !reveal && 'surface-muted hover:border-blaze',
                        reveal && isCorrect && 'border-mint bg-mint-50 dark:bg-mint-900/30',
                        reveal && isPicked && !isCorrect && 'border-red-400 bg-red-50 dark:bg-red-900/25',
                        reveal && !isCorrect && !isPicked && 'surface-muted opacity-55',
                      )}
                    >
                      {option}
                      {reveal && isCorrect && <Check className="h-4 w-4 text-mint" />}
                      {reveal && isPicked && !isCorrect && <X className="h-4 w-4 text-red-500" />}
                    </motion.button>
                  )
                })}
              </div>

              <AnimatePresence>
                {picked && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-5 overflow-hidden"
                  >
                    <div
                      className={cn(
                        'rounded-xl border-l-4 p-4 text-sm',
                        picked === exercise.correct
                          ? 'border-mint bg-mint-50 dark:bg-mint-900/25'
                          : 'border-blaze bg-blaze-50 dark:bg-blaze-900/25',
                      )}
                    >
                      <p className="mb-1 font-display font-bold">
                        {picked === exercise.correct ? t('common.correct') : `${t('common.wrong')} — ${exercise.correct}`}
                      </p>
                      <p className="text-muted">{exercise.explanation[lang] ?? exercise.explanation.en}</p>
                    </div>
                    <Button className="mt-4" onClick={next}>
                      {index === grammarExercises.length - 1 ? 'See my result' : t('common.next')}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
              <p className="font-display text-5xl font-bold text-blaze">{correctCount}/10</p>
              <p className="mt-3 text-muted">
                {correctCount >= 8
                  ? 'Grammar Guru unlocked — that is exam-level accuracy.'
                  : correctCount >= 5
                    ? 'Solid. Re-read the rules you missed and run the set again.'
                    : 'Worth another round — the explanations are the lesson here.'}
              </p>
              <Button className="mt-5" variant="mint" onClick={restart}>
                <RotateCcw className="h-4 w-4" /> {t('common.restart')}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}
