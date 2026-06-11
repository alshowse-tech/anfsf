// [generated]
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  // TODO: implement button variants
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium',
        className
      )}
      {...props}
    />
  )
}
