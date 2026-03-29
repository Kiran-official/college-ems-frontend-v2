import type { ReactNode, HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant: string
    children: ReactNode
}

export function Badge({ variant, children, className = '', ...props }: BadgeProps) {
    return <span className={`badge badge--${variant} ${className}`} {...props}>{children}</span>
}
