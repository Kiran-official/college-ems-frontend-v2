'use client'

import { useState, useTransition } from 'react'
import { RegistrationsPanel } from '@/components/events/RegistrationsPanel'
import { AttendancePanel } from '@/components/events/AttendancePanel'
import { WinnersPanel } from '@/components/events/WinnersPanel'
import { CertificatesPanel } from '@/components/events/CertificatesPanel'
import { Button } from '@/components/ui/Button'
import { closeEventAction, publishResultsAction, completeEventAction } from '@/lib/actions/eventActions'
import type { Event, EventCategory, IndividualRegistration, Team, Winner, Certificate } from '@/lib/types/db'

type Tab = 'registrations' | 'attendance' | 'winners' | 'certificates' | 'actions'

interface EventDetailTabsProps {
    event: Event
    categories: EventCategory[]
    registrations: IndividualRegistration[]
    teams: Team[]
    winners: Winner[]
    certificates: Certificate[]
    certStats: { pending: number; processing: number; generated: number; failed: number }
}

export function EventDetailTabs({ event, categories, registrations, teams, winners, certificates, certStats }: EventDetailTabsProps) {
    const [tab, setTab] = useState<Tab>('registrations')
    const [actionPending, startAction] = useTransition()

    function handleAction(action: () => Promise<{ success: boolean; error?: string }>) {
        startAction(async () => {
            const result = await action()
            if (result.success) window.location.reload()
            else alert(result.error ?? 'Action failed')
        })
    }

    return (
        <div>
            {/* Tab bar */}
            <div className="tab-bar">
                {(['registrations', 'attendance', 'winners', 'certificates', 'actions'] as Tab[]).map(t => (
                    <button
                        key={t}
                        className={`tab-item ${tab === t ? 'tab-item--active' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div style={{ marginTop: 20 }}>
                {tab === 'registrations' && (
                    <RegistrationsPanel event={event} registrations={registrations} categories={categories} />
                )}
                {tab === 'attendance' && (
                    <AttendancePanel event={event} registrations={registrations} categories={categories} />
                )}
                {tab === 'winners' && (
                    <WinnersPanel event={event} winners={winners} registrations={registrations} teams={teams} categories={categories} />
                )}
                {tab === 'certificates' && (
                    <CertificatesPanel certificates={certificates} stats={certStats} />
                )}
                {tab === 'actions' && (
                    <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Event Actions</h3>

                        {event.status === 'open' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Button variant="outline" onClick={() => handleAction(() => closeEventAction(event.id))} loading={actionPending}>
                                    Close Registrations
                                </Button>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                    This stops new registrations and enables attendance marking.
                                </span>
                            </div>
                        )}

                        {event.status === 'closed' && !event.results_published && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Button variant="outline" onClick={() => handleAction(() => publishResultsAction(event.id))} loading={actionPending}>
                                    Publish Results
                                </Button>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                    Makes winners visible to students.
                                </span>
                            </div>
                        )}

                        {event.status === 'closed' && event.results_published && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Button variant="primary" onClick={() => handleAction(() => completeEventAction(event.id))} loading={actionPending}>
                                    Complete Event
                                </Button>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                    Finalizes the event. Attendance and winners become permanent.
                                </span>
                            </div>
                        )}

                        {event.status === 'completed' && (
                            <div style={{ fontSize: '0.9375rem', color: 'var(--success)' }}>
                                ✓ This event is completed. No further actions available.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
