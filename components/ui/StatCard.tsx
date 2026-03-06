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
                    <img src={imageIcon} alt={label} style={{ width: 44, height: 44, objectFit: 'contain' }} />
                ) : Icon ? (
                    <Icon size={22} />
                ) : null}
            </div>
            <div className="stat-card__value">{value}</div>
            <div className="stat-card__label">{label}</div>
        </div>
    )
}
