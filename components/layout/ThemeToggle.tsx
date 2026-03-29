'use client'
import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
    collapsed?: boolean
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')

    useEffect(() => {
        const saved = localStorage.getItem('sicm_theme') as 'dark' | 'light' | null
        const t = saved ?? 'dark'
        setTheme(t)
        document.documentElement.setAttribute('data-theme', t)
    }, [])

    function toggle() {
        const next = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
        document.documentElement.setAttribute('data-theme', next)
        localStorage.setItem('sicm_theme', next)
    }

    return (
        <button className="sidebar__action" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
    )
}
