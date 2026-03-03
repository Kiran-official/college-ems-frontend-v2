'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
    LayoutDashboard, Users, Calendar, FileText, Award, User,
    ChevronLeft, ChevronRight, LogOut, Menu
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { MobileHeader } from './MobileHeader'

interface SidebarProps {
    role: 'admin' | 'teacher' | 'student'
    userName: string
    userEmail: string
}

const ICONS: Record<string, React.ElementType> = {
    LayoutDashboard, Users, Calendar, FileText, Award, User,
}

const NAV = {
    admin: [
        { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
        { label: 'Users', href: '/admin/users', icon: 'Users' },
        { label: 'Events', href: '/admin/events', icon: 'Calendar' },
        { label: 'Templates', href: '/admin/templates', icon: 'FileText' },
        { label: 'Certificates', href: '/admin/certificates', icon: 'Award' },
    ],
    teacher: [
        { label: 'Dashboard', href: '/teacher', icon: 'LayoutDashboard' },
        { label: 'My Events', href: '/teacher/events', icon: 'Calendar' },
        { label: 'Templates', href: '/teacher/templates', icon: 'FileText' },
        { label: 'Certificates', href: '/teacher/certificates', icon: 'Award' },
    ],
    student: [
        { label: 'Dashboard', href: '/student', icon: 'LayoutDashboard' },
        { label: 'Events', href: '/student/events', icon: 'Calendar' },
        { label: 'Certificates', href: '/student/certificates', icon: 'Award' },
        { label: 'Profile', href: '/student/profile', icon: 'User' },
    ],
}

const LABELS: Record<string, string> = {
    admin: 'Admin Panel',
    teacher: 'Teacher Portal',
    student: 'Student Portal',
}

export default function Sidebar({ role, userName, userEmail }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [open, setOpen] = useState(true)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        setOpen(localStorage.getItem('sicm_sidebar') !== 'false')
    }, [])

    function toggle() {
        const next = !open
        setOpen(next)
        localStorage.setItem('sicm_sidebar', String(next))
    }

    async function logout() {
        await createClient().auth.signOut()
        router.push('/login')
    }

    function isActive(href: string) {
        if (href === `/${role}`) return pathname === href
        return pathname.startsWith(href)
    }

    const initials = userName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    const navItems = NAV[role]

    return (
        <>
            <MobileHeader onMenuClick={() => setMobileOpen(true)} />

            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay ${mobileOpen ? 'sidebar-overlay--show' : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            <aside className={`sidebar ${!open ? 'sidebar--collapsed' : ''} ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
                <div className="sidebar__stripe" />

                {/* Header */}
                <div className="sidebar__header">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/sicm-logo.png"
                        alt="SICM Logo"
                        className="sidebar__logo"
                    />
                    {open && (
                        <div>
                            <div className="sidebar__brand-name">SICM EMS</div>
                            <div className="sidebar__portal-label">{LABELS[role]}</div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="sidebar__nav">
                    {navItems.map((item) => {
                        const Icon = ICONS[item.icon]
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar__link ${isActive(item.href) ? 'sidebar__link--active' : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <Icon className="sidebar__link-icon" size={18} />
                                {open && <span>{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer */}
                <div className="sidebar__footer">
                    {open && (
                        <div className="sidebar__user">
                            <div className="sidebar__avatar">{initials}</div>
                            <div style={{ overflow: 'hidden' }}>
                                <div className="sidebar__user-name">{userName}</div>
                                <div className="sidebar__user-email">{userEmail}</div>
                            </div>
                        </div>
                    )}
                    <ThemeToggle collapsed={!open} />
                    <button className="sidebar__action sidebar__action--danger" onClick={logout}>
                        <LogOut size={18} />
                        {open && <span>Sign Out</span>}
                    </button>
                    <button className="sidebar__toggle" onClick={toggle} aria-label="Toggle sidebar">
                        {open ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                </div>
            </aside>
        </>
    )
}
