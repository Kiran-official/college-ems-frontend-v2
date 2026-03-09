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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/assets/logo.png" alt="SICM Logo" width={28} height={28} style={{ objectFit: 'contain' }} />
                <span className="mobile-header__wordmark">SICM EMS</span>
            </div>
            <div style={{ width: 22 }} /> {/* spacer for centering */}
        </header>
    )
}
