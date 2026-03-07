import type { ReactNode, ElementType } from 'react'

interface StatCardProps {
    label: string
    value: string | number
    icon?: ElementType
    imageIcon?: string
}

export function StatCard({ label, value, icon: Icon, imageIcon }: StatCardProps) {
    return (
        <div className="glass stat-card">
            <div className="stat-card__icon">
                {imageIcon ? (
                    <img src={imageIcon} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : Icon ? (
                    <Icon size={24} />
                ) : null}
            </div>
            <div className="stat-card__value">{value}</div>
            <div className="stat-card__label">{label}</div>
        </div>
    )
}
