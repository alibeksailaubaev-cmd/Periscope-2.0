/**
 * Minimal EN/RU dictionary. The interface is English by default for immersion;
 * the RU switch exists as support for students who need it.
 */
export const dictionary = {
  en: {
    'nav.dashboard': 'Dashboard', 'nav.vocabulary': 'Vocabulary', 'nav.grammar': 'Grammar',
    'nav.listening': 'Listening', 'nav.reading': 'Reading', 'nav.games': 'Games',
    'nav.writing': 'Writing', 'nav.progress': 'Progress', 'nav.settings': 'Settings',
    'header.level': 'Language level', 'header.streak': 'day streak',
    'stats.words': 'Words learned', 'stats.exercises': 'Exercises completed',
    'stats.hours': 'Hours practised', 'stats.level': 'Current level',
    'common.check': 'Check', 'common.next': 'Next', 'common.restart': 'Restart',
    'common.learned': 'Learned', 'common.score': 'Score', 'common.correct': 'Correct!',
    'common.wrong': 'Not quite', 'common.xp': 'XP', 'common.close': 'Close',
    'quote.title': 'Quote of the day',
  },
  ru: {
    'nav.dashboard': 'Главная', 'nav.vocabulary': 'Словарь', 'nav.grammar': 'Грамматика',
    'nav.listening': 'Аудирование', 'nav.reading': 'Чтение', 'nav.games': 'Игры',
    'nav.writing': 'Письмо', 'nav.progress': 'Прогресс', 'nav.settings': 'Настройки',
    'header.level': 'Уровень языка', 'header.streak': 'дней подряд',
    'stats.words': 'Выучено слов', 'stats.exercises': 'Выполнено заданий',
    'stats.hours': 'Часов практики', 'stats.level': 'Текущий уровень',
    'common.check': 'Проверить', 'common.next': 'Далее', 'common.restart': 'Заново',
    'common.learned': 'Выучено', 'common.score': 'Счёт', 'common.correct': 'Верно!',
    'common.wrong': 'Не совсем', 'common.xp': 'XP', 'common.close': 'Закрыть',
    'quote.title': 'Цитата дня',
  },
}

export function translate(lang, key) {
  return dictionary[lang]?.[key] ?? dictionary.en[key] ?? key
}
