import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Search, Volume2 } from 'lucide-react'
import { vocabulary, CATEGORIES, dailyWords } from '@/data/vocabulary'
import { useAppStore } from '@/store/useAppStore'
import { useSpeak } from '@/hooks/useLesson'
import SectionHeading from '@/components/SectionHeading'
import WordCard from '@/components/WordCard'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

/** Section A (full view): daily five plus the searchable 52-word bank. */
export default function VocabularySection() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const speak = useSpeak()
  const learnedWords = useAppStore((s) => s.learnedWords)
  const daily = useMemo(() => dailyWords(), [])

  const filtered = vocabulary.filter((w) => {
    const matchesCategory = category === 'all' || w.category === category
    const q = query.trim().toLowerCase()
    const matchesQuery = !q || w.word.includes(q) || w.translation.toLowerCase().includes(q)
    return matchesCategory && matchesQuery
  })

  const learnedPct = Math.round((learnedWords.length / vocabulary.length) * 100)

  return (
    <div>
      <SectionHeading
        eyebrow="Section A"
        icon={BookOpen}
        title="Daily Word Challenge"
        description="Five new fitness words every day. Flip each card, listen to the pronunciation, then tick “Learned” to bank +5 XP."
        actions={
          <Card className="min-w-[220px] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Bank progress</p>
            <p className="my-1 font-display text-2xl font-bold">
              {learnedWords.length}
              <span className="text-base text-muted"> / {vocabulary.length}</span>
            </p>
            <Progress value={learnedPct} indicatorClassName="bg-grad-mint" />
          </Card>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {daily.map((word, i) => (
          <WordCard key={word.id} word={word} index={i} />
        ))}
      </div>

      {/* Full vocabulary bank -------------------------------------- */}
      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Vocabulary bank</h2>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a word or translation…"
              className="pl-9"
              aria-label="Search vocabulary"
            />
          </div>
        </div>

        <Tabs value={category} onValueChange={setCategory}>
          <TabsList>
            <TabsTrigger value="all">All ({vocabulary.length})</TabsTrigger>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((word, i) => {
            const learned = learnedWords.includes(word.id)
            return (
              <motion.div
                key={word.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.012, 0.3) }}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 transition hover:shadow-premium',
                  learned ? 'bg-mint-50/60 border-mint-200 dark:bg-mint-900/20' : 'surface',
                )}
              >
                <span className="text-xl" aria-hidden="true">{word.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{word.word}</p>
                  <p className="truncate text-[13px] text-muted">{word.translation}</p>
                </div>
                {learned && <Badge variant="success">✓</Badge>}
                <button
                  type="button"
                  onClick={() => speak(word.word)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg surface-muted text-muted transition hover:bg-grad-blaze hover:text-white"
                  aria-label={`Listen to ${word.word}`}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )
          })}
          {!filtered.length && (
            <p className="col-span-full rounded-xl border border-dashed p-6 text-center text-sm text-muted">
              No words match “{query}”. Try a different spelling.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
