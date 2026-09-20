/** Writing Challenge — 15 graded prompts plus the assessment rubric. */
export const writingPrompts = [
  { id: 'w1', title: 'My Fitness Routine', min: 100, max: 150, level: 'B1', brief: 'Describe what you do in a typical week. Use Present Simple and frequency adverbs.' },
  { id: 'w2', title: 'Why Healthy Eating is Important', min: 150, max: 200, level: 'B1', brief: 'Give three reasons and support each one with an example.' },
  { id: 'w6', title: 'Fast Food Near Schools: For and Against', min: 200, max: 250, level: 'B2', brief: 'A balanced discussion essay with linking words.' },
  { id: 'w7', title: 'My Fitness Goals for This Year', min: 120, max: 160, level: 'B1', brief: 'Use future forms: will, going to, present continuous for arrangements.' },
  { id: 'w15', title: 'What Keeping Fit Means to Me', min: 200, max: 250, level: 'B2', brief: 'A reflective essay. Avoid clichés; use specific personal detail.' },
]

export const rubric = [
  { id: 'content', label: 'Content', weight: 25, detail: 'Task fully covered, ideas developed with relevant examples.' },
  { id: 'vocabulary', label: 'Vocabulary', weight: 25, detail: 'Topic vocabulary used accurately; range beyond the obvious words.' },
  { id: 'grammar', label: 'Grammar', weight: 25, detail: 'Target structures used correctly; errors do not block meaning.' },
  { id: 'organization', label: 'Organization', weight: 25, detail: 'Clear paragraphs, linking words, logical progression.' },
]

/**
 * Mock grammar checker: a list of rules the class gets wrong most often.
 * Each rule reports a match, a short explanation and a suggested fix.
 */
export const checkerRules = [
  { id: 'r1', pattern: /\bi\b/g, caseSensitive: true, message: 'Capitalise the pronoun "I".', fix: 'I' },
  { id: 'r2', pattern: /\bmust to\b/gi, message: '"Must" is followed by the bare infinitive — drop "to".', fix: 'must' },
  { id: 'r3', pattern: /\bshould to\b/gi, message: '"Should" takes the bare infinitive — drop "to".', fix: 'should' },
  { id: 'r4', pattern: /\badvice me\b/gi, message: 'The verb is "advise"; "advice" is the noun.', fix: 'advise me' },
  { id: 'r5', pattern: /\bmake sport\b/gi, message: 'We "do sport" or "play a sport", never "make sport".', fix: 'do sport' },
  { id: 'r6', pattern: /\bmore healthier\b/gi, message: 'Double comparative — choose one.', fix: 'healthier' },
  { id: 'r7', pattern: /\bin the same time\b/gi, message: 'The fixed phrase is "at the same time".', fix: 'at the same time' },
  { id: 'r8', pattern: /\bdepends of\b/gi, message: 'The verb takes "on": depend on.', fix: 'depends on' },
  { id: 'r9', pattern: /\binformations\b/gi, message: '"Information" is uncountable.', fix: 'information' },
  { id: 'r10', pattern: /\bpeoples\b/gi, message: '"People" is already plural.', fix: 'people' },
]

/** Run the mock checker over an essay and return the issues it found. */
export function checkGrammar(text) {
  const issues = []
  checkerRules.forEach((rule) => {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags)
    let match = regex.exec(text)
    while (match) {
      if (!(rule.caseSensitive && match[0] !== 'i')) {
        issues.push({
          id: `${rule.id}-${match.index}`,
          index: match.index,
          length: match[0].length,
          found: match[0],
          message: rule.message,
          fix: rule.fix,
        })
      }
      match = regex.lastIndex > match.index ? regex.exec(text) : null
    }
  })
  return issues.sort((a, b) => a.index - b.index)
}
