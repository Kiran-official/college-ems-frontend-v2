'use client'
import { Menu } from 'lucide-react'
import Image from 'next/image'

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
                <Image 
                    src="/assets/logo.png" 
                    alt="SICM Logo" 
                    width={28} 
                    height={28} 
                    priority 
                    style={{ objectFit: 'contain', borderRadius: '50%', border: '2px solid white', background: 'white', padding: '2px' }} 
                />
                <span className="mobile-header__wordmark">SICM EMS</span>
            </div>
            <div style={{ width: 22 }} /> {/* spacer for centering */}
        </header>
    )
}
