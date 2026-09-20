import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/** Checkbox whose tick is drawn with an SVG path animation. */
const Checkbox = React.forwardRef(({ className, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    checked={checked}
    className={cn(
      'grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-colors',
      checked ? 'border-mint bg-mint' : 'border-ink-200 dark:border-ink-500',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator forceMount>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="white" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d="M4.5 12.5l5 5 10-11"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        />
      </svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = 'Checkbox'

export { Checkbox }
