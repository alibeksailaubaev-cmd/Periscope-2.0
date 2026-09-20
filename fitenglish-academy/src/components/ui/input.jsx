import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'h-11 w-full rounded-xl border surface-muted px-4 text-sm outline-none transition placeholder:text-muted focus:border-blaze focus:shadow-glow',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-xl border surface-muted p-4 text-sm leading-relaxed outline-none transition placeholder:text-muted focus:border-blaze focus:shadow-glow',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Input, Textarea }
