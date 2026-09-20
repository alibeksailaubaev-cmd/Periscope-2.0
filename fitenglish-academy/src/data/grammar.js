/**
 * Grammar Gym — ten questions that drill Form 11 grammar inside fitness
 * contexts. `explanation` is shown in both languages after every answer.
 */
export const grammarTopics = [
  'Present Simple vs Continuous',
  'Past Simple',
  'Future forms',
  'Modal verbs',
  'Comparatives & Superlatives',
  'Conditionals',
]

export const grammarExercises = [
  {
    id: 1,
    topic: 'Present Simple vs Continuous',
    question: 'I ___ (do) yoga every morning before school.',
    options: ['do', 'am doing', 'does', 'did'],
    correct: 'do',
    explanation: {
      en: 'Present Simple for a routine — "every morning" is the giveaway.',
      ru: 'Present Simple для регулярных действий: маркер «every morning».',
    },
  },
  {
    id: 2,
    topic: 'Present Simple vs Continuous',
    question: 'Be quiet — the coach ___ (explain) the new circuit right now.',
    options: ['explains', 'is explaining', 'explain', 'explained'],
    correct: 'is explaining',
    explanation: {
      en: 'Present Continuous for something happening at this moment ("right now").',
      ru: 'Present Continuous — действие происходит прямо сейчас.',
    },
  },
  {
    id: 3,
    topic: 'Modal verbs',
    question: 'You ___ drink more water during training — it is really important.',
    options: ['should', 'can', 'might', 'would'],
    correct: 'should',
    explanation: {
      en: '"Should" gives advice. "Must" would sound like an order from a doctor.',
      ru: '«Should» — совет. «Must» прозвучало бы как строгий приказ.',
    },
  },
  {
    id: 4,
    topic: 'Modal verbs',
    question: 'Athletes ___ take banned substances — it is against the rules.',
    options: ["mustn't", "don't have to", 'needn’t', 'could not'],
    correct: "mustn't",
    explanation: {
      en: '"Mustn’t" = it is forbidden. "Don’t have to" would mean it is simply unnecessary.',
      ru: '«Mustn’t» — запрещено. «Don’t have to» значило бы «не обязательно».',
    },
  },
  {
    id: 5,
    topic: 'Comparatives & Superlatives',
    question: 'Running is ___ than walking.',
    options: ['more energetic', 'energeticer', 'most energetic', 'as energetic'],
    correct: 'more energetic',
    explanation: {
      en: 'Adjectives of three or more syllables take "more", never the -er ending.',
      ru: 'Длинные прилагательные образуют сравнительную степень через «more».',
    },
  },
  {
    id: 6,
    topic: 'Comparatives & Superlatives',
    question: 'Swimming is ___ sport for people with joint problems.',
    options: ['the safest', 'safer', 'the most safe', 'safest'],
    correct: 'the safest',
    explanation: {
      en: 'Superlative of a short adjective: the + adjective + -est.',
      ru: 'Превосходная степень короткого прилагательного: the safest.',
    },
  },
  {
    id: 7,
    topic: 'Past Simple',
    question: 'Yesterday I ___ (go) to the gym and ___ (lift) weights for an hour.',
    options: ['went / lifted', 'have gone / lifted', 'go / lift', 'was going / lift'],
    correct: 'went / lifted',
    explanation: {
      en: 'A finished action at a stated past time ("yesterday") takes Past Simple.',
      ru: 'Завершённое действие с указанием времени в прошлом — Past Simple.',
    },
  },
  {
    id: 8,
    topic: 'Future forms',
    question: 'Look at those clouds — we ___ train indoors today.',
    options: ['are going to', 'will', 'shall', 'would'],
    correct: 'are going to',
    explanation: {
      en: '"Going to" for a prediction based on evidence you can see right now.',
      ru: '«Going to» — прогноз на основании очевидных признаков.',
    },
  },
  {
    id: 9,
    topic: 'Conditionals',
    question: 'If you exercise regularly, you ___ much better.',
    options: ['will sleep', 'would sleep', 'slept', 'will slept'],
    correct: 'will sleep',
    explanation: {
      en: 'First conditional: if + present simple, will + infinitive — a real future result.',
      ru: 'Первый тип условных: if + Present Simple, will + инфинитив.',
    },
  },
  {
    id: 10,
    topic: 'Conditionals',
    question: 'If I ___ eight hours of sleep, I would not feel exhausted in class.',
    options: ['got', 'get', 'would get', 'will get'],
    correct: 'got',
    explanation: {
      en: 'Second conditional: if + past simple, would + infinitive. Never "would" in the if-clause.',
      ru: 'Второй тип условных: if + Past Simple, would + инфинитив.',
    },
  },
]
