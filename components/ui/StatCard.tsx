import type { ReactNode, ElementType } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface StatCardProps {
    label: string
    value: string | number
    icon?: ElementType
    imageIcon?: string
    href?: string
}

export function StatCard({ label, value, icon: Icon, imageIcon, href }: StatCardProps) {
    const content = (
        <>
            <div className="stat-card__content">
                <div className="stat-card__value">{value}</div>
                <div className="stat-card__label">{label}</div>
            </div>
            <div className="stat-card__icon">
                {imageIcon ? (
                    <Image 
                        src={imageIcon} 
                        alt={label} 
                        fill 
                        priority
                        sizes="(max-width: 768px) 32px, 48px"
                        style={{ objectFit: 'cover' }} 
                    />
                ) : Icon ? (
                    <Icon size={24} />
                ) : null}
            </div>
            <div className="stat-card__glow" />
        </>
    )

    if (href) {
        return (
            <Link href={href} className="glass stat-card stat-card--clickable" style={{ textDecoration: 'none', color: 'inherit' }}>
                {content}
            </Link>
        )
    }

    return (
        <div className="glass stat-card">
            {content}
        </div>
    )
}
