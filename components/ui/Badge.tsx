import type { ReactNode } from 'react'

interface BadgeProps {
    variant: string
    children: ReactNode
    className?: string
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
    return <span className={`badge badge--${variant} ${className}`}>{children}</span>
}
