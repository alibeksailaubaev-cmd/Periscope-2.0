import { tracks } from '@/data/listening'

export const achievements = [
  { id: 'streak7', title: '7-Day Streak', description: 'Practise seven days in a row.', icon: 'Flame', check: (s) => s.streak >= 7 },
  { id: 'vocab-master', title: 'Vocabulary Master', description: 'Learn 100 words.', icon: 'BookOpen', check: (s) => s.learnedWords.length >= 100 },
  { id: 'vocab-starter', title: 'Word Collector', description: 'Learn your first 10 words.', icon: 'Sparkles', check: (s) => s.learnedWords.length >= 10 },
  { id: 'grammar-guru', title: 'Grammar Guru', description: 'Score 8/10 or better in the Grammar Gym.', icon: 'GraduationCap', check: (s) => s.grammarBest >= 8 },
  { id: 'grammar-champ', title: 'Grammar Champion', description: 'A perfect 10/10 in the Grammar Gym.', icon: 'Trophy', check: (s) => s.grammarBest >= 10 },
  { id: 'perfect-quiz', title: 'Perfect Quiz Score', description: '5/5 in any reading quiz.', icon: 'Target', check: (s) => Object.values(s.readingScores).some((v) => v >= 5) },
  { id: 'fitness-expert', title: 'Fitness Expert', description: 'Finish all three reading articles.', icon: 'HeartPulse', check: (s) => Object.keys(s.readingScores).length >= 3 },
  { id: 'game-on', title: 'Game On', description: 'Win points in every vocabulary game.', icon: 'Gamepad2', check: (s) => ['wordMatch', 'hangman', 'scramble', 'crossword'].every((g) => (s.gameScores[g] || 0) > 0) },
  { id: 'writer', title: 'Published Writer', description: 'Submit an essay for review.', icon: 'PenLine', check: (s) => Object.values(s.essays).some((e) => e.submitted) },
  { id: 'listener', title: 'Sharp Ears', description: 'Complete every listening track.', icon: 'Headphones', check: (s) => s.listeningDone.length >= tracks.length },
]
