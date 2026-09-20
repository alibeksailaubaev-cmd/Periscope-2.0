/**
 * Listening & Speaking.
 *
 * Each featured track carries a full script and comprehension questions.
 * The player looks for a real native-speaker recording at `audioUrl` first and
 * only falls back to speech synthesis when no file is there, so dropping mp3s
 * into `public/audio/` upgrades the section with no code change.
 */
export const tracks = [
  {
    id: 'trainer-instructions',
    title: "Trainer's instructions",
    kind: 'Instructions',
    level: 'A2',
    seconds: 48,
    speaker: 'Coach Daniyar',
    audioUrl: '/audio/trainer-instructions.mp3',
    task: 'Listen and follow the commands. Then answer the questions.',
    script:
      'Right everyone, line up along the wall. We start with two minutes of easy jogging on the spot. Keep your shoulders relaxed. Now stop and roll your shoulders backwards, five times. Next, ten squats — feet apart, knees behind your toes, and breathe out as you stand up. After the squats, hold a plank for thirty seconds. Do not let your hips drop. Finally, stretch your hamstrings for twenty seconds on each leg. Remember: if something hurts sharply, stop immediately and tell me.',
    questions: [
      { q: 'How long is the jogging warm-up?', options: ['One minute', 'Two minutes', 'Five minutes'], correct: 1 },
      { q: 'How many squats does the coach ask for?', options: ['Five', 'Ten', 'Twenty'], correct: 1 },
      { q: 'What should you do if something hurts sharply?', options: ['Keep going slowly', 'Stop and tell the coach', 'Stretch harder'], correct: 1 },
    ],
  },
  {
    id: 'nutrition-advice',
    title: 'Nutrition advice',
    kind: 'Podcast',
    level: 'B1',
    seconds: 62,
    speaker: 'Dr Aisha Karimova',
    audioUrl: '/audio/nutrition-advice.mp3',
    task: 'Listen to the podcast extract and answer the questions.',
    script:
      'The question I am asked most often by teenagers is what they should eat before training. My answer is usually boring: something you have eaten before. A session is not the moment to experiment. Roughly two hours beforehand, have a normal meal with carbohydrates and a little protein — porridge, bread with eggs, rice with chicken. If you only have twenty minutes, a banana is enough. And please drink water throughout the day rather than half a litre five minutes before you start. Hydration is a habit, not an emergency measure.',
    questions: [
      { q: 'What does the doctor say about eating before training?', options: ['Try something new', 'Eat something familiar', 'Do not eat at all'], correct: 1 },
      { q: 'How long before a session should you eat a normal meal?', options: ['Two hours', 'Ten minutes', 'Six hours'], correct: 0 },
      { q: 'What is her view on drinking water?', options: ['Drink it all just before training', 'Drink steadily through the day', 'Avoid it during exercise'], correct: 1 },
    ],
  },
]

/** Shorter scripts referenced by the course — listed in the section and readable aloud. */
export const scriptLibrary = [
  { id: 'lib-1', kind: 'Gym dialogue', title: 'Booking a badminton court', line: 'Could we book the court for Thursday at six? — I am afraid six is taken; seven is free.' },
  { id: 'lib-2', kind: 'Gym dialogue', title: 'Asking about a machine', line: 'Excuse me, how does this rowing machine work? — Set the resistance to four and pull with your legs first.' },
  { id: 'lib-3', kind: 'Gym dialogue', title: 'Sharing equipment', line: 'How many sets have you got left? — Two. You are welcome to work in with me.' },
  { id: 'lib-4', kind: 'Gym dialogue', title: 'Lost property', line: 'I think I left my water bottle in the changing room. — Blue one? It is behind the desk.' },
  { id: 'lib-5', kind: 'Gym dialogue', title: 'Joining a class', line: 'Is the yoga class suitable for complete beginners? — Absolutely, the Tuesday one is a starter class.' },
  { id: 'lib-6', kind: 'Gym dialogue', title: 'Cancelling a session', line: 'I am afraid I cannot make tomorrow. — No problem, shall we move it to Saturday morning?' },
  { id: 'lib-7', kind: 'Gym dialogue', title: 'Talking about progress', line: 'I have added five kilos to my squat this month. — That is a serious jump. How is your form?' },
  { id: 'lib-8', kind: 'Gym dialogue', title: 'Asking for a spotter', line: 'Could you spot me for this set? — Of course. Say when you want me to take it.' },
  { id: 'lib-9', kind: 'Gym dialogue', title: 'Comparing plans', line: 'Do you prefer full body or a split routine? — Full body, three times a week. Simpler to stick to.' },
  { id: 'lib-10', kind: 'Gym dialogue', title: 'After the session', line: 'That was brutal. — It was. Stretch properly or you will regret it tomorrow.' },
  { id: 'lib-11', kind: 'Trainer instruction', title: 'Circuit briefing', line: 'Forty seconds of work, twenty seconds of rest, five stations, two rounds. Water between rounds only.' },
  { id: 'lib-12', kind: 'Trainer instruction', title: 'Correcting a squat', line: 'Chest up, weight in your heels, and do not let your knees fall inwards.' },
  { id: 'lib-13', kind: 'Trainer instruction', title: 'Breathing cue', line: 'Breathe in on the way down, breathe out as you push. Never hold your breath under load.' },
  { id: 'lib-14', kind: 'Trainer instruction', title: 'Cool-down', line: 'Two minutes of easy walking, then hold each stretch for twenty seconds. No bouncing.' },
  { id: 'lib-15', kind: 'Trainer instruction', title: 'Safety briefing', line: 'Collars on every barbell, weights back on the rack, and tell me about any pain immediately.' },
  { id: 'lib-16', kind: 'Nutrition podcast', title: 'Breakfast myths', line: 'Breakfast is not magic, but skipping it and eating crisps at eleven is a poor trade.' },
  { id: 'lib-17', kind: 'Nutrition podcast', title: 'Reading a label', line: 'Look at the sugar per hundred grams, not per portion — portions are chosen by the manufacturer.' },
  { id: 'lib-18', kind: 'Nutrition podcast', title: 'Protein for teenagers', line: 'Most teenagers already eat enough protein; what they lack is vegetables and sleep.' },
  { id: 'lib-19', kind: 'Nutrition podcast', title: 'Energy drinks', line: 'An energy drink borrows tomorrow’s energy and charges interest in the form of poor sleep.' },
  { id: 'lib-20', kind: 'Nutrition podcast', title: 'Eating before an exam', line: 'Slow carbohydrates and water. Sugar gives you twenty good minutes and forty bad ones.' },
]

/** Sentences the learner records for pronunciation practice. */
export const speakingLines = [
  'I work out three times a week and I always warm up first.',
  'A balanced diet is more important than any supplement.',
  'If you exercise regularly, you will sleep much better.',
  'My favourite exercise is swimming because it protects the joints.',
  'You should drink water throughout the day, not just during training.',
]
