/** Content for the four vocabulary games plus the class leaderboard. */

export const matchPairs = [
  { id: 'm1', word: 'dumbbells', translation: 'гантели', emoji: '🏋️' },
  { id: 'm2', word: 'treadmill', translation: 'беговая дорожка', emoji: '🏃' },
  { id: 'm3', word: 'protein', translation: 'белок', emoji: '🥚' },
  { id: 'm4', word: 'joints', translation: 'суставы', emoji: '🦵' },
  { id: 'm5', word: 'stretching', translation: 'растяжка', emoji: '🙆' },
  { id: 'm6', word: 'hydration', translation: 'гидратация', emoji: '💧' },
]

export const hangmanWords = [
  { word: 'TREADMILL', hint: 'You run on it, but you never move forward.' },
  { word: 'PROTEIN', hint: 'Muscles are rebuilt from it.' },
  { word: 'STRETCHING', hint: 'Do it slowly, and never bounce.' },
  { word: 'ENDURANCE', hint: 'What marathon runners need most.' },
  { word: 'KETTLEBELL', hint: 'A cast-iron ball with a handle.' },
  { word: 'POSTURE', hint: 'Sitting badly for years ruins it.' },
  { word: 'CARDIOVASCULAR', hint: 'The system made of the heart and blood vessels.' },
  { word: 'RECOVERY', hint: 'The part of training that happens on the sofa.' },
  { word: 'NUTRITION', hint: 'The science of what is on your plate.' },
  { word: 'FLEXIBILITY', hint: 'Gymnasts have a great deal of it.' },
]

export const scrambleWords = [
  { answer: 'workout', hint: 'A training session.' },
  { answer: 'cardio', hint: 'Exercise that raises your heart rate.' },
  { answer: 'muscle', hint: 'It grows while you sleep.' },
  { answer: 'vitamin', hint: 'Oranges are full of it.' },
  { answer: 'sprint', hint: 'A very short, very fast run.' },
  { answer: 'balance', hint: 'What you need to stand on one leg.' },
  { answer: 'healthy', hint: 'The adjective this whole unit is about.' },
  { answer: 'stamina', hint: 'Staying power, physical or mental.' },
  { answer: 'squat', hint: 'Sit back as if a chair were behind you.' },
  { answer: 'oxygen', hint: 'Your lungs take it from the air.' },
]

/**
 * Crossword grid is 11×11. Entries are authored with explicit coordinates so
 * every intersection is guaranteed by construction (see README for the map).
 */
export const crossword = {
  size: 11,
  entries: [
    { number: 1, direction: 'across', row: 1, col: 1, answer: 'PROTEIN', clue: 'The nutrient your muscles are rebuilt from.' },
    { number: 4, direction: 'across', row: 3, col: 0, answer: 'LAZY', clue: 'A ___ lifestyle is the enemy of fitness.' },
    { number: 5, direction: 'across', row: 5, col: 1, answer: 'KNEE', clue: 'The joint that complains first when you run badly.' },
    { number: 6, direction: 'across', row: 6, col: 3, answer: 'NIGHT', clue: "A good ___'s sleep is when muscles actually grow." },
    { number: 7, direction: 'across', row: 8, col: 5, answer: 'SPORT', clue: 'Football, tennis and swimming are all kinds of this.' },
    { number: 1, direction: 'down', row: 1, col: 1, answer: 'PLANK', clue: 'A core exercise you hold on your forearms.' },
    { number: 2, direction: 'down', row: 1, col: 3, answer: 'OXYGEN', clue: 'Your lungs take it from the air.' },
    { number: 3, direction: 'down', row: 1, col: 7, answer: 'NUTRITION', clue: 'The science of what you eat.' },
    { number: 7, direction: 'down', row: 8, col: 5, answer: 'SET', clue: 'Three ___s of ten repetitions.' },
  ],
}

/** Mock class leaderboard; the learner is injected at render time. */
export const leaderboard = [
  { id: 'l1', name: 'Aizhan Serikova', xp: 1480, streak: 21 },
  { id: 'l2', name: 'Daniyar Abenov', xp: 1355, streak: 14 },
  { id: 'l3', name: 'Madina Yerlanova', xp: 1290, streak: 18 },
  { id: 'l4', name: 'Timur Nurlanov', xp: 1140, streak: 9 },
  { id: 'l5', name: 'Kamila Zhaksylyk', xp: 1075, streak: 12 },
  { id: 'l6', name: 'Arman Bekov', xp: 960, streak: 7 },
  { id: 'l7', name: 'Dana Omarova', xp: 915, streak: 11 },
  { id: 'l8', name: 'Ruslan Toleu', xp: 830, streak: 5 },
  { id: 'l9', name: 'Alua Sagyndyk', xp: 780, streak: 8 },
  { id: 'l10', name: 'Nurzhan Kaliev', xp: 720, streak: 4 },
]
