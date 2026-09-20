import { motion } from 'framer-motion'
import { Gamepad2, Grid3x3, Shuffle, SpellCheck, Trophy } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import SectionHeading from '@/components/SectionHeading'
import WordMatch from '@/sections/games/WordMatch'
import Hangman from '@/sections/games/Hangman'
import WordScramble from '@/sections/games/WordScramble'
import Crossword from '@/sections/games/Crossword'
import Leaderboard from '@/sections/games/Leaderboard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

const GAMES = [
  { id: 'wordMatch', label: 'Word Match', icon: Grid3x3, description: 'Drag each English word onto its picture and translation.', Component: WordMatch },
  { id: 'hangman', label: 'Hangman', icon: SpellCheck, description: 'Guess the fitness term letter by letter — six lives.', Component: Hangman },
  { id: 'scramble', label: 'Word Scramble', icon: Shuffle, description: 'Rebuild the word from scrambled tiles against the clock.', Component: WordScramble },
  { id: 'crossword', label: 'Crossword', icon: Grid3x3, description: 'Nine fitness clues, one grid.', Component: Crossword },
]

/** Section E — four vocabulary games plus the class leaderboard. */
export default function GamesSection() {
  const gameScores = useAppStore((s) => s.gameScores)

  return (
    <div>
      <SectionHeading
        eyebrow="Section E"
        icon={Gamepad2}
        title="Vocabulary Games"
        description="Four ways to drill the same fifty words. Every point you win here counts towards your class ranking."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Tabs defaultValue="wordMatch">
          <TabsList>
            {GAMES.map((game) => (
              <TabsTrigger key={game.id} value={game.id}>
                {game.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {GAMES.map((game) => (
            <TabsContent key={game.id} value={game.id}>
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <game.icon className="h-4.5 w-4.5 text-blaze" />
                      {game.label}
                    </CardTitle>
                    <CardDescription>{game.description}</CardDescription>
                  </div>
                  <Badge variant="mint">Best: {gameScores[game.id] ?? 0}</Badge>
                </CardHeader>
                <CardContent>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <game.Component />
                  </motion.div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-amber-500" /> Class leaderboard
            </CardTitle>
            <CardDescription>Top 10 of Form 11 this month.</CardDescription>
          </CardHeader>
          <CardContent>
            <Leaderboard />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
