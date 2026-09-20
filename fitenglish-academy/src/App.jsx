import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import FooterStats from '@/components/FooterStats'
import DashboardHome from '@/sections/DashboardHome'
import VocabularySection from '@/sections/VocabularySection'
import GrammarGym from '@/sections/GrammarGym'
import ListeningSection from '@/sections/ListeningSection'
import ReadingZone from '@/sections/ReadingZone'
import GamesSection from '@/sections/GamesSection'
import WritingChallenge from '@/sections/WritingChallenge'
import ProgressSection from '@/sections/ProgressSection'
import SettingsSection from '@/sections/SettingsSection'

const ROUTES = {
  dashboard: DashboardHome,
  vocabulary: VocabularySection,
  grammar: GrammarGym,
  listening: ListeningSection,
  reading: ReadingZone,
  games: GamesSection,
  writing: WritingChallenge,
  progress: ProgressSection,
  settings: SettingsSection,
}

export default function App() {
  const route = useAppStore((s) => s.route)
  const theme = useAppStore((s) => s.theme)
  const registerActivity = useAppStore((s) => s.registerActivity)

  // Theme class lives on <html> so Tailwind's `dark:` variants apply everywhere.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Extend the streak once per day, on the first visit of the session.
  useEffect(() => {
    registerActivity()
  }, [registerActivity])

  const Section = ROUTES[route] ?? DashboardHome

  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex flex-col md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-7 md:py-8">
          {/*
            Route changes animate on enter only. Wrapping this in
            AnimatePresence deadlocks: once a Radix Tabs panel other than the
            default one has been opened (the Games section), the outgoing
            subtree never completes its exit animation and stays mounted
            forever. Keying the element remounts it cleanly and still gives
            the fade + slide the design calls for.
          */}
          <motion.div
            key={route}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
          >
            <Section />
          </motion.div>
          <FooterStats />
        </main>
      </div>
    </div>
  )
}
