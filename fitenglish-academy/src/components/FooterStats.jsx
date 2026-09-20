import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, CheckCircle2, Clock, Quote, TrendingUp } from 'lucide-react'
import { useAppStore, levelFor } from '@/store/useAppStore'
import { quotes } from '@/data/quotes'
import { useT } from '@/hooks/useLesson'
import AnimatedCounter from '@/components/AnimatedCounter'
import { Card } from '@/components/ui/card'

export default function FooterStats() {
  const t = useT()
  const { learnedWords, exercisesCompleted, practiceMinutes, xp } = useAppStore()
  const level = levelFor(xp)
  const [quoteIndex, setQuoteIndex] = useState(0)

  // Rotate the quote every twelve seconds with a cross-fade.
  useEffect(() => {
    const id = setInterval(() => setQuoteIndex((i) => (i + 1) % quotes.length), 12000)
    return () => clearInterval(id)
  }, [])

  const stats = [
    { id: 'words', icon: BookOpen, label: t('stats.words'), value: learnedWords.length, decimals: 0, tone: 'text-blaze' },
    { id: 'exercises', icon: CheckCircle2, label: t('stats.exercises'), value: exercisesCompleted, decimals: 0, tone: 'text-mint' },
    { id: 'hours', icon: Clock, label: t('stats.hours'), value: practiceMinutes / 60, decimals: 1, tone: 'text-blaze' },
  ]

  return (
    <footer className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.id}>
              <stat.icon className={`mb-2 h-5 w-5 ${stat.tone}`} />
              <p className="font-display text-2xl font-bold tabular-nums">
                <AnimatedCounter value={stat.value} decimals={stat.decimals} />
              </p>
              <p className="text-[12px] text-muted">{stat.label}</p>
            </div>
          ))}
          <div>
            <TrendingUp className="mb-2 h-5 w-5 text-mint" />
            <p className="font-display text-2xl font-bold">
              {level.id} <span className="text-sm font-semibold text-muted">({level.label})</span>
            </p>
            <p className="text-[12px] text-muted">{t('stats.level')}</p>
          </div>
        </div>
      </Card>

      <Card className="relative overflow-hidden bg-grad-ink p-5 text-white">
        <Quote className="absolute -right-3 -top-3 h-24 w-24 text-white/10" />
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">{t('quote.title')}</p>
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={quoteIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45 }}
          >
            <p className="font-display text-lg font-semibold leading-snug">“{quotes[quoteIndex].text}”</p>
            <footer className="mt-2 text-sm text-white/65">— {quotes[quoteIndex].author}</footer>
          </motion.blockquote>
        </AnimatePresence>
      </Card>
    </footer>
  )
}
