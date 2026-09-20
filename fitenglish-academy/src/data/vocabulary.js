/**
 * Fitness vocabulary bank (52 entries, A2–B2).
 * `emoji` stands in for the illustration a production build would load from
 * `/images/<word>.jpg`; `audioUrl` is kept for the same reason — the prototype
 * pronounces words with the Web Speech API instead of shipping mp3 files.
 */
export const CATEGORIES = [
  { id: 'exercise', label: 'Exercise types', color: 'blaze' },
  { id: 'equipment', label: 'Equipment', color: 'mint' },
  { id: 'nutrition', label: 'Nutrition', color: 'blaze' },
  { id: 'body', label: 'Body & health', color: 'mint' },
  { id: 'actions', label: 'Actions', color: 'blaze' },
  { id: 'wellbeing', label: 'Wellbeing', color: 'mint' },
]

let nextId = 0
const entry = (word, translation, pronunciation, example, category, emoji) => ({
  id: (nextId += 1),
  word,
  translation,
  pronunciation,
  example,
  category,
  emoji,
  audioUrl: `/audio/${word.replace(/\s+/g, '-')}.mp3`,
  image: `/images/${word.replace(/\s+/g, '-')}.jpg`,
})

export const vocabulary = [
  // --- exercise types -------------------------------------------------
  entry('workout', 'тренировка', '/ˈwɜːk.aʊt/', 'I do a short workout every morning before school.', 'exercise', '🏋️'),
  entry('cardio', 'кардио', '/ˈkɑː.di.əʊ/', 'Twenty minutes of cardio raises your heart rate.', 'exercise', '🏃'),
  entry('strength training', 'силовая тренировка', '/streŋθ ˈtreɪ.nɪŋ/', 'Strength training twice a week protects your bones.', 'exercise', '💪'),
  entry('yoga', 'йога', '/ˈjəʊ.ɡə/', 'She does yoga to relax after exams.', 'exercise', '🧘'),
  entry('pilates', 'пилатес', '/pɪˈlɑː.tiːz/', 'Pilates is excellent for your core muscles.', 'exercise', '🤸'),
  entry('stretching', 'растяжка', '/ˈstretʃ.ɪŋ/', 'Five minutes of stretching prevents stiff legs.', 'exercise', '🙆'),
  entry('warm-up', 'разминка', '/ˈwɔːm.ʌp/', 'Never skip the warm-up before a match.', 'exercise', '🔥'),
  entry('cool-down', 'заминка', '/ˈkuːl.daʊn/', 'A slow cool-down brings your pulse back to normal.', 'exercise', '❄️'),
  entry('endurance', 'выносливость', '/ɪnˈdjʊə.rəns/', 'Long runs build endurance week by week.', 'exercise', '⏱️'),
  entry('flexibility', 'гибкость', '/ˌflek.səˈbɪl.ə.ti/', 'Gymnasts need extraordinary flexibility.', 'exercise', '🤾'),

  // --- equipment ------------------------------------------------------
  entry('dumbbells', 'гантели', '/ˈdʌm.belz/', 'Start with light dumbbells and perfect form.', 'equipment', '🏋️'),
  entry('barbell', 'штанга', '/ˈbɑː.bel/', 'He added ten kilos to the barbell.', 'equipment', '🏋️'),
  entry('treadmill', 'беговая дорожка', '/ˈtred.mɪl/', 'I ran five kilometres on the treadmill.', 'equipment', '🏃'),
  entry('resistance band', 'резиновая лента', '/rɪˈzɪs.təns bænd/', 'A resistance band fits in your school bag.', 'equipment', '🎽'),
  entry('yoga mat', 'коврик для йоги', '/ˈjəʊ.ɡə mæt/', 'Roll out your yoga mat near the window.', 'equipment', '🧘'),
  entry('kettlebell', 'гиря', '/ˈket.əl.bel/', 'Kettlebell swings work your whole body.', 'equipment', '🔔'),
  entry('jump rope', 'скакалка', '/dʒʌmp rəʊp/', 'Ten minutes with a jump rope burns serious calories.', 'equipment', '🪢'),
  entry('rowing machine', 'гребной тренажёр', '/ˈrəʊ.ɪŋ məˌʃiːn/', 'The rowing machine trains arms, legs and back at once.', 'equipment', '🚣'),

  // --- nutrition ------------------------------------------------------
  entry('protein', 'белок', '/ˈprəʊ.tiːn/', 'Eggs and beans are cheap sources of protein.', 'nutrition', '🥚'),
  entry('carbohydrates', 'углеводы', '/ˌkɑː.bəʊˈhaɪ.dreɪts/', 'Carbohydrates give you energy for long lessons.', 'nutrition', '🍞'),
  entry('fats', 'жиры', '/fæts/', 'Healthy fats come from nuts, fish and olive oil.', 'nutrition', '🥑'),
  entry('calories', 'калории', '/ˈkæl.ər.iz/', 'A teenager needs about 2,400 calories a day.', 'nutrition', '🔢'),
  entry('vitamins', 'витамины', '/ˈvɪt.ə.mɪnz/', 'Fresh fruit is full of vitamins.', 'nutrition', '🍊'),
  entry('minerals', 'минералы', '/ˈmɪn.ər.əlz/', 'Milk supplies minerals such as calcium.', 'nutrition', '🥛'),
  entry('hydration', 'гидратация', '/haɪˈdreɪ.ʃən/', 'Hydration matters as much as training.', 'nutrition', '💧'),
  entry('fibre', 'клетчатка', '/ˈfaɪ.bər/', 'Vegetables and oats are rich in fibre.', 'nutrition', '🥦'),
  entry('supplement', 'добавка', '/ˈsʌp.lɪ.mənt/', 'No supplement replaces a balanced diet.', 'nutrition', '💊'),
  entry('balanced diet', 'сбалансированное питание', '/ˌbæl.ənst ˈdaɪ.ət/', 'A balanced diet beats any miracle plan.', 'nutrition', '🍽️'),

  // --- body & health --------------------------------------------------
  entry('muscles', 'мышцы', '/ˈmʌs.əlz/', 'Your muscles grow while you sleep, not in the gym.', 'body', '💪'),
  entry('joints', 'суставы', '/dʒɔɪnts/', 'Warm joints are far less likely to be injured.', 'body', '🦵'),
  entry('bones', 'кости', '/bəʊnz/', 'Running makes your bones denser and stronger.', 'body', '🦴'),
  entry('heart', 'сердце', '/hɑːt/', 'The heart is a muscle, so train it.', 'body', '❤️'),
  entry('lungs', 'лёгкие', '/lʌŋz/', 'Swimming teaches your lungs to work efficiently.', 'body', '🫁'),
  entry('spine', 'позвоночник', '/spaɪn/', 'Sitting badly for hours damages the spine.', 'body', '🦴'),
  entry('tendon', 'сухожилие', '/ˈten.dən/', 'The Achilles tendon connects the calf to the heel.', 'body', '🦶'),
  entry('posture', 'осанка', '/ˈpɒs.tʃər/', 'Good posture makes you look and feel confident.', 'body', '🧍'),

  // --- actions --------------------------------------------------------
  entry('lift', 'поднимать', '/lɪft/', 'Lift with your legs, never with your back.', 'actions', '🏋️'),
  entry('run', 'бегать', '/rʌn/', 'I run three kilometres before breakfast.', 'actions', '🏃'),
  entry('jump', 'прыгать', '/dʒʌmp/', 'Jump as high as you can, then land softly.', 'actions', '⬆️'),
  entry('squat', 'приседать', '/skwɒt/', 'Squat until your thighs are parallel to the floor.', 'actions', '🦵'),
  entry('push-up', 'отжимание', '/ˈpʊʃ.ʌp/', 'He can do forty push-ups without stopping.', 'actions', '🤾'),
  entry('pull-up', 'подтягивание', '/ˈpʊl.ʌp/', 'One clean pull-up is better than five sloppy ones.', 'actions', '🧗'),
  entry('stretch', 'тянуться', '/stretʃ/', 'Stretch gently — never bounce.', 'actions', '🙆'),
  entry('sprint', 'спринт', '/sprɪnt/', 'Sprint for thirty seconds, then walk for a minute.', 'actions', '💨'),
  entry('swim', 'плавать', '/swɪm/', 'She swims forty lengths every Saturday.', 'actions', '🏊'),
  entry('breathe', 'дышать', '/briːð/', 'Breathe out as you push the weight up.', 'actions', '🌬️'),

  // --- wellbeing ------------------------------------------------------
  entry('recovery', 'восстановление', '/rɪˈkʌv.ər.i/', 'Recovery days are part of the training plan.', 'wellbeing', '🛌'),
  entry('sleep', 'сон', '/sliːp/', 'Eight hours of sleep beats any energy drink.', 'wellbeing', '😴'),
  entry('stamina', 'выдержка', '/ˈstæm.ɪ.nə/', 'Exams need mental stamina too.', 'wellbeing', '🔋'),
  entry('burnout', 'выгорание', '/ˈbɜːn.aʊt/', 'Training every single day leads to burnout.', 'wellbeing', '🥵'),
  entry('motivation', 'мотивация', '/ˌməʊ.tɪˈveɪ.ʃən/', 'Motivation starts it; habit keeps it going.', 'wellbeing', '🎯'),
  entry('injury', 'травма', '/ˈɪn.dʒər.i/', 'An injury costs more weeks than it saves minutes.', 'wellbeing', '🤕'),
]

/**
 * Five words rotate daily — deterministic, so the whole class sees the same
 * set. The stride is coprime with the bank size, which spreads the five words
 * across different categories instead of handing out one contiguous block.
 */
const DAILY_STRIDE = 11

export function dailyWords(dayIndex = new Date().getDate()) {
  const start = (dayIndex * 5) % vocabulary.length
  return Array.from(
    { length: 5 },
    (_, i) => vocabulary[(start + i * DAILY_STRIDE) % vocabulary.length],
  )
}

export const vocabularyById = Object.fromEntries(vocabulary.map((w) => [w.id, w]))
