import React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1917] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-[#1c1917] text-white hover:bg-[#292524] shadow-sm dark:bg-[#f5f5f4] dark:text-[#1c1917] dark:hover:bg-[#e7e5e4]',
        primary: 'bg-[#1c1917] text-white hover:bg-[#292524] shadow-sm',
        destructive: 'bg-[#dc2626] text-white hover:bg-[#dc2626]/90 shadow-sm',
        outline: 'border border-[#e7e5e4] bg-transparent text-[#1c1917] hover:bg-[#f5f5f4] hover:border-[#d6d3d1] shadow-sm dark:border-white/10 dark:text-[#fafaf9] dark:hover:bg-[#292524] dark:hover:border-white/20',
        secondary: 'bg-[#f5f5f4] text-[#1c1917] hover:bg-[#e7e5e4] shadow-sm dark:bg-[#292524] dark:text-[#fafaf9] dark:hover:bg-[#44403c]',
        ghost: 'text-[#1c1917] hover:bg-[#f5f5f4] dark:text-[#fafaf9] dark:hover:bg-[#292524]',
        link: 'text-[#1c1917] underline-offset-4 hover:underline hover:text-[#292524]',
        gradient: 'bg-[#1c1917] text-white hover:bg-[#292524] shadow-sm',
      },
      size: {
        default: 'h-11 px-6 py-2 rounded-xl',
        sm: 'h-9 rounded-xl px-4 text-sm',
        lg: 'h-12 rounded-xl px-8 text-base',
        xl: 'h-14 rounded-xl px-10 text-lg font-semibold',
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
