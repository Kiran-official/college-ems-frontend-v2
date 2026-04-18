import { notFound } from 'next/navigation'
import { getEventById } from '@/lib/queries/events'
import { getRegistrationsByEvent, getTeamsByEvent } from '@/lib/queries/registrations'
import { getWinnersByEvent } from '@/lib/queries/winners'
import { getCertificatesByEvent, getCertificateStatsByEvent, getTemplatesByEvent } from '@/lib/queries/certificates'
import { getCurrentUser, getActiveTeachers } from '@/lib/queries/users'
import { LifecycleTracker } from '@/components/events/LifecycleTracker'
import { ManageFaculty } from '@/components/events/ManageFaculty'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { Calendar, Globe, Users, Building } from 'lucide-react'
import { ArchiveRestoreButtons } from '../ArchiveRestoreButtons'
import { DeleteEventButton } from '../DeleteEventButton'
import { EventDetailTabs } from './EventDetailTabs'

interface Props {
    params: Promise<{ id: string }>
}

export default async function AdminEventDetailPage({ params }: Props) {
    const { id } = await params
    const event = await getEventById(id)
    if (!event) notFound()

    const currentUser = await getCurrentUser()
    const [registrations, teams, winners, certificates, certStats, templates, activeTeachers] = await Promise.all([
        getRegistrationsByEvent(id),
        getTeamsByEvent(id),
        getWinnersByEvent(id),
        getCertificatesByEvent(id),
        getCertificateStatsByEvent(id),
        getTemplatesByEvent(id),
        getActiveTeachers(),
    ])

    const isFIC = event.faculty_in_charge?.some(f => f.teacher_id === currentUser?.id) || false
    const userRole = currentUser?.role || 'student'

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                <div className="page-header__title-group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <h1 className="page-title" style={{ marginBottom: 0 }}>{event.title}</h1>
                        {event.status === 'archived' && <Badge variant="archived">Archived</Badge>}
                    </div>
                    {event.description && <p className="page-sub">{event.description}</p>}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <ArchiveRestoreButtons eventId={event.id} isActive={event.is_active} />
                    <DeleteEventButton eventId={event.id} eventTitle={event.title} />
                </div>
            </div>

            {/* Lifecycle */}
            <div className="glass" style={{ padding: 'clamp(12px, 3vw, 24px)', marginBottom: 24, overflow: 'visible' }}>
                <LifecycleTracker status={event.status} resultsPublished={event.results_published} />
            </div>

            {/* Meta strip */}
            <div className="glass" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-evenly', gap: 12, marginBottom: 24, padding: '12px 16px', borderRadius: 'var(--r-lg)', width: '100%' }}>
                <Badge variant={event.status}>{event.status}</Badge>
                
                <div style={{ width: 1, height: 16, background: 'var(--border)' }} className="hidden sm:block"></div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    <Calendar size={14} color="var(--text-tertiary)" />
                    {format(new Date(event.event_date), 'dd/MM/yyyy, hh:mm a')}
                </span>
                
                <div style={{ width: 1, height: 16, background: 'var(--border)' }} className="hidden sm:block"></div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    <Globe size={14} color="var(--text-tertiary)" />
                    {event.visibility === 'public_all' ? 'Open to All' : event.visibility === 'internal_only' ? 'Internal Only' : 'External Only'}
                </span>
                
                <div style={{ width: 1, height: 16, background: 'var(--border)' }} className="hidden sm:block"></div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    <Users size={14} color="var(--text-tertiary)" />
                    {registrations.length} {registrations.length === 1 ? 'Registration' : 'Registrations'}
                </span>
                
                {event.forum && (
                    <>
                        <div style={{ width: 1, height: 16, background: 'var(--border)' }} className="hidden sm:block"></div>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            <Building size={14} color="var(--text-tertiary)" />
                            {event.forum}
                        </span>
                    </>
                )}
            </div>

            {/* Faculty strip */}
            <ManageFaculty 
                eventId={event.id}
                currentFaculty={event.faculty_in_charge || []}
                allTeachers={activeTeachers}
                isManageable={true} 
            />

            <EventDetailTabs
                event={event}
                registrations={registrations}
                teams={teams}
                winners={winners}
                certificates={certificates}
                certStats={certStats}
                templates={templates}
                isFIC={isFIC}
                userRole={userRole}
            />
        </div>
    )
}
