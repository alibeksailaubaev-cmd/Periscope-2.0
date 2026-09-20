import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, PenLine, Send, SpellCheck2 } from 'lucide-react'
import { writingPrompts, rubric, checkGrammar } from '@/data/writing'
import { useAppStore } from '@/store/useAppStore'
import { useSfx } from '@/hooks/useLesson'
import { countWords, cn } from '@/lib/utils'
import SectionHeading from '@/components/SectionHeading'
import Confetti from '@/components/Confetti'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

/** Section F — an editor with a word counter and a mock grammar checker. */
export default function WritingChallenge() {
  const sfx = useSfx()
  const essays = useAppStore((s) => s.essays)
  const saveEssay = useAppStore((s) => s.saveEssay)
  const submitEssay = useAppStore((s) => s.submitEssay)

  const [promptId, setPromptId] = useState(writingPrompts[0].id)
  const [text, setText] = useState(essays[writingPrompts[0].id]?.text ?? '')
  const [issues, setIssues] = useState([])
  const [checkedOnce, setCheckedOnce] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  const prompt = writingPrompts.find((p) => p.id === promptId)
  const words = countWords(text)
  const withinRange = words >= prompt.min && words <= prompt.max
  const progress = Math.min(100, Math.round((words / prompt.min) * 100))

  // Load whatever was saved for the newly selected prompt.
  useEffect(() => {
    setText(essays[promptId]?.text ?? '')
    setIssues([])
    setCheckedOnce(false)
  }, [promptId])

  // Autosave a draft two seconds after typing stops.
  useEffect(() => {
    if (!text) return undefined
    const id = setTimeout(() => saveEssay(promptId, text), 2000)
    return () => clearTimeout(id)
  }, [text, promptId, saveEssay])

  const runCheck = () => {
    const found = checkGrammar(text)
    setIssues(found)
    setCheckedOnce(true)
    sfx(found.length ? 'wrong' : 'correct')
  }

  const applyFix = (issue) => {
    setText((current) => current.slice(0, issue.index) + issue.fix + current.slice(issue.index + issue.length))
    setIssues((list) => list.filter((i) => i.id !== issue.id))
    sfx('click')
  }

  const submit = () => {
    submitEssay(promptId, text)
    setSubmitted(true)
    setCelebrate(true)
    sfx('levelUp')
  }

  /** Text with the checker's findings highlighted in place. */
  const highlighted = useMemo(() => {
    if (!issues.length) return null
    const parts = []
    let cursor = 0
    issues.forEach((issue) => {
      if (issue.index < cursor) return
      parts.push(<span key={`t-${issue.id}`}>{text.slice(cursor, issue.index)}</span>)
      parts.push(
        <mark key={issue.id} className="rounded bg-blaze-100 px-0.5 text-blaze-800 dark:bg-blaze-900/50 dark:text-blaze-200">
          {text.slice(issue.index, issue.index + issue.length)}
        </mark>,
      )
      cursor = issue.index + issue.length
    })
    parts.push(<span key="tail">{text.slice(cursor)}</span>)
    return parts
  }, [issues, text])

  return (
    <div>
      {celebrate && <Confetti onDone={() => setCelebrate(false)} />}

      <SectionHeading
        eyebrow="Section F"
        icon={PenLine}
        title="Writing Challenge"
        description="Fifteen prompts, a live word counter and a checker that knows the mistakes Form 11 actually makes."
      />

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        {/* Prompt list ------------------------------------------------ */}
        <Card className="h-fit max-h-[640px] overflow-y-auto">
          <CardHeader className="sticky top-0 z-10 surface">
            <CardTitle className="text-base">Choose a topic</CardTitle>
            <CardDescription>{writingPrompts.length} prompts, A2 to C1.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {writingPrompts.map((item) => {
              const active = item.id === promptId
              const done = essays[item.id]?.submitted
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  whileHover={{ x: 3 }}
                  onClick={() => setPromptId(item.id)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition',
                    active ? 'border-blaze bg-blaze-50 dark:bg-blaze-900/25' : 'surface-muted hover:border-mint',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Badge variant={active ? 'default' : 'neutral'}>{item.level}</Badge>
                    {done && <CheckCircle2 className="h-4 w-4 text-mint" />}
                  </div>
                  <p className="text-[13.5px] font-semibold leading-snug">{item.title}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">
                    {item.min}–{item.max} words
                  </p>
                </motion.button>
              )
            })}
          </CardContent>
        </Card>

        {/* Editor ----------------------------------------------------- */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>{prompt.title}</CardTitle>
              <CardDescription>{prompt.brief}</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                placeholder={`Write ${prompt.min}–${prompt.max} words in English…`}
                aria-label={`Essay: ${prompt.title}`}
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[220px] flex-1">
                  <div className="mb-1.5 flex justify-between text-[12px] font-semibold">
                    <span className={cn(withinRange ? 'text-mint' : 'text-muted')}>
                      {words} words
                    </span>
                    <span className="text-muted">
                      target {prompt.min}–{prompt.max}
                    </span>
                  </div>
                  <Progress value={progress} indicatorClassName={withinRange ? 'bg-grad-mint' : 'bg-grad-blaze'} />
                </div>

                <div className="flex gap-2.5">
                  <Button variant="outline" onClick={runCheck} disabled={!words}>
                    <SpellCheck2 className="h-4 w-4" /> Grammar check
                  </Button>
                  <Button onClick={submit} disabled={words < prompt.min}>
                    <Send className="h-4 w-4" /> Submit for review
                  </Button>
                </div>
              </div>

              {words > 0 && words < prompt.min && (
                <p className="mt-2 text-[12.5px] text-muted">
                  {prompt.min - words} more words before you can submit.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Checker results ---------------------------------------- */}
          <AnimatePresence>
            {checkedOnce && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {issues.length ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-blaze" />
                          {issues.length} thing{issues.length === 1 ? '' : 's'} to look at
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-mint" />
                          Nothing flagged
                        </>
                      )}
                    </CardTitle>
                    <CardDescription>
                      A mock checker built from the ten mistakes this class repeats most.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {issues.length > 0 && (
                      <>
                        <p className="mb-4 rounded-xl surface-muted p-4 text-sm leading-relaxed">{highlighted}</p>
                        <ul className="flex flex-col gap-2">
                          {issues.map((issue) => (
                            <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                              <div>
                                <p className="text-sm font-semibold">“{issue.found}”</p>
                                <p className="text-[13px] text-muted">{issue.message}</p>
                              </div>
                              <Button size="sm" variant="mint" onClick={() => applyFix(issue)}>
                                Fix → {issue.fix}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Rubric --------------------------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How it will be marked</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {rubric.map((band) => (
                <div key={band.id} className="rounded-xl surface-muted p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-display text-sm font-bold">{band.label}</p>
                    <Badge variant="neutral">{band.weight}%</Badge>
                  </div>
                  <p className="text-[12.5px] text-muted">{band.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={submitted} onOpenChange={setSubmitted}>
        <DialogContent>
          <DialogTitle>Sent to your teacher</DialogTitle>
          <DialogDescription>
            “{prompt.title}” — {words} words. You earned +40 XP. Feedback usually comes back within two lessons.
          </DialogDescription>
          <Button className="mt-5 w-full" onClick={() => setSubmitted(false)}>
            Back to writing
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
