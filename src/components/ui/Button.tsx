import React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-soft disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-grey-900 text-white hover:bg-grey-800 shadow-sm',
        destructive: 'bg-error text-white hover:bg-error/90 shadow-sm',
        outline: 'border-2 border-grey-200 bg-transparent hover:bg-grey-50 hover:border-grey-300 shadow-sm',
        secondary: 'bg-grey-100 text-grey-900 hover:bg-grey-200 shadow-sm',
        ghost: 'hover:bg-grey-100 hover:text-grey-900',
        link: 'text-accent underline-offset-4 hover:underline hover:text-accent-hover',
        gradient: 'bg-gradient-polkadot text-white shadow-lg shadow-[var(--color-polkadot-pink)]/30 hover:shadow-xl hover:shadow-[var(--color-polkadot-pink)]/40 hover:scale-[1.02]',
      },
      size: {
        default: 'h-11 px-6 py-2 rounded-lg',
        sm: 'h-9 rounded-lg px-4',
        lg: 'h-12 rounded-xl px-8 text-base',
        xl: 'h-14 rounded-xl px-10 text-lg',
        icon: 'h-10 w-10 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
