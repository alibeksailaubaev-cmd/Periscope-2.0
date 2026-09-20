# FitEnglish Academy

A premium learning dashboard for **Form 11 English**, built around the unit **“Keep Fit”**.
Students pick up vocabulary, grammar, listening, reading, games and writing entirely through
fitness and healthy-living content. The interface is in English for immersion, with an EN/RU
switch as support.

Everything runs on mock data, so the prototype is a complete, clickable product with no backend.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the production build
```

---

## Stack

| Concern | Choice |
| --- | --- |
| Build | Vite 5 + React 18 |
| Styling | Tailwind CSS 3 (`darkMode: 'class'`) |
| Components | shadcn/ui-style primitives on Radix (`src/components/ui`) |
| Animation | Framer Motion |
| Charts | Recharts |
| Icons | lucide-react |
| State | Zustand + `persist` (localStorage) |
| Audio | Howler.js for effects, Web Speech API for pronunciation |

Palette: blaze `#FF6B35`, mint `#00B894`, ink `#2D3436` on a light ground.
Type: **Poppins** for headings, **Inter** for body. Cards use `border-radius: 16px`
and `box-shadow: 0 4px 20px rgba(0,0,0,0.08)` (`shadow-premium`).

---

## Layout

```
Header      logo (pulsing ring) · A1→C1 progress · badges · 🔥 streak · EN/RU · sound · theme
Sidebar     Dashboard · Vocabulary · Grammar · Listening · Reading · Games · Writing · Progress · Settings
Main        the active section, cross-faded on every route change
Footer      animated counters (words / exercises / hours / level) + rotating quote of the day
```

## Sections

| | Section | What it does |
| --- | --- | --- |
| A | **Daily Word Challenge** | 5 rotating words as 3D flip cards, pronunciation button, “Learned” tick worth +5 XP. The full 52-word bank is searchable under **Vocabulary**. |
| B | **Grammar Gym** | 10 questions across Present Simple/Continuous, Past Simple, future forms, modals, comparatives and conditionals. Instant tick/cross plus the rule in EN or RU. |
| C | **Listening & Speaking** | 5 scripted tracks (instructions, podcast, gym dialogues) with comprehension questions, a slower playback mode, transcripts, a 20-item script library, and microphone practice with a live waveform and a pronunciation score. |
| D | **Reading Zone** | 3 graded articles (A2 / B1 / B2–C1). Every known word is tappable for an instant translation, each article has a read-aloud button, a glossary and a 5-question quiz. |
| E | **Vocabulary Games** | Word Match (drag-and-drop with a tap fallback), Hangman with a progressive gallows drawing, timed Word Scramble, an 11×11 Crossword, and the class top-10 leaderboard. |
| F | **Writing Challenge** | 15 prompts, live word counter against the target range, autosaved drafts, a mock grammar checker built from ten mistakes this class repeats, one-click fixes, and the marking rubric. |
| 📊 | **Progress** | XP area chart, skills bar chart, 10 achievement badges, a six-week activity calendar, share-to-class (mock) and a printable certificate (browser “Save as PDF”). |
| ⚙️ | **Settings** | Avatar (character, kit colour, background), display name, theme, interface language, sound, and a progress reset. |

## Animations

Staggered section entry (100 ms between cards), `scale(1.02)` + shadow on hover,
`rotateY(180deg)` card flips, confetti on a perfect score, shake on a wrong answer,
width-transitioned progress bars, fade + slide between routes, blurred backdrop on dialogs,
and count-up animations on every statistic. All of it respects `prefers-reduced-motion`.

---

## Mock data

Everything lives in `src/data/`:

| File | Contents |
| --- | --- |
| `vocabulary.js` | 52 words across 6 categories, each with translation, IPA, example sentence |
| `grammar.js` | 10 exercises with bilingual explanations |
| `reading.js` | 3 articles + glossaries + 15 quiz questions |
| `listening.js` | 5 full tracks with questions, 20 shorter scripts, 5 speaking lines |
| `games.js` | match pairs, 10 hangman words, 10 scramble words, the crossword, the leaderboard |
| `writing.js` | 15 prompts, the rubric, and the grammar-checker rules |
| `achievements.js`, `quotes.js`, `i18n.js` | badges, quote rotation, EN/RU interface strings |

**No binary assets ship with the prototype.** Two consequences worth knowing:

- Vocabulary entries keep `audioUrl` and `image` fields for a future backend, but the UI
  uses an emoji and the **Web Speech API** for pronunciation. Point those fields at real
  files and swap `speak()` for an `<audio>` element to go live.
- Sound effects are **synthesised into WAV data URIs at runtime** (`src/lib/audio.js`) and
  played through Howler, so the audio layer is real without committing mp3s.

Speech-to-text uses the browser's `SpeechRecognition` where it exists and falls back to a
deterministic mock elsewhere — the badge in the recorder says which one is running.

### Crossword map

The grid is authored with explicit coordinates in `games.js`, so every intersection is
correct by construction:

| # | Direction | Start (row, col) | Answer |
| --- | --- | --- | --- |
| 1 | across | 1, 1 | PROTEIN |
| 4 | across | 3, 0 | LAZY |
| 5 | across | 5, 1 | KNEE |
| 6 | across | 6, 3 | NIGHT |
| 7 | across | 8, 5 | SPORT |
| 1 | down | 1, 1 | PLANK |
| 2 | down | 1, 3 | OXYGEN |
| 3 | down | 1, 7 | NUTRITION |
| 7 | down | 8, 5 | SET |

---

## Wiring in a real backend

The store (`src/store/useAppStore.js`) is the only place that owns learner state, so a
backend integration replaces the `persist` middleware with API calls and leaves every
component untouched. The natural endpoints are:

```
GET  /api/profile          → xp, streak, activeDays, avatar, learnedWords
POST /api/progress         → { type: 'word' | 'grammar' | 'reading' | 'game', payload }
POST /api/essays/:promptId → { text, submitted }
GET  /api/leaderboard      → the class top 10
```

Components are modular and self-contained: each section is a single file under
`src/sections/`, each game under `src/sections/games/`, and shared primitives live in
`src/components/ui/`.

## Project structure

```
src/
  components/      Header, Sidebar, FooterStats, WordCard, WaveformRecorder, Confetti, AnimatedCounter
    ui/            Button, Card, Badge, Progress, Input, Textarea, Checkbox, Dialog, Tabs
  sections/        one file per dashboard section
    games/         WordMatch, Hangman, WordScramble, Crossword, Leaderboard
  data/            all mock content
  store/           Zustand store, CEFR ladder, badge evaluation
  lib/             utils, audio synthesis, speech helpers
  hooks/           useSfx, useSpeak, useT
```
