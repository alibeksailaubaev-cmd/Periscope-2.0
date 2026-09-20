import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge conditional class names, letting later Tailwind classes win. */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Fisher-Yates shuffle that leaves the source array untouched. */
export function shuffle(list) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Pick `count` random members of a list. */
export function sample(list, count) {
  return shuffle(list).slice(0, count)
}

/** Normalise a learner's answer so spacing, case and punctuation do not matter. */
export function normalise(value = '') {
  return value
    .toLowerCase()
    .replace(/[-–—_]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Clamp a number into a range. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/** "2026-09-20" for a Date — used by the streak calendar. */
export function isoDay(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

/** Count words the way a writing rubric does. */
export function countWords(text = '') {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}
