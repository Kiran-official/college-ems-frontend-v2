'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { RegistrationsPanel } from '@/components/events/RegistrationsPanel'
import { AttendancePanel } from '@/components/events/AttendancePanel'
import { WinnersPanel } from '@/components/events/WinnersPanel'
import { CertificatesPanel } from '@/components/events/CertificatesPanel'
import { Button } from '@/components/ui/Button'
import { openEventAction, closeEventAction, publishResultsAction, completeEventAction } from '@/lib/actions/eventActions'
import { syncEventCertificatesAction } from '@/lib/actions/certificateActions'
import type { Event, IndividualRegistration, Team, Winner, Certificate, CertificateTemplate } from '@/lib/types/db'
import { AlertTriangle } from 'lucide-react'

type Tab = 'registrations' | 'attendance' | 'winners' | 'certificates' | 'actions'

interface TeacherEventTabsProps {
    event: Event
    registrations: IndividualRegistration[]
    teams: Team[]
    winners: Winner[]
    certificates: Certificate[]
    certStats: { pending: number; processing: number; generated: number; failed: number }
    templates: CertificateTemplate[]
}

export function TeacherEventTabs({ event, registrations, teams, winners, certificates, certStats, templates }: TeacherEventTabsProps) {
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

    const hasParticipationTemplate = templates.some(tmp => tmp.certificate_type === 'participation')
    const hasWinnerTemplate = templates.some(tmp => tmp.certificate_type === 'winner')
    const incompleteAttendanceCount = registrations.filter(r => r.attendance_status === 'registered').length

    return (
        <div>
            <div className="tab-bar">
                {(['registrations', 'attendance', 'winners', 'certificates', 'actions'] as Tab[]).map(t => {
                    const hasMissingTemplates = t === 'certificates' && (
                        (registrations.length > 0 && !hasParticipationTemplate) ||
                        (winners.length > 0 && !hasWinnerTemplate)
                    )

                    return (
                        <button key={t} className={`tab-item ${tab === t ? 'tab-item--active' : ''}`} onClick={() => setTab(t)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                {hasMissingTemplates && <AlertTriangle size={14} color="var(--warning)" />}
                            </div>
                        </button>
                    )
                })}
            </div>

            <div style={{ marginTop: 20 }}>
                {tab === 'registrations' && <RegistrationsPanel event={event} registrations={registrations} />}
                {tab === 'attendance' && <AttendancePanel event={event} registrations={registrations} />}
                {tab === 'winners' && <WinnersPanel event={event} winners={winners} registrations={registrations} teams={teams} />}
                {tab === 'certificates' && (
                    <CertificatesPanel 
                        certificates={certificates} 
                        stats={certStats} 
                        templates={templates} 
                        eventId={event.id}
                        createTemplatePath="/teacher/templates/create"
                        winners={winners}
                    />
                )}
                {tab === 'actions' && (
                    <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Event Actions</h3>

                        {event.status === 'open' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Button variant="outline" onClick={() => handleAction(() => closeEventAction(event.id))} loading={actionPending}>Close Registrations</Button>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Stop registrations and enable attendance marking.</span>
                            </div>
                        )}
                        {event.status === 'closed' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {incompleteAttendanceCount > 0 && (
                                    <div className="glass" style={{ padding: 16, border: '1px solid var(--warning-bg)', color: 'var(--warning)', fontSize: '0.875rem', fontWeight: 500 }}>
                                        ⚠️ Attendance marking is incomplete ({incompleteAttendanceCount} students left). Please mark all students as Attended or Absent before finalizing.
                                    </div>
                                )}
                                {!event.results_published && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Button 
                                            variant="outline" 
                                            onClick={() => handleAction(() => publishResultsAction(event.id))} 
                                            loading={actionPending}
                                            disabled={incompleteAttendanceCount > 0}
                                        >
                                            Publish Results
                                        </Button>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Make winners visible to students.</span>
                                    </div>
                                )}
                                {event.results_published && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <Button 
                                            variant="primary" 
                                            onClick={() => handleAction(() => completeEventAction(event.id))} 
                                            loading={actionPending}
                                            disabled={incompleteAttendanceCount > 0}
                                        >
                                            Complete Event
                                        </Button>
                                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>Finalize everything.</span>
                                    </div>
                                )}
                            </div>
                        )}
                        {event.status === 'completed' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ fontSize: '0.9375rem', color: 'var(--success)' }}>
                                    ✓ This event is completed.
                                </div>
                                <div className="glass" style={{ padding: 16, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                    <div style={{ fontSize: '0.875rem', marginBottom: 12 }}>
                                        <strong>Certificate Recovery:</strong> If any participation or winner certificates are missing, you can sync them now.
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
