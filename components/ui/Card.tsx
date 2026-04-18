import type { ReactNode } from 'react'

interface CardProps {
    children: ReactNode
    className?: string
}

export function Card({ children, className = '' }: CardProps) {
    return (
        <div className={`glass ${className}`} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            {children}
        </div>
    )
}
