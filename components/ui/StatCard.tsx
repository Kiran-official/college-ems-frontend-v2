import type { ReactNode, ElementType } from 'react'

interface StatCardProps {
    label: string
    value: string | number
    icon: ElementType
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
    return (
        <div className="glass stat-card">
            <div className="stat-card__icon">
                <Icon size={22} />
            </div>
            <div className="stat-card__value">{value}</div>
            <div className="stat-card__label">{label}</div>
        </div>
    )
}
