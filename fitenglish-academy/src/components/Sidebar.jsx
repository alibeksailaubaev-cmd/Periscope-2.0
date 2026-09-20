import { motion } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, PenSquare, Headphones, BookMarked,
  Gamepad2, PenLine, BarChart3, Settings,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useT, useSfx } from '@/hooks/useLesson'
import { cn } from '@/lib/utils'

export const NAV_ITEMS = [
  { id: 'dashboard', key: 'nav.dashboard', icon: LayoutDashboard, emoji: '🏠' },
  { id: 'vocabulary', key: 'nav.vocabulary', icon: BookOpen, emoji: '📚' },
  { id: 'grammar', key: 'nav.grammar', icon: PenSquare, emoji: '✏️' },
  { id: 'listening', key: 'nav.listening', icon: Headphones, emoji: '🎧' },
  { id: 'reading', key: 'nav.reading', icon: BookMarked, emoji: '📖' },
  { id: 'games', key: 'nav.games', icon: Gamepad2, emoji: '🎮' },
  { id: 'writing', key: 'nav.writing', icon: PenLine, emoji: '✍️' },
  { id: 'progress', key: 'nav.progress', icon: BarChart3, emoji: '📊' },
  { id: 'settings', key: 'nav.settings', icon: Settings, emoji: '⚙️' },
]

export default function Sidebar() {
  const t = useT()
  const sfx = useSfx()
  const route = useAppStore((s) => s.route)
  const setRoute = useAppStore((s) => s.setRoute)
  const avatar = useAppStore((s) => s.avatar)
  const name = useAppStore((s) => s.name)

  return (
    <aside className="sticky top-[73px] z-30 h-auto border-b surface px-3 py-3 md:h-[calc(100vh-73px)] md:w-[248px] md:shrink-0 md:border-b-0 md:border-r md:py-5">
      {/* Learner card — hidden on tablet width to keep the rail short */}
      <div className="mb-4 hidden items-center gap-3 rounded-xl surface-muted p-3 md:flex">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-grad-mint text-xl" aria-hidden="true">
          {avatar.character}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-display text-sm font-semibold">{name}</p>
          <p className="text-[11px] text-muted">Form 11 · Keep Fit</p>
        </div>
      </div>

      <nav className="flex gap-1.5 overflow-x-auto md:flex-col md:overflow-visible" aria-label="Sections">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = route === item.id
          return (
            <motion.button
              key={item.id}
              type="button"
              whileHover={{ x: active ? 0 : 3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setRoute(item.id)
                sfx('click')
              }}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors md:w-full',
                active ? 'text-white' : 'text-muted hover:surface-muted hover:text-blaze',
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 -z-10 rounded-xl bg-grad-blaze shadow-premium"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="text-base leading-none md:hidden" aria-hidden="true">{item.emoji}</span>
              <Icon className="hidden h-4 w-4 md:block" />
              <span className="whitespace-nowrap">{t(item.key)}</span>
            </motion.button>
          )
        })}
      </nav>
    </aside>
  )
}
