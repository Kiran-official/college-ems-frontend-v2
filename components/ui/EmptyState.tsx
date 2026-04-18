import type { ElementType, ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
    icon?: ElementType
    title: string
    subtitle?: string
    action?: ReactNode
}

export function EmptyState({ icon: Icon = Inbox, title, subtitle, action }: EmptyStateProps) {
    return (
        <div className="empty-state">
            <div className="empty-state__icon">
                <Icon size={48} />
            </div>
            <div className="empty-state__title">{title}</div>
            {subtitle && <div className="empty-state__sub">{subtitle}</div>}
            {action}
        </div>
    )
}
