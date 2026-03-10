'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { RegistrationsPanel } from '@/components/events/RegistrationsPanel'
import { AttendancePanel } from '@/components/events/AttendancePanel'
import { WinnersPanel } from '@/components/events/WinnersPanel'
import { CertificatesPanel } from '@/components/events/CertificatesPanel'
import { Button } from '@/components/ui/Button'
import { openEventAction, closeEventAction, publishResultsAction } from '@/lib/actions/eventActions'
import type { Event, IndividualRegistration, Team, Winner, Certificate, CertificateTemplate } from '@/lib/types/db'
import { AlertTriangle } from 'lucide-react'

type Tab = 'registrations' | 'attendance' | 'winners' | 'certificates' | 'actions'

interface EventDetailTabsProps {
    event: Event
    registrations: IndividualRegistration[]
    teams: Team[]
    winners: Winner[]
    certificates: Certificate[]
    certStats: { pending: number; processing: number; generated: number; failed: number }
    templates: CertificateTemplate[]
}

export function EventDetailTabs({ event, registrations, teams, winners, certificates, certStats, templates }: EventDetailTabsProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()

    const validTabs: Tab[] = ['registrations', 'attendance', 'winners', 'certificates', 'actions']
    const queryTab = searchParams.get('tab') as Tab | null
    const tab: Tab = queryTab && validTabs.includes(queryTab) ? queryTab : 'registrations'

    const [actionPending, startAction] = useTransition()

    function setTab(newTab: Tab) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', newTab)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    function handleAction(action: () => Promise<{ success: boolean; error?: string }>) {
        startAction(async () => {
            const result = await action()
            if (result.success) router.refresh()
            else alert(result.error ?? 'Action failed')
        })
    }

    return (
        <div>
            {/* Tab bar */}
            <div className="tab-bar">
                {(['registrations', 'attendance', 'winners', 'certificates', 'actions'] as Tab[]).map(t => {
                    const hasMissingTemplates = t === 'certificates' && (
                        !templates.some(tmp => tmp.certificate_type === 'participation') ||
                        !templates.some(tmp => tmp.certificate_type === 'winner')
                    )

                    return (
                        <button
                            key={t}
                            className={`tab-item ${tab === t ? 'tab-item--active' : ''}`}
                            onClick={() => setTab(t)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                {hasMissingTemplates && <AlertTriangle size={14} color="var(--warning)" />}
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Tab content */}
            <div style={{ marginTop: 20 }}>
                {tab === 'registrations' && (
                    <RegistrationsPanel event={event} registrations={registrations} />
                )}
                {tab === 'attendance' && (
                    <AttendancePanel event={event} registrations={registrations} />
                )}
                {tab === 'winners' && (
                    <WinnersPanel event={event} winners={winners} registrations={registrations} teams={teams} />
                )}
                {tab === 'certificates' && (
                    <CertificatesPanel certificates={certificates} stats={certStats} templates={templates} eventId={event.id} createTemplatePath="/admin/templates/create" />
                )}
                {tab === 'actions' && (
                    <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Event Actions</h3>

                        {event.status === 'draft' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Button variant="primary" onClick={() => handleAction(() => openEventAction(event.id))} loading={actionPending}>
                                    Publish Event
                                </Button>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                    This makes the event visible to students and opens registrations.
                                </span>
                            </div>
                        )}

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
                                <Button variant="primary" onClick={() => handleAction(() => publishResultsAction(event.id))} loading={actionPending}>
                                    Publish Results & Complete Event
                                </Button>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                    Makes winners visible to students and finalizes the event.
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
