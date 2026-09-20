import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

/** Animated bar; `indicatorClassName` lets a section paint its own gradient. */
const Progress = React.forwardRef(({ className, value = 0, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-2.5 w-full overflow-hidden rounded-full surface-muted border', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn('h-full rounded-full bg-grad-blaze transition-[width] duration-700 ease-out', indicatorClassName)}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = 'Progress'

export { Progress }
