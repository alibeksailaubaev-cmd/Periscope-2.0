import { motion } from 'framer-motion'
import { Moon, RotateCcw, Settings as SettingsIcon, Sun, Volume2, VolumeX } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useSfx } from '@/hooks/useLesson'
import SectionHeading from '@/components/SectionHeading'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const CHARACTERS = ['🏃', '🏋️', '🤸', '🧘', '🚴', '🏊', '⛹️', '🤾']
const OUTFITS = [
  { id: 'mint', label: 'Mint', className: 'bg-grad-mint' },
  { id: 'blaze', label: 'Blaze', className: 'bg-grad-blaze' },
  { id: 'ink', label: 'Ink', className: 'bg-grad-ink' },
]
const BACKGROUNDS = [
  { id: 'blaze', label: 'Sunrise', className: 'bg-blaze-100' },
  { id: 'mint', label: 'Court', className: 'bg-mint-100' },
  { id: 'ink', label: 'Night', className: 'bg-ink-200' },
]

/** Avatar customisation, theme, language, sound and a progress reset. */
export default function SettingsSection() {
  const sfx = useSfx()
  const { name, avatar, theme, lang, soundOn, setName, setAvatar, toggleTheme, setLang, toggleSound, resetProgress } = useAppStore()

  return (
    <div>
      <SectionHeading
        eyebrow="Settings"
        icon={SettingsIcon}
        title="Settings"
        description="Make the dashboard yours — avatar, theme, interface language and sound."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Avatar ---------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your avatar</CardTitle>
            <CardDescription>Shown in the sidebar and on the leaderboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex items-center gap-4">
              <div className={cn('grid h-20 w-20 place-items-center rounded-2xl text-4xl', BACKGROUNDS.find((b) => b.id === avatar.background)?.className)}>
                <span className={cn('grid h-14 w-14 place-items-center rounded-xl', OUTFITS.find((o) => o.id === avatar.outfit)?.className)}>
                  {avatar.character}
                </span>
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted" htmlFor="learner-name">
                  Display name
                </label>
                <Input id="learner-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>
            </div>

            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Character</p>
            <div className="mb-5 flex flex-wrap gap-2">
              {CHARACTERS.map((character) => (
                <motion.button
                  key={character}
                  type="button"
                  whileHover={{ y: -3 }}
                  onClick={() => { setAvatar({ character }); sfx('click') }}
                  className={cn(
                    'grid h-11 w-11 place-items-center rounded-xl border text-xl transition',
                    avatar.character === character ? 'border-blaze bg-blaze-50 dark:bg-blaze-900/30' : 'surface-muted hover:border-mint',
                  )}
                >
                  {character}
                </motion.button>
              ))}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Kit colour</p>
                <div className="flex gap-2">
                  {OUTFITS.map((outfit) => (
                    <button
                      key={outfit.id}
                      type="button"
                      onClick={() => setAvatar({ outfit: outfit.id })}
                      className={cn('h-10 flex-1 rounded-xl border-2 transition', outfit.className, avatar.outfit === outfit.id ? 'border-ink scale-105' : 'border-transparent')}
                      aria-label={outfit.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Background</p>
                <div className="flex gap-2">
                  {BACKGROUNDS.map((background) => (
                    <button
                      key={background.id}
                      type="button"
                      onClick={() => setAvatar({ background: background.id })}
                      className={cn('h-10 flex-1 rounded-xl border-2 transition', background.className, avatar.background === background.id ? 'border-ink scale-105' : 'border-transparent')}
                      aria-label={background.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences ----------------------------------------------- */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interface</CardTitle>
              <CardDescription>English is the default so the lesson stays immersive.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">Theme</p>
                  <p className="text-[13px] text-muted">Currently {theme}.</p>
                </div>
                <Button variant="outline" onClick={toggleTheme}>
                  {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  {theme === 'light' ? 'Dark' : 'Light'}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">Interface language</p>
                  <p className="text-[13px] text-muted">Task content always stays in English.</p>
                </div>
                <div className="flex gap-1.5">
                  {['en', 'ru'].map((code) => (
                    <Button key={code} size="sm" variant={lang === code ? 'default' : 'outline'} onClick={() => setLang(code)}>
                      {code.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">Sound</p>
                  <p className="text-[13px] text-muted">Effects and pronunciation playback.</p>
                </div>
                <Button variant="outline" onClick={toggleSound}>
                  {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  {soundOn ? 'On' : 'Off'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reset</CardTitle>
              <CardDescription>
                Progress lives in this browser. Resetting restores the demo profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="danger" onClick={resetProgress}>
                <RotateCcw className="h-4 w-4" /> Reset my progress
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
