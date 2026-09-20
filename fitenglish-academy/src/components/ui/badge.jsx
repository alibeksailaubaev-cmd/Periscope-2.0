import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-blaze-200 bg-blaze-50 text-blaze-700 dark:bg-blaze-900/30 dark:text-blaze-300',
        mint: 'border-mint-200 bg-mint-50 text-mint-700 dark:bg-mint-900/30 dark:text-mint-300',
        neutral: 'surface-muted text-muted',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        danger: 'border-red-200 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
