import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Volume2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useSpeak } from '@/hooks/useLesson'
import { canSpeak } from '@/lib/speech'
import SectionHeading from '@/components/SectionHeading'
import {
  BallIllustration, CycleIllustration, DrinkIllustration, EatIllustration, HeartIllustration,
  LiftIllustration, RunIllustration, SleepIllustration, SwimIllustration,
} from '@/components/illustrations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** The four habits the unit keeps coming back to. */
const HABITS = [
  {
    id: 'move',
    Art: LiftIllustration,
    title: 'Move every day',
    sentence: 'You do not need a gym. Walking to school, cycling and dancing all count as exercise.',
    words: ['exercise', 'workout', 'cardio', 'warm-up'],
  },
  {
    id: 'eat',
    Art: EatIllustration,
    title: 'Eat a balanced diet',
    sentence: 'Fill half your plate with vegetables, a quarter with protein and a quarter with carbohydrates.',
    words: ['balanced diet', 'protein', 'carbohydrates', 'vitamins'],
  },
  {
    id: 'sleep',
    Art: SleepIllustration,
    title: 'Sleep enough',
    sentence: 'Muscles are repaired while you sleep, not while you train. Rest is part of the plan.',
    words: ['recovery', 'rest', 'stamina', 'burnout'],
  },
  {
    id: 'drink',
    Art: DrinkIllustration,
    title: 'Drink water',
    sentence: 'Drink steadily through the day. Hydration is a habit, not an emergency measure.',
    words: ['hydration', 'dehydration', 'thirsty'],
  },
]

/** The ways people keep fit — pictures first, collocations second. */
const WAYS = [
  { id: 'run', Art: RunIllustration, phrase: 'go running', line: 'Three kilometres before school, in any weather.' },
  { id: 'swim', Art: SwimIllustration, phrase: 'go swimming', line: 'The whole body works, and the joints are protected.' },
  { id: 'cycle', Art: CycleIllustration, phrase: 'go cycling', line: 'Ride to school and the training is already done.' },
  { id: 'ball', Art: BallIllustration, phrase: 'play football', line: 'You run for an hour and never notice it.' },
]

/** Phrases students confuse constantly. */
const PHRASES = [
  { phrase: 'keep fit', meaning: 'to stay healthy and strong by exercising regularly', note: 'an ongoing state' },
  { phrase: 'get fit', meaning: 'to become fit when you are not fit yet', note: 'a change' },
  { phrase: 'stay in shape', meaning: 'to keep your body in good condition', note: 'informal, very common' },
  { phrase: 'work out', meaning: 'to do a training session', note: 'phrasal verb: I work out on Mondays' },
  { phrase: 'take up a sport', meaning: 'to start doing a sport regularly', note: 'take up, not take on' },
  { phrase: 'be out of shape', meaning: 'to be unfit', note: 'the opposite of in shape' },
]

/** Public-health guidance, so the numbers in the unit are not invented. */
const GUIDELINES = [
  { value: '60', unit: 'minutes a day', detail: 'of moderate or vigorous activity for 5–17-year-olds', source: 'World Health Organization' },
  { value: '8–10', unit: 'hours of sleep', detail: 'a night for teenagers aged 13–18', source: 'American Academy of Sleep Medicine' },
  { value: '6–8', unit: 'glasses of fluid', detail: 'a day, and more when you train or when it is hot', source: 'NHS' },
]

/** Small round button that reads a phrase aloud. */
function Say({ text, label, className }) {
  const speak = useSpeak()
  if (!canSpeak) return null
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label={label ?? `Listen to ${text}`}
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg border surface-muted text-muted transition hover:bg-grad-blaze hover:text-white',
        className,
      )}
    >
      <Volume2 className="h-3.5 w-3.5" />
    </button>
  )
}

