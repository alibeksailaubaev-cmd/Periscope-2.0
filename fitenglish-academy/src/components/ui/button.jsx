import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 active:translate-y-[1px]',
  {
    variants: {
      variant: {
        default: 'bg-grad-blaze text-white shadow-premium hover:shadow-premium-lg',
        mint: 'bg-grad-mint text-white shadow-premium hover:shadow-premium-lg',
        ink: 'bg-grad-ink text-white shadow-premium hover:shadow-premium-lg',
        outline: 'border surface hover:border-blaze hover:text-blaze',
        ghost: 'hover:surface-muted text-muted hover:text-blaze',
        subtle: 'surface-muted border hover:border-mint',
        danger: 'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px]',
        default: 'h-11 px-5',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
})
Button.displayName = 'Button'

export { Button, buttonVariants }
