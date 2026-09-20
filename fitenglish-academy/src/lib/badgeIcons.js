/**
 * Explicit registry of the icons achievement badges use.
 * Importing them by name (instead of `import * as Icons`) keeps tree-shaking
 * working — a namespace import pulls the entire lucide icon set into the bundle.
 */
import {
  Award, BookOpen, Flame, Gamepad2, GraduationCap, Headphones, HeartPulse,
  PenLine, Sparkles, Target, Trophy,
} from 'lucide-react'

const BADGE_ICONS = {
  Award, BookOpen, Flame, Gamepad2, GraduationCap, Headphones, HeartPulse,
  PenLine, Sparkles, Target, Trophy,
}

export function badgeIcon(name) {
  return BADGE_ICONS[name] ?? Award
}
