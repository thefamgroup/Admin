import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        green: 'border-green-500/20 bg-green-500/10 text-green-500',
        blue: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
        amber: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
        purple: 'border-purple-500/20 bg-purple-500/10 text-purple-400',
        red: 'border-red-500/20 bg-red-500/10 text-red-400',
        emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
        grey: 'border-border bg-secondary text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
