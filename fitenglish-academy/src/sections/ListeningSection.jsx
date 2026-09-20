import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Headphones, Megaphone, X } from 'lucide-react'
import { tracks, scriptLibrary, speakingLines } from '@/data/listening'
import { useAppStore } from '@/store/useAppStore'
import { useSfx } from '@/hooks/useLesson'
import SectionHeading from '@/components/SectionHeading'
import WaveformRecorder from '@/components/WaveformRecorder'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

/**
 * Section C — the app plays nothing; the teacher or a student reads the script
 * aloud and the class answers. The script is therefore the material, printed in
 * full rather than hidden behind a button.
 */
export default function ListeningSection() {
  const sfx = useSfx()
  const listeningDone = useAppStore((s) => s.listeningDone)
  const markListeningDone = useAppStore((s) => s.markListeningDone)
  const completeExercise = useAppStore((s) => s.completeExercise)

  const [activeId, setActiveId] = useState(tracks[0].id)
  const [answers, setAnswers] = useState({})
  const [lineIndex, setLineIndex] = useState(0)

  const track = tracks.find((t) => t.id === activeId)
  const trackAnswers = answers[track.id] ?? {}
  const answeredAll = track.questions.every((_, i) => trackAnswers[i] !== undefined)
  const correctCount = track.questions.filter((q, i) => trackAnswers[i] === q.correct).length

  const answer = (qIndex, optionIndex) => {
    if (trackAnswers[qIndex] !== undefined) return
    const nextAnswers = { ...trackAnswers, [qIndex]: optionIndex }
    setAnswers((a) => ({ ...a, [track.id]: nextAnswers }))
    const isCorrect = optionIndex === track.questions[qIndex].correct
    sfx(isCorrect ? 'correct' : 'wrong')
    if (isCorrect) completeExercise(8, 1)
    if (track.questions.every((_, i) => nextAnswers[i] !== undefined)) markListeningDone(track.id)
  }

  return (
    <div>
      <SectionHeading
        eyebrow="Section C"
        icon={Headphones}
        title="Listening & Speaking"
        description="Read each script aloud to the class — twice, at normal speed — then let them answer with the script covered."
        actions={
          <Card className="min-w-[190px] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Scripts completed</p>
            <p className="font-display text-2xl font-bold">
              {listeningDone.length} <span className="text-base text-muted">/ {tracks.length}</span>
            </p>
          </Card>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Script list --------------------------------------------- */}
        <div className="flex flex-col gap-2.5">
          {tracks.map((item) => {
            const done = listeningDone.includes(item.id)
            const active = item.id === activeId
            return (
              <motion.button
                key={item.id}
                type="button"
                whileHover={{ x: 3 }}
                onClick={() => setActiveId(item.id)}
                className={cn(
                  'rounded-xl border p-4 text-left transition',
                  active ? 'border-blaze bg-blaze-50 shadow-premium dark:bg-blaze-900/25' : 'surface hover:border-mint',
                )}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <Badge variant={active ? 'default' : 'neutral'}>{item.kind}</Badge>
                  {done && <Check className="h-4 w-4 text-mint" />}
                </div>
                <p className="font-display text-[15px] font-semibold leading-tight">{item.title}</p>
                <p className="mt-1 text-[12px] text-muted">
                  {item.speaker} · {item.level} · about {item.seconds}s to read
                </p>
              </motion.button>
            )
          })}
        </div>

        {/* Script + tasks ------------------------------------------- */}
        <div className="flex flex-col gap-5">
          <Card className="p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold">{track.title}</h2>
                <p className="mt-1 text-sm text-muted">{track.task}</p>
              </div>
              <Badge variant="mint">{track.level}</Badge>
            </div>

            <div className="mb-3 flex items-center gap-2 rounded-xl border border-blaze-200 bg-blaze-50 px-3.5 py-2.5 text-[13px] dark:border-blaze-800 dark:bg-blaze-900/25">
              <Megaphone className="h-4 w-4 shrink-0 text-blaze" />
              <span>
                Read aloud by the teacher, or by a student playing <strong>{track.speaker}</strong>.
              </span>
            </div>

            <p className="rounded-xl surface-muted p-4 text-[15.5px] leading-relaxed">{track.script}</p>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Comprehension</h3>
              {answeredAll && (
                <Badge variant={correctCount === track.questions.length ? 'success' : 'neutral'}>
                  {correctCount} / {track.questions.length}
                </Badge>
              )}
            </div>

            <ol className="flex flex-col gap-5">
              {track.questions.map((question, qIndex) => {
                const chosen = trackAnswers[qIndex]
                return (
                  <li key={question.q}>
                    <p className="mb-2.5 font-semibold">
                      {qIndex + 1}. {question.q}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {question.options.map((option, oIndex) => {
                        const reveal = chosen !== undefined
                        const isCorrect = oIndex === question.correct
                        const isChosen = chosen === oIndex
                        return (
                          <motion.button
                            key={option}
                            type="button"
                            disabled={reveal}
                            onClick={() => answer(qIndex, oIndex)}
                            whileHover={!reveal ? { y: -2 } : undefined}
                            animate={reveal && isChosen && !isCorrect ? { x: [0, -6, 6, 0] } : { x: 0 }}
                            className={cn(
                              'flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition',
                              !reveal && 'surface-muted hover:border-blaze',
                              reveal && isCorrect && 'border-mint bg-mint-50 font-semibold dark:bg-mint-900/30',
                              reveal && isChosen && !isCorrect && 'border-red-400 bg-red-50 dark:bg-red-900/25',
                              reveal && !isCorrect && !isChosen && 'opacity-50',
                            )}
                          >
                            {option}
                            {reveal && isCorrect && <Check className="h-3.5 w-3.5 text-mint" />}
                            {reveal && isChosen && !isCorrect && <X className="h-3.5 w-3.5 text-red-500" />}
                          </motion.button>
                        )
                      })}
                    </div>
                  </li>
                )
              })}
            </ol>
          </Card>

          {/* Speaking practice + script library ---------------------- */}
          <Tabs defaultValue="speaking">
            <TabsList>
              <TabsTrigger value="speaking">Pronunciation practice</TabsTrigger>
              <TabsTrigger value="library">Script library ({scriptLibrary.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="speaking">
              <Card className="p-6">
                <WaveformRecorder key={lineIndex} expected={speakingLines[lineIndex]} />
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLineIndex((i) => (i + 1) % speakingLines.length)}
                >
                  Next sentence ({lineIndex + 1}/{speakingLines.length})
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="library">
              <Card className="p-4">
                <ul className="flex flex-col divide-y">
                  {scriptLibrary.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 py-3">
                      <Badge variant="neutral" className="mt-0.5 shrink-0">{item.kind}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-[13px] text-muted">{item.line}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
