import { motion } from 'framer-motion'
import {
  ArrowRight, BookMarked, Dumbbell, Gamepad2, Headphones, PenLine, Target,
} from 'lucide-react'
import { dailyWords, vocabulary } from '@/data/vocabulary'
import { useAppStore, levelFor } from '@/store/useAppStore'
import { useT } from '@/hooks/useLesson'
import SectionHeading from '@/components/SectionHeading'
import WordCard from '@/components/WordCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

const SHORTCUTS = [
  { route: 'grammar', label: 'Grammar Gym', icon: Dumbbell, blurb: '10 questions, instant feedback', tone: 'bg-grad-blaze' },
  { route: 'listening', label: 'Listening Lab', icon: Headphones, blurb: '5 tracks + microphone practice', tone: 'bg-grad-mint' },
  { route: 'reading', label: 'Reading Zone', icon: BookMarked, blurb: '3 articles, tap any word', tone: 'bg-grad-ink' },
  { route: 'games', label: 'Vocabulary Games', icon: Gamepad2, blurb: '4 games + class leaderboard', tone: 'bg-grad-blaze' },
  { route: 'writing', label: 'Writing Challenge', icon: PenLine, blurb: '15 prompts with a grammar check', tone: 'bg-grad-mint' },
]

/** Landing view: today's five words plus a route into every other section. */
export default function DashboardHome() {
  const t = useT()
  const setRoute = useAppStore((s) => s.setRoute)
  const learnedWords = useAppStore((s) => s.learnedWords)
  const xp = useAppStore((s) => s.xp)
  const streak = useAppStore((s) => s.streak)
  const name = useAppStore((s) => s.name)
  const level = levelFor(xp)

  const daily = dailyWords()
  const learnedToday = daily.filter((w) => learnedWords.includes(w.id)).length
  const weeklyTarget = 20
  const weeklyProgress = Math.min(100, Math.round((learnedWords.length % weeklyTarget) / weeklyTarget * 100))

  return (
    <div>
      {/* Welcome banner -------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-7 overflow-hidden rounded-2xl bg-grad-ink p-6 text-white shadow-premium-lg md:p-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Badge variant="mint" className="mb-3 border-white/20 bg-white/10 text-white">
              Unit: Keep Fit · Form 11
            </Badge>
            <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">
              Good to see you, {name}.
            </h1>
            <p className="mt-2 max-w-xl text-white/70">
              You are at <strong className="text-white">{level.id} ({level.label})</strong> with a {streak}-day streak.
              Five new words are waiting below — then pick a station.
            </p>
          </div>

          <div className="w-full max-w-xs rounded-xl bg-white/10 p-4 backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/70">
              <Target className="h-3.5 w-3.5" /> Weekly challenge
            </div>
            <p className="font-display text-lg font-bold">Learn {weeklyTarget} new words</p>
            <Progress value={weeklyProgress} className="mt-2.5 border-white/20 bg-white/15" indicatorClassName="bg-grad-mint" />
            <p className="mt-1.5 text-[12px] text-white/65">
              {learnedWords.length} of {vocabulary.length} words in the bank
            </p>
          </div>
        </div>
      </motion.div>

      {/* Section A -------------------------------------------------- */}
      <SectionHeading
        eyebrow="Section A"
        title="Daily Word Challenge"
        description={`Today's five. ${learnedToday} of 5 already ticked — each one is +5 XP.`}
        actions={
          <Button variant="outline" onClick={() => setRoute('vocabulary')}>
            All {vocabulary.length} words <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {daily.map((word, i) => (
          <WordCard key={word.id} word={word} index={i} />
        ))}
      </div>

      {/* Shortcuts --------------------------------------------------- */}
      <h2 className="mb-4 mt-10 font-display text-xl font-bold">Today&rsquo;s stations</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SHORTCUTS.map((shortcut, i) => (
          <motion.button
            key={shortcut.route}
            type="button"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ scale: 1.02, y: -3 }}
            onClick={() => setRoute(shortcut.route)}
            className="text-left"
          >
            <Card className="h-full transition hover:shadow-premium-lg">
              <CardContent className="flex items-center gap-4 p-5">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white ${shortcut.tone}`}>
                  <shortcut.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-bold">{shortcut.label}</p>
                  <p className="text-[13px] text-muted">{shortcut.blurb}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted" />
              </CardContent>
            </Card>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
