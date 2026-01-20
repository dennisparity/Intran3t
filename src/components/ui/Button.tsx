import React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff2867] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-[#1c1917] text-white hover:bg-[#292524] shadow-sm',
        primary: 'bg-[#ff2867] text-white hover:bg-[#e6245d] active:bg-[#cc2050] shadow-sm shadow-[#ff2867]/20',
        destructive: 'bg-[#dc2626] text-white hover:bg-[#dc2626]/90 shadow-sm',
        outline: 'border border-[#e7e5e4] bg-transparent text-[#1c1917] hover:bg-[#f5f5f4] hover:border-[#d6d3d1] shadow-sm',
        secondary: 'bg-[#f5f5f4] text-[#1c1917] hover:bg-[#e7e5e4] shadow-sm',
        ghost: 'text-[#1c1917] hover:bg-[#f5f5f4]',
        link: 'text-[#ff2867] underline-offset-4 hover:underline hover:text-[#e6245d]',
        gradient: 'bg-gradient-to-r from-[#ff2867] to-[#e6245d] text-white shadow-lg shadow-[#ff2867]/25 hover:shadow-xl hover:shadow-[#ff2867]/35 hover:scale-[1.02] active:scale-[0.98]',
      },
      size: {
        default: 'h-11 px-6 py-2 rounded-lg',
        sm: 'h-9 rounded-lg px-4 text-sm',
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
