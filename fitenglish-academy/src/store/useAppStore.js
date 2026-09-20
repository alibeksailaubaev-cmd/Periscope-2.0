import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { achievements } from '@/data/achievements'
import { isoDay } from '@/lib/utils'

/** CEFR ladder used across the header, footer and progress screens. */
export const LEVELS = [
  { id: 'A1', label: 'Beginner', min: 0 },
  { id: 'A2', label: 'Elementary', min: 150 },
  { id: 'B1', label: 'Pre-Intermediate', min: 400 },
  { id: 'B2', label: 'Intermediate', min: 800 },
  { id: 'C1', label: 'Upper-Intermediate', min: 1400 },
]

export function levelFor(xp) {
  return [...LEVELS].reverse().find((l) => xp >= l.min) ?? LEVELS[0]
}

export function nextLevelFor(xp) {
  return LEVELS.find((l) => xp < l.min) ?? null
}

/** 0–100 progress towards the next CEFR band. */
export function levelProgress(xp) {
  const current = levelFor(xp)
  const next = nextLevelFor(xp)
  if (!next) return 100
  return Math.round(((xp - current.min) / (next.min - current.min)) * 100)
}

/** Recent days used by the activity calendar in the seeded demo profile. */
function seedActiveDays(count = 6) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return isoDay(d)
  })
}

/**
 * Demo profile. Everything here is mock data so the dashboard opens in a
 * realistic working state rather than an empty shell.
 */
const initialState = {
  name: 'Student',
  avatar: { character: '🏃', outfit: 'mint', background: 'blaze' },

  xp: 430,
  streak: 6,
  activeDays: seedActiveDays(6),
  lastActive: isoDay(),

  learnedWords: [1, 2, 3, 4, 5, 6, 11, 12, 13, 19, 20, 21, 22, 29, 30, 31, 37, 38, 39, 40, 47, 48],
  grammarBest: 8,
  readingScores: { beginner: 5, intermediate: 4 },
  gameScores: { wordMatch: 60, hangman: 0, scramble: 40, crossword: 0 },
  listeningDone: ['trainer-instructions', 'nutrition-advice'],
  essays: {},

  exercisesCompleted: 47,
  practiceMinutes: 640,

  theme: 'light',
  lang: 'en',
  route: 'dashboard',
  soundOn: true,
}

export const useAppStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // ---- progress -------------------------------------------------
      addXp: (amount) => set((s) => ({ xp: Math.max(0, s.xp + amount) })),

      completeExercise: (xp = 0, minutes = 1) =>
        set((s) => ({
          xp: s.xp + xp,
          exercisesCompleted: s.exercisesCompleted + 1,
          practiceMinutes: s.practiceMinutes + minutes,
        })),

      toggleWordLearned: (id) =>
        set((s) => {
          const known = s.learnedWords.includes(id)
          return {
            learnedWords: known ? s.learnedWords.filter((w) => w !== id) : [...s.learnedWords, id],
            xp: Math.max(0, s.xp + (known ? -5 : 5)),
          }
        }),

      setGrammarBest: (score) => set((s) => ({ grammarBest: Math.max(s.grammarBest, score) })),

      setReadingScore: (articleId, score) =>
        set((s) => ({
          readingScores: {
            ...s.readingScores,
            [articleId]: Math.max(s.readingScores[articleId] ?? 0, score),
          },
        })),

      setGameScore: (game, score) =>
        set((s) => ({
          gameScores: { ...s.gameScores, [game]: Math.max(s.gameScores[game] ?? 0, score) },
        })),

      markListeningDone: (trackId) =>
        set((s) =>
          s.listeningDone.includes(trackId)
            ? s
            : { listeningDone: [...s.listeningDone, trackId] },
        ),

      saveEssay: (promptId, text) =>
        set((s) => ({
          essays: {
            ...s.essays,
            [promptId]: { ...(s.essays[promptId] ?? {}), text, submitted: false },
          },
        })),

      submitEssay: (promptId, text) =>
        set((s) => ({
          essays: { ...s.essays, [promptId]: { text, submitted: true, at: Date.now() } },
          xp: s.xp + 40,
          exercisesCompleted: s.exercisesCompleted + 1,
        })),

      /** Called once per session — extends or restarts the streak. */
      registerActivity: () => {
        const today = isoDay()
        const { lastActive, activeDays, streak } = get()
        if (lastActive === today) return
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        set({
          lastActive: today,
          streak: lastActive === isoDay(yesterday) ? streak + 1 : 1,
          activeDays: activeDays.includes(today) ? activeDays : [...activeDays, today],
        })
      },

      // ---- interface ------------------------------------------------
      setRoute: (route) => set({ route }),
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((s) => ({ lang: s.lang === 'en' ? 'ru' : 'en' })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      setAvatar: (patch) => set((s) => ({ avatar: { ...s.avatar, ...patch } })),
      setName: (name) => set({ name }),

      resetProgress: () =>
        set({ ...initialState, theme: get().theme, lang: get().lang }),
    }),
    {
      name: 'fitenglish-academy',
      version: 1,
      /**
       * localStorage can throw outright in a sandboxed iframe or a private
       * window. Falling back to an in-memory store keeps the app usable —
       * progress simply does not survive a reload there.
       */
      storage: createJSONStorage(() => {
        try {
          const probe = '__fitenglish__'
          window.localStorage.setItem(probe, probe)
          window.localStorage.removeItem(probe)
          return window.localStorage
        } catch {
          const memory = new Map()
          return {
            getItem: (key) => memory.get(key) ?? null,
            setItem: (key, value) => memory.set(key, value),
            removeItem: (key) => memory.delete(key),
          }
        }
      }),
      partialize: (s) => {
        const { setRoute, ...rest } = s
        return rest
      },
    },
  ),
)

/** Badge ids the learner has unlocked, given the current state. */
export function earnedBadges(state) {
  return achievements.filter((badge) => {
    try {
      return badge.check(state)
    } catch {
      return false
    }
  })
}
