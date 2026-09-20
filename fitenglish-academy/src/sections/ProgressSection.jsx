import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Download, Lock, Share2 } from 'lucide-react'
import { badgeIcon } from '@/lib/badgeIcons'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useAppStore, levelFor, levelProgress, nextLevelFor, earnedBadges } from '@/store/useAppStore'
import { achievements } from '@/data/achievements'
import { vocabulary } from '@/data/vocabulary'
import { grammarExercises } from '@/data/grammar'
import { tracks } from '@/data/listening'
import { articles } from '@/data/reading'
import { isoDay, cn } from '@/lib/utils'
import SectionHeading from '@/components/SectionHeading'
import AnimatedCounter from '@/components/AnimatedCounter'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Last 7 days of XP, reconstructed from the activity log for the demo chart. */
function weeklySeries(activeDays, xp) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const day = isoDay(date)
    const active = activeDays.includes(day)
    return {
      day: DAY_LABELS[(date.getDay() + 6) % 7],
      xp: active ? Math.round((xp / 14) * (0.6 + ((i * 37) % 11) / 12)) : 0,
    }
  })
}

/** Section 📊 — charts, badges and the activity calendar. */
export default function ProgressSection() {
  const state = useAppStore()
  const { xp, streak, activeDays, learnedWords, grammarBest, readingScores, listeningDone, gameScores, exercisesCompleted, practiceMinutes } = state
  const [certificateOpen, setCertificateOpen] = useState(false)
  const [shared, setShared] = useState(false)

  const level = levelFor(xp)
  const next = nextLevelFor(xp)
  const unlocked = earnedBadges(state)
  const unlockedIds = new Set(unlocked.map((b) => b.id))

  const weekly = weeklySeries(activeDays, xp)
  const skills = [
    { skill: 'Vocabulary', value: Math.round((learnedWords.length / vocabulary.length) * 100), fill: '#FF6B35' },
    { skill: 'Grammar', value: Math.round((grammarBest / grammarExercises.length) * 100), fill: '#00B894' },
    { skill: 'Listening', value: Math.round((listeningDone.length / tracks.length) * 100), fill: '#FF6B35' },
    { skill: 'Reading', value: Math.round((Object.keys(readingScores).length / articles.length) * 100), fill: '#00B894' },
    { skill: 'Games', value: Math.min(100, Math.round(Object.values(gameScores).reduce((a, b) => a + b, 0) / 4)), fill: '#2D3436' },
  ]

  // Six weeks of squares for the activity calendar.
  const calendar = Array.from({ length: 42 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (41 - i))
    const day = isoDay(date)
    return { day, active: activeDays.includes(day), label: date.getDate() }
  })

  return (
    <div>
      <SectionHeading
        eyebrow="Progress"
        icon={BarChart3}
        title="Your progress"
        description="Everything you have done this unit, in one place — and a certificate you can print when you are proud of it."
        actions={
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={() => { setShared(true); setTimeout(() => setShared(false), 2400) }}>
              <Share2 className="h-4 w-4" /> {shared ? 'Shared with class!' : 'Share result'}
            </Button>
            <Button onClick={() => setCertificateOpen(true)}>
              <Download className="h-4 w-4" /> Certificate (PDF)
            </Button>
          </div>
        }
      />

      {/* Headline numbers ------------------------------------------- */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total XP', value: xp, suffix: '' },
          { label: 'Words learned', value: learnedWords.length, suffix: ` / ${vocabulary.length}` },
          { label: 'Exercises done', value: exercisesCompleted, suffix: '' },
          { label: 'Hours practised', value: practiceMinutes / 60, suffix: '', decimals: 1 },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{stat.label}</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums">
                <AnimatedCounter value={stat.value} decimals={stat.decimals ?? 0} />
                <span className="text-base text-muted">{stat.suffix}</span>
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* XP chart ------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">XP earned this week</CardTitle>
            <CardDescription>A {streak}-day streak and counting.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weekly} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#FF6B35" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="currentColor" className="text-ink-200 dark:text-ink-600" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="currentColor" className="text-ink-400" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="currentColor" className="text-ink-400" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,.08)', fontSize: 13 }}
                  formatter={(value) => [`${value} XP`, 'Earned']}
                />
                <Area type="monotone" dataKey="xp" stroke="#FF6B35" strokeWidth={2.5} fill="url(#xpFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skills --------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills breakdown</CardTitle>
            <CardDescription>Percentage of each section completed.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={skills} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 4" stroke="currentColor" className="text-ink-200 dark:text-ink-600" vertical={false} />
                <XAxis dataKey="skill" tickLine={false} axisLine={false} fontSize={12} stroke="currentColor" className="text-ink-400" />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} stroke="currentColor" className="text-ink-400" />
                <Tooltip
                  cursor={{ fill: 'rgba(255,107,53,.06)' }}
                  contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,0,0,.08)', fontSize: 13 }}
                  formatter={(value) => [`${value}%`, 'Complete']}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {skills.map((s) => (
                    <Cell key={s.skill} fill={s.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Badges --------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Achievements <span className="text-muted">({unlocked.length}/{achievements.length})</span>
            </CardTitle>
            <CardDescription>Badges unlock automatically as you work.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {achievements.map((badge, i) => {
              const Icon = badgeIcon(badge.icon)
              const has = unlockedIds.has(badge.id)
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3',
                    has ? 'border-mint bg-mint-50 dark:bg-mint-900/20' : 'surface-muted opacity-70',
                  )}
                >
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', has ? 'bg-grad-mint text-white' : 'surface text-muted')}>
                    {has ? <Icon className="h-4.5 w-4.5" /> : <Lock className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-bold">{badge.title}</p>
                    <p className="truncate text-[12px] text-muted">{badge.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </CardContent>
        </Card>

        {/* Calendar ------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity calendar</CardTitle>
            <CardDescription>The last six weeks. Orange means you practised.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1.5">
              {calendar.map((cell, i) => (
                <motion.div
                  key={cell.day}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.008 }}
                  title={cell.day}
                  className={cn(
                    'grid aspect-square place-items-center rounded-lg text-[11px] font-semibold',
                    cell.active ? 'bg-grad-blaze text-white shadow-premium' : 'surface-muted text-muted',
                  )}
                >
                  {cell.label}
                </motion.div>
              ))}
            </div>

            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-[12px] font-semibold">
                <span>{level.id} · {level.label}</span>
                <span className="text-muted">{next ? `${next.min - xp} XP to ${next.id}` : 'Top level reached'}</span>
              </div>
              <Progress value={levelProgress(xp)} indicatorClassName="bg-grad-mint" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Printable certificate -------------------------------------- */}
      <Dialog open={certificateOpen} onOpenChange={setCertificateOpen}>
        <DialogContent className="w-[min(94vw,620px)]">
          <DialogTitle>Certificate of progress</DialogTitle>
          <DialogDescription>
            Print this page, or choose “Save as PDF” in the print dialog.
          </DialogDescription>

          <div id="certificate" className="mt-5 rounded-2xl border-4 border-blaze p-7 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-blaze">FitEnglish Academy</p>
            <h3 className="mt-3 font-display text-2xl font-bold">{state.name}</h3>
            <p className="mt-1 text-sm text-muted">Form 11 · Unit: Keep Fit</p>
            <div className="my-5 h-px bg-blaze-200" />
            <p className="text-sm">
              has reached level <strong>{level.id} — {level.label}</strong> with <strong>{xp} XP</strong>,
              learning <strong>{learnedWords.length}</strong> words and completing{' '}
              <strong>{exercisesCompleted}</strong> exercises.
            </p>
            <p className="mt-3 text-sm">
              Badges earned: <strong>{unlocked.length} of {achievements.length}</strong> · Longest streak:{' '}
              <strong>{streak} days</strong>
            </p>
            <p className="mt-5 text-[12px] text-muted">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="mt-5 flex gap-2.5">
            <Button className="flex-1" onClick={() => window.print()}>
              <Download className="h-4 w-4" /> Print / Save as PDF
            </Button>
            <Button variant="outline" onClick={() => setCertificateOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
