'use client'

import { useState } from 'react'
import { RegistrationsPanel } from './RegistrationsPanel'
import { AttendancePanel } from './AttendancePanel'
import { WinnersPanel } from './WinnersPanel'
import { CertificatesPanel } from './CertificatesPanel'
import type { Event, EventCategory, IndividualRegistration, Team, Winner, Certificate } from '@/lib/types/db'

interface CategoryManagementBlockProps {
    event: Event
    category: EventCategory
    registrations: IndividualRegistration[]
    teams: Team[]
    winners: Winner[]
    certificates: Certificate[]
}

export function CategoryManagementBlock({ event, category, registrations, teams, winners, certificates }: CategoryManagementBlockProps) {
    const [subTab, setSubTab] = useState<'registrations' | 'attendance' | 'winners' | 'certificates'>('registrations')

    return (
        <div className="glass-premium" style={{ marginBottom: 32, overflow: 'hidden' }}>
            <div className="category-block-header" style={{
                padding: '16px 24px',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16
            }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>{category.category_name}</h3>
                    {category.description && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{category.description}</p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-void)', padding: 4, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                    {(['registrations', 'attendance', 'winners', 'certificates'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setSubTab(t)}
                            style={{
                                padding: '6px 12px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                borderRadius: 'var(--r-sm)',
                                border: 'none',
                                cursor: 'pointer',
                                background: subTab === t ? 'var(--accent)' : 'transparent',
                                color: subTab === t ? 'var(--bg-void)' : 'var(--text-secondary)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ padding: 24 }}>
                {subTab === 'registrations' && (
                    <RegistrationsPanel
                        event={event}
                        registrations={registrations}
                        categories={[category]}
                        categoryId={category.id}
                    />
                )}
                {subTab === 'attendance' && (
                    <AttendancePanel
                        event={event}
                        registrations={registrations}
                        categories={[category]}
                        categoryId={category.id}
                    />
                )}
                {subTab === 'winners' && (
                    <WinnersPanel
                        event={event}
                        winners={winners}
                        registrations={registrations}
                        teams={teams}
                        categories={[category]}
                        categoryId={category.id}
                    />
                )}
                {subTab === 'certificates' && (
                    <CertificatesPanel
                        certificates={certificates}
                        stats={{ pending: 0, processing: 0, generated: 0, failed: 0 }} // stats will be recalculated inside panel
                        categoryId={category.id}
                    />
                )}
            </div>
        </div>
    )
}
