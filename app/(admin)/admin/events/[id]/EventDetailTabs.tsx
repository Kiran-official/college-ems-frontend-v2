'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { RegistrationsPanel } from '@/components/events/RegistrationsPanel'
import { TeamsPanel } from '@/components/events/TeamsPanel'
import { AttendancePanel } from '@/components/events/AttendancePanel'
import { WinnersPanel } from '@/components/events/WinnersPanel'
import { CertificatesPanel } from '@/components/events/CertificatesPanel'
import { Button } from '@/components/ui/Button'
import { openEventAction, closeEventAction, publishResultsAction } from '@/lib/actions/eventActions'
import { syncEventCertificatesAction } from '@/lib/actions/certificateActions'
import type { Event, IndividualRegistration, Team, Winner, Certificate, CertificateTemplate } from '@/lib/types/db'
import { AlertTriangle } from 'lucide-react'

type Tab = 'registrations' | 'teams' | 'attendance' | 'winners' | 'certificates' | 'actions'

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

    const baseTabs: Tab[] = ['registrations']
    if (event.participant_type === 'multiple') baseTabs.push('teams')
    baseTabs.push('attendance', 'winners', 'certificates', 'actions')

    const queryTab = searchParams.get('tab') as Tab | null
    const tab: Tab = queryTab && baseTabs.includes(queryTab) ? queryTab : 'registrations'

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

    const hasParticipationTemplate = templates.some(tmp => tmp.certificate_type === 'participation')
    const hasWinnerTemplate = templates.some(tmp => tmp.certificate_type === 'winner')
    const incompleteAttendanceCount = registrations.filter(r => r.attendance_status === 'registered').length

    return (
        <div>
            {/* Tab bar */}
            <div className="tab-bar overflow-x-auto whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
                {baseTabs.map(t => {
                    const hasMissingTemplates = t === 'certificates' && (
                        (registrations.length > 0 && !hasParticipationTemplate) ||
                        (winners.length > 0 && !hasWinnerTemplate)
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
                    <RegistrationsPanel event={event} registrations={registrations} teams={teams} />
                )}
                {tab === 'teams' && (
                    <TeamsPanel event={event} teams={teams} registrations={registrations} />
                )}
                {tab === 'attendance' && (
                    <AttendancePanel event={event} registrations={registrations} />
                )}
                {tab === 'winners' && (
                    <WinnersPanel event={event} winners={winners} registrations={registrations} teams={teams} />
                )}
                {tab === 'certificates' && (
                    <CertificatesPanel certificates={certificates} stats={certStats} templates={templates} eventId={event.id} createTemplatePath="/admin/templates/create" winners={winners} />
                )}
                {tab === 'actions' && (
                    <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Event Actions</h3>

                        {event.status === 'draft' && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <Button variant="primary" className="w-full sm:w-auto" onClick={() => handleAction(() => openEventAction(event.id))} loading={actionPending}>
                                    Publish Event
                                </Button>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                    This makes the event visible to students and opens registrations.
                                </span>
                            </div>
                        )}

                        {event.status === 'open' && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleAction(() => closeEventAction(event.id))} loading={actionPending}>
                                    Close Registrations
                                </Button>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                    This stops new registrations and enables attendance marking.
                                </span>
                            </div>
                        )}

                        {event.status === 'closed' && !event.results_published && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {incompleteAttendanceCount > 0 && (
                                    <div className="glass" style={{ padding: 16, border: '1px solid var(--warning-bg)', color: 'var(--warning)', fontSize: '0.875rem', fontWeight: 500 }}>
                                        ⚠️ Attendance marking is incomplete ({incompleteAttendanceCount} students left). Please mark all students as Attended or Absent before publishing results.
                                    </div>
                                )}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <Button 
                                        variant="primary" 
                                        className="w-full sm:w-auto"
                                        onClick={() => handleAction(() => publishResultsAction(event.id))} 
                                        loading={actionPending}
                                        disabled={incompleteAttendanceCount > 0}
                                    >
                                        Publish Results & Complete Event
                                    </Button>
                                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                        Makes winners visible to students and finalizes the event.
                                    </span>
                                </div>
                            </div>
                        )}

                        {event.status === 'completed' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ fontSize: '0.9375rem', color: 'var(--success)' }}>
                                    ✓ This event is completed.
                                </div>
                                <div className="glass" style={{ padding: 16, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                    <div style={{ fontSize: '0.875rem', marginBottom: 12 }}>
                                        <strong>Certificate Recovery:</strong> If any participation or winner certificates are missing for this completed event, you can sync them now.
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleAction(async () => {
                                            const res = await syncEventCertificatesAction(event.id)
                                            if (res.success) {
                                                alert(`Successfully synced! Queued ${res.queued} missing certificates.`)
                                            }
                                            return res
                                        })} 
                                        loading={actionPending}
                                    >
                                        Sync Missing Certificates
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
