'use client'
import { Menu } from 'lucide-react'

interface MobileHeaderProps {
    onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
    return (
        <header className="mobile-header">
            <button onClick={onMenuClick} aria-label="Open menu">
                <Menu size={22} />
            </button>
            <span className="mobile-header__wordmark">SICM EMS</span>
            <div style={{ width: 22 }} /> {/* spacer for centering */}
        </header>
    )
}