/** The landing view: an illustrated introduction to the unit's topic. */
export default function DashboardHome() {
  const setRoute = useAppStore((s) => s.setRoute)
  const speak = useSpeak()

  return (
    <div>
      <SectionHeading
        eyebrow="Unit introduction"
        icon={Sparkles}
        title="What does “keep fit” mean?"
        description="Before the vocabulary and the grammar, the idea itself — what people actually do when they keep fit, and how English talks about it."
      />

      {/* Definition ------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-6 overflow-hidden rounded-2xl bg-grad-ink text-white shadow-premium-lg"
      >
        <div className="grid gap-6 p-6 md:grid-cols-[1.5fr_auto] md:items-center md:p-8">
          <div>
            <Badge variant="mint" className="mb-4 border-white/20 bg-white/10 text-white">
              phrase · B1
            </Badge>

            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-4xl font-bold leading-none md:text-5xl">keep fit</h2>
              <span className="font-mono text-base text-white/60">/kiːp fɪt/</span>
              <button
                type="button"
                onClick={() => speak('keep fit')}
                aria-label="Listen to keep fit"
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 transition hover:bg-white/30"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 max-w-xl text-lg leading-snug">
              To stay healthy and strong by taking regular exercise — and by eating, sleeping and
              drinking sensibly around it.
            </p>

            <dl className="mt-5 grid gap-2 text-[15px] sm:grid-cols-2">
              <div className="rounded-xl bg-white/10 px-4 py-2.5">
                <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/55">Русский</dt>
                <dd>поддерживать форму, следить за собой</dd>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-2.5">
                <dt className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/55">Қазақша</dt>
                <dd>дене шынықтыру, сымбатты болу</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-start gap-3 border-l-2 border-blaze pl-4">
              <p className="italic text-white/85">
                “My grandfather is eighty-two and he still swims every morning — he has kept fit all
                his life.”
              </p>
              <button
                type="button"
                onClick={() =>
                  speak(
                    'My grandfather is eighty-two and he still swims every morning. He has kept fit all his life.',
                  )
                }
                aria-label="Listen to the example sentence"
                className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/15 transition hover:bg-white/30"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <HeartIllustration className="mx-auto h-40 w-40 md:h-52 md:w-52" />
        </div>
      </motion.div>

      {/* Four habits ------------------------------------------------ */}
      <h2 className="mb-1 font-display text-xl font-bold">Four habits, not one</h2>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Keeping fit is never only about sport. These four go together — drop one and the other three
        stop working as well.
      </p>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {HABITS.map((habit, i) => (
          <motion.div
            key={habit.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.42 }}
            whileHover={{ y: -4 }}
          >
            <Card className="h-full transition hover:shadow-premium-lg">
              <CardContent className="p-5 pt-5">
                <habit.Art className="mb-3 h-24 w-24" />
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-display text-[17px] font-bold leading-tight">{habit.title}</h3>
                  <Say text={`${habit.title}. ${habit.sentence}`} />
                </div>
                <p className="text-[14px] leading-snug text-muted">{habit.sentence}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {habit.words.map((word) => (
                    <button
                      key={word}
                      type="button"
                      onClick={() => speak(word)}
                      className="rounded-full border surface-muted px-2.5 py-1 text-[12px] font-semibold transition hover:border-blaze hover:text-blaze"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Ways to keep fit ------------------------------------------- */}
      <h2 className="mb-1 font-display text-xl font-bold">Ways to keep fit</h2>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Notice the verb in front of each one — English uses <strong>go</strong> with activities ending
        in -ing and <strong>play</strong> with ball games.
      </p>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {WAYS.map((way, i) => (
          <motion.div
            key={way.id}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.09, duration: 0.4 }}
            whileHover={{ y: -4 }}
          >
            <Card className="h-full overflow-hidden transition hover:shadow-premium-lg">
              <div className="grid place-items-center surface-muted py-4">
                <way.Art className="h-28 w-28" />
              </div>
              <CardContent className="p-4 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-[16px] font-bold">{way.phrase}</p>
                  <Say text={way.phrase} />
                </div>
                <p className="mt-1 text-[13.5px] leading-snug text-muted">{way.line}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Phrases ---------------------------------------------------- */}
      <h2 className="mb-1 font-display text-xl font-bold">Say it the English way</h2>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Six expressions that come up in every essay on this topic. Tap the speaker to hear each one.
      </p>

      <Card className="mb-10 overflow-hidden">
        <ul className="divide-y">
          {PHRASES.map((item) => (
            <li key={item.phrase} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
              <Say text={item.phrase} />
              <span className="font-display text-[16px] font-bold">{item.phrase}</span>
              <span className="min-w-[200px] flex-1 text-[14.5px] text-muted">{item.meaning}</span>
              <Badge variant="neutral">{item.note}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      {/* Guidelines ------------------------------------------------- */}
      <h2 className="mb-1 font-display text-xl font-bold">What the guidelines actually say</h2>
      <p className="mb-4 max-w-2xl text-sm text-muted">
        Useful numbers for your essays — and they are real, not invented for the lesson.
      </p>

      <div className="mb-10 grid gap-4 md:grid-cols-3">
        {GUIDELINES.map((item, i) => (
          <motion.div
            key={item.unit}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="h-full p-5">
              <p className="font-display text-4xl font-bold text-blaze">{item.value}</p>
              <p className="font-display text-[15px] font-bold">{item.unit}</p>
              <p className="mt-1.5 text-[13.5px] text-muted">{item.detail}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {item.source}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Onward ----------------------------------------------------- */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-display text-xl font-bold">Ready for the words?</h2>
          <p className="mt-1 text-sm text-muted">
            Fifty-two fitness words are waiting, five at a time, with pronunciation and examples.
          </p>
        </div>
        <Button size="lg" onClick={() => setRoute('vocabulary')}>
          Start the vocabulary <ArrowRight className="h-4 w-4" />
        </Button>
      </Card>
    </div>
  )
}
