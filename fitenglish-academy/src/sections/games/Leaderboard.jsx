import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { leaderboard } from '@/data/games'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const MEDALS = ['🥇', '🥈', '🥉']

/** Class top-10 with the current learner merged in and highlighted. */
export default function Leaderboard() {
  const { name, xp, streak, avatar } = useAppStore()

  const rows = [...leaderboard, { id: 'me', name: name || 'You', xp, streak, me: true }]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10)

  return (
    <ol className="flex flex-col gap-1.5">
      {rows.map((row, i) => (
        <motion.li
          key={row.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={cn(
            'flex items-center gap-3 rounded-xl border p-3 transition',
            row.me ? 'border-blaze bg-blaze-50 shadow-premium dark:bg-blaze-900/25' : 'surface',
          )}
        >
          <span className="w-7 text-center font-display text-sm font-bold text-muted">
            {MEDALS[i] ?? i + 1}
          </span>
          <span
            className={cn(
              'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base',
              row.me ? 'bg-grad-blaze text-white' : 'surface-muted',
            )}
            aria-hidden="true"
          >
            {row.me ? avatar.character : row.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold leading-tight">
              {row.name}
              {row.me && <span className="ml-1.5 text-[11px] font-bold uppercase text-blaze">you</span>}
            </p>
            <p className="flex items-center gap-1 whitespace-nowrap text-[12px] text-muted">
              <Flame className="h-3 w-3 shrink-0" /> {row.streak} days
            </p>
          </div>
          <Badge variant={row.me ? 'default' : 'neutral'} className="shrink-0">
            {row.xp} XP
          </Badge>
        </motion.li>
      ))}
    </ol>
  )
}
