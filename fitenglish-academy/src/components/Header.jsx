import { motion } from 'framer-motion'
import { Dumbbell, Languages, Lock, Moon, Sun, Volume2, VolumeX } from 'lucide-react'
import { badgeIcon } from '@/lib/badgeIcons'
import { useAppStore, levelFor, levelProgress, nextLevelFor, earnedBadges, LEVELS } from '@/store/useAppStore'
import { achievements } from '@/data/achievements'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useT } from '@/hooks/useLesson'
import { cn } from '@/lib/utils'

/** Three headline badges are shown in the header; the rest live in Progress. */
const HEADLINE_BADGES = ['vocab-master', 'grammar-guru', 'fitness-expert']

export default function Header() {
  const t = useT()
  const state = useAppStore()
  const { xp, streak, theme, lang, soundOn, toggleTheme, toggleLang, toggleSound } = state

  const level = levelFor(xp)
  const next = nextLevelFor(xp)
  const progress = levelProgress(xp)
  const unlocked = new Set(earnedBadges(state).map((b) => b.id))

  return (
    <header className="sticky top-0 z-40 border-b surface/90 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 md:px-7">
        {/* Logo with a pulsing ring */}
        <div className="flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-grad-blaze text-white shadow-premium">
            <Dumbbell className="h-5 w-5" />
            <span className="absolute inset-0 rounded-xl border-2 border-blaze animate-pulse-ring" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-bold tracking-tight">FitEnglish Academy</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Form 11 · Keep Fit</p>
          </div>
        </div>

        {/* CEFR progress A1 → C1 */}
        <div className="order-3 w-full min-w-[220px] flex-1 md:order-none md:w-auto">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted">
            <span>{t('header.level')}</span>
            <span className="text-blaze">
              {level.id} · {level.label}
            </span>
          </div>
          <Progress value={progress} />
          <div className="mt-1 flex justify-between text-[10px] font-medium text-muted">
            {LEVELS.map((l) => (
              <span key={l.id} className={cn(xp >= l.min && 'text-mint font-bold')}>
                {l.id}
              </span>
            ))}
          </div>
          {next && (
            <p className="mt-1 text-[11px] text-muted">
              {next.min - xp} XP to {next.id}
            </p>
          )}
        </div>

        {/* Achievement badges */}
        <div className="hidden items-center gap-2 lg:flex">
          {HEADLINE_BADGES.map((id) => {
            const badge = achievements.find((b) => b.id === id)
            const Icon = badgeIcon(badge.icon)
            const has = unlocked.has(id)
            return (
              <motion.div
                key={id}
                whileHover={{ scale: 1.06, y: -2 }}
                title={`${badge.title} — ${badge.description}`}
                className={cn(
                  'grid h-10 w-10 place-items-center rounded-xl border transition',
                  has ? 'border-mint bg-mint-50 text-mint-700 dark:bg-mint-900/30' : 'surface-muted text-muted',
                )}
              >
                {has ? <Icon className="h-4.5 w-4.5" /> : <Lock className="h-4 w-4" />}
              </motion.div>
            )
          })}
        </div>

        {/* Streak */}
        <div className="flex items-center gap-2 rounded-xl border border-blaze-200 bg-blaze-50 px-3 py-2 dark:border-blaze-800 dark:bg-blaze-900/25">
          <span className="text-lg animate-flicker" aria-hidden="true">🔥</span>
          <div className="leading-none">
            <p className="font-display text-base font-bold text-blaze-700 dark:text-blaze-300">{streak}</p>
            <p className="text-[10px] uppercase tracking-wide text-blaze-600 dark:text-blaze-400">{t('header.streak')}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={toggleLang} title="Interface language" aria-label="Switch interface language">
            <span className="flex items-center gap-1 text-[11px] font-bold">
              <Languages className="h-4 w-4" />
              {lang.toUpperCase()}
            </span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleSound} title={soundOn ? 'Sound on' : 'Sound off'} aria-pressed={soundOn}>
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} title="Theme" aria-label="Toggle dark mode">
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
