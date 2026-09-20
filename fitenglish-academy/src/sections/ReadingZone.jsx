import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookMarked, Check, Languages, Pause, Volume2, X } from 'lucide-react'
import { articles } from '@/data/reading'
import { vocabulary } from '@/data/vocabulary'
import { useAppStore } from '@/store/useAppStore'
import { useSfx, useSpeak } from '@/hooks/useLesson'
import { stopSpeaking, canSpeak } from '@/lib/speech'
import SectionHeading from '@/components/SectionHeading'
import Confetti from '@/components/Confetti'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

/** Word-level dictionary: article glossary first, then the course vocabulary. */
function buildLookup(article) {
  const map = new Map()
  vocabulary.forEach((entry) => {
    entry.word.split(/\s+/).forEach((part) => map.set(part.toLowerCase(), entry.translation))
  })
  Object.entries(article.glossary).forEach(([term, translation]) => {
    term.split(/\s+/).forEach((part) => map.set(part.toLowerCase(), translation))
    map.set(term.toLowerCase(), translation)
  })
  return map
}

/** Section D — three graded articles with tap-to-translate and a quiz. */
export default function ReadingZone() {
  const speak = useSpeak()
  const sfx = useSfx()
  const readingScores = useAppStore((s) => s.readingScores)
  const setReadingScore = useAppStore((s) => s.setReadingScore)
  const completeExercise = useAppStore((s) => s.completeExercise)

  const [articleId, setArticleId] = useState(articles[0].id)
  const [lookup, setLookup] = useState(null)
  const [reading, setReading] = useState(false)
  const [answers, setAnswers] = useState({})
  const [celebrate, setCelebrate] = useState(false)

  const article = articles.find((a) => a.id === articleId)
  const dictionary = useMemo(() => buildLookup(article), [article])
  const quizAnswers = answers[article.id] ?? {}
  const answeredAll = article.quiz.every((_, i) => quizAnswers[i] !== undefined)
  const score = article.quiz.filter((q, i) => quizAnswers[i] === q.correct).length

  const readAloud = () => {
    if (reading) {
      stopSpeaking()
      setReading(false)
      return
    }
    setReading(true)
    speak(`${article.title}. ${article.paragraphs.join(' ')}`, { rate: 0.92 })
  }

  const answerQuiz = (qIndex, optionIndex) => {
    if (quizAnswers[qIndex] !== undefined) return
    const next = { ...quizAnswers, [qIndex]: optionIndex }
    setAnswers((a) => ({ ...a, [article.id]: next }))
    const isCorrect = optionIndex === article.quiz[qIndex].correct
    sfx(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) completeExercise(10, 1)

    if (article.quiz.every((_, i) => next[i] !== undefined)) {
      const finalScore = article.quiz.filter((q, i) => next[i] === q.correct).length
      setReadingScore(article.id, finalScore)
      if (finalScore === article.quiz.length) {
        setCelebrate(true)
        sfx('levelUp')
      }
    }
  }

  /** Render a paragraph, turning known words into look-up buttons. */
  const renderParagraph = (text, key) => (
    <p key={key} className="mb-4 text-[16.5px] leading-[1.85]">
      {text.split(/(\s+)/).map((token, i) => {
        const clean = token.toLowerCase().replace(/[^a-z-]/g, '')
        const translation = dictionary.get(clean)
        if (!translation || clean.length < 3) return <span key={i}>{token}</span>
        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              setLookup({ word: clean, translation })
              speak(clean)
            }}
            className="rounded-sm underline decoration-blaze decoration-dotted decoration-2 underline-offset-4 transition hover:bg-blaze-50 dark:hover:bg-blaze-900/30"
          >
            {token}
          </button>
        )
      })}
    </p>
  )

  return (
    <div>
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}

      <SectionHeading
        eyebrow="Section D"
        icon={BookMarked}
        title="Reading Zone"
        description="Three articles at three levels. Any underlined word can be tapped for an instant translation — then take the five-question quiz."
      />

      {/* Level picker ----------------------------------------------- */}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {articles.map((item) => {
          const active = item.id === articleId
          const done = readingScores[item.id] !== undefined
          return (
            <motion.button
              key={item.id}
              type="button"
              whileHover={{ y: -3 }}
              onClick={() => {
                stopSpeaking()
                setReading(false)
                setArticleId(item.id)
                setLookup(null)
              }}
              className={cn(
                'rounded-xl border p-4 text-left transition',
                active ? 'border-blaze bg-blaze-50 shadow-premium dark:bg-blaze-900/25' : 'surface hover:border-mint',
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <Badge variant={active ? 'default' : 'neutral'}>{item.level}</Badge>
                {done && <Badge variant="success">{readingScores[item.id]}/5</Badge>}
              </div>
              <p className="font-display text-[15px] font-bold leading-tight">{item.title}</p>
              <p className="mt-1.5 text-[12px] text-muted">
                {item.levelLabel} · {item.minutes} min read
              </p>
            </motion.button>
          )
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        {/* Article --------------------------------------------------- */}
        <Card className="p-6 md:p-8">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold leading-tight">{article.title}</h2>
              <p className="mt-1.5 text-sm italic text-muted">{article.intro}</p>
            </div>
            <Button variant={reading ? 'ink' : 'outline'} onClick={readAloud} disabled={!canSpeak}>
              {reading ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {reading ? 'Stop' : 'Read aloud'}
            </Button>
          </div>

          <article>{article.paragraphs.map((p, i) => renderParagraph(p, i))}</article>

          <div className="mt-6 rounded-xl surface-muted p-4">
            <p className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted">
              <Languages className="h-3.5 w-3.5" /> Glossary
            </p>
            <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {Object.entries(article.glossary).map(([term, translation]) => (
                <div key={term} className="flex justify-between gap-3 border-b border-dashed py-1">
                  <dt className="font-semibold">{term}</dt>
                  <dd className="text-right text-muted">{translation}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        {/* Quiz ------------------------------------------------------ */}
        <div className="flex flex-col gap-5">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Comprehension quiz</h3>
              <Badge variant={answeredAll && score === 5 ? 'success' : 'neutral'}>{score} / 5</Badge>
            </div>
            <Progress
              value={(Object.keys(quizAnswers).length / article.quiz.length) * 100}
              indicatorClassName="bg-grad-mint"
              className="mb-5"
            />

            <ol className="flex flex-col gap-5">
              {article.quiz.map((question, qIndex) => {
                const chosen = quizAnswers[qIndex]
                return (
                  <li key={question.q}>
                    <p className="mb-2 text-[15px] font-semibold leading-snug">
                      {qIndex + 1}. {question.q}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {question.options.map((option, oIndex) => {
                        const reveal = chosen !== undefined
                        const isCorrect = oIndex === question.correct
                        const isChosen = chosen === oIndex
                        return (
                          <motion.button
                            key={option}
                            type="button"
                            disabled={reveal}
                            onClick={() => answerQuiz(qIndex, oIndex)}
                            whileHover={!reveal ? { x: 3 } : undefined}
                            className={cn(
                              'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-[13.5px] transition',
                              !reveal && 'surface-muted hover:border-blaze',
                              reveal && isCorrect && 'border-mint bg-mint-50 font-semibold dark:bg-mint-900/30',
                              reveal && isChosen && !isCorrect && 'border-red-400 bg-red-50 dark:bg-red-900/25',
                              reveal && !isCorrect && !isChosen && 'opacity-45',
                            )}
                          >
                            {option}
                            {reveal && isCorrect && <Check className="h-3.5 w-3.5 shrink-0 text-mint" />}
                            {reveal && isChosen && !isCorrect && <X className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                          </motion.button>
                        )
                      })}
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>
        </div>
      </div>

      {/* Tap-to-translate result ------------------------------------ */}
      <AnimatePresence>
        {lookup && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl border bg-grad-ink px-5 py-3 text-white shadow-premium-lg"
          >
            <div>
              <p className="font-display text-base font-bold">{lookup.word}</p>
              <p className="text-sm text-white/75">{lookup.translation}</p>
            </div>
            <button
              type="button"
              onClick={() => speak(lookup.word)}
              className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 transition hover:bg-white/25"
              aria-label="Listen"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLookup(null)}
              className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
