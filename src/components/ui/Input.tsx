import React from 'react'
import { cn } from '../../lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-lg border border-[#e7e5e4] bg-white px-4 py-2',
          'text-[#1c1917] text-sm placeholder:text-[#a8a29e]',
          'focus:outline-none focus:ring-2 focus:ring-[#ff2867] focus:ring-offset-1 focus:border-[#ff2867]',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#f5f5f4]',
          'transition-all duration-200',
          'dark:border-white/10 dark:bg-[#1c1917] dark:text-[#fafaf9] dark:placeholder:text-[#78716c]',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export function Label({
  children,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-sm font-medium text-[#1c1917] block mb-1.5',
        'dark:text-[#fafaf9]',
        className
      )}
      {...props}
    >
      {children}
    </label>
  )
}
