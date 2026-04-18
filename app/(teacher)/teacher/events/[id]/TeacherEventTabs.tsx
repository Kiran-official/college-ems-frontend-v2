'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { RegistrationsPanel } from '@/components/events/RegistrationsPanel'
import { TeamsPanel } from '@/components/events/TeamsPanel'
import { AttendancePanel } from '@/components/events/AttendancePanel'
import { WinnersPanel } from '@/components/events/WinnersPanel'
import { CertificatesPanel } from '@/components/events/CertificatesPanel'
import { PaymentsPanel } from '@/components/events/PaymentsPanel'
import { NotificationPanel } from '@/components/events/NotificationPanel'
import { Button } from '@/components/ui/Button'
import { openEventAction, closeEventAction, publishResultsAction, completeEventAction } from '@/lib/actions/eventActions'
import { syncEventCertificatesAction } from '@/lib/actions/certificateActions'
import type { Event, IndividualRegistration, Team, Winner, Certificate, CertificateTemplate } from '@/lib/types/db'
import { AlertTriangle } from 'lucide-react'
import { EventActionHeader } from '@/components/events/EventActionHeader'

type Tab = 'registrations' | 'teams' | 'payments' | 'attendance' | 'winners' | 'certificates' | 'announcements'

interface TeacherEventTabsProps {
    event: Event
    registrations: IndividualRegistration[]
    teams: Team[]
    winners: Winner[]
    certificates: Certificate[]
    certStats: { pending: number; processing: number; generated: number; failed: number }
    templates: CertificateTemplate[]
    isFIC?: boolean
    userRole?: 'admin' | 'teacher'
}

export function TeacherEventTabs({ 
    event, registrations, teams, winners, certificates, certStats, templates,
    isFIC = false,
    userRole
}: TeacherEventTabsProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    
    const validTabs: Tab[] = ['registrations']
    if (event.participant_type === 'multiple') validTabs.push('teams')
    if (event.is_paid) validTabs.push('payments')
    validTabs.push('attendance', 'winners', 'certificates', 'announcements')

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
            <EventActionHeader event={event} registrations={registrations} isFIC={isFIC} userRole={userRole} />

            <div className="tab-bar overflow-x-auto whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
                {validTabs.map(t => {
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

            <div style={{ marginTop: 24 }}>
                {tab === 'registrations' && <RegistrationsPanel event={event} registrations={registrations} teams={teams} isFIC={isFIC} userRole={userRole} />}
                {tab === 'teams' && <TeamsPanel event={event} teams={teams} registrations={registrations} isFIC={isFIC} userRole={userRole} />}
                {tab === 'payments' && <PaymentsPanel event={event} registrations={registrations} teams={teams} isFIC={isFIC} userRole={userRole} />}
                {tab === 'attendance' && <AttendancePanel event={event} registrations={registrations} isFIC={isFIC} userRole={userRole} />}
                {tab === 'winners' && <WinnersPanel event={event} winners={winners} registrations={registrations} teams={teams} isFIC={isFIC} userRole={userRole} />}
                {tab === 'certificates' && (
                    <CertificatesPanel 
                        certificates={certificates} 
                        stats={certStats} 
                        templates={templates} 
                        eventId={event.id}
                        createTemplatePath="/teacher/templates/create"
                        winners={winners}
                        isFIC={isFIC}
                        userRole={userRole}
                    />
                )}
                {tab === 'announcements' && (
                    <NotificationPanel event={event} isFIC={isFIC} userRole={userRole} />
                )}
            </div>
        </div>
    )
}
