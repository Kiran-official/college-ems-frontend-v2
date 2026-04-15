import { notFound, redirect } from 'next/navigation'
import { createSSRClient } from '@/lib/supabase/server'
import { getEventById } from '@/lib/queries/events'
import { getRegistrationsByEvent, getTeamsByEvent } from '@/lib/queries/registrations'
import { getWinnersByEvent } from '@/lib/queries/winners'
import { getCertificatesByEvent, getCertificateStatsByEvent, getTemplatesByEvent } from '@/lib/queries/certificates'
import { getActiveTeachers } from '@/lib/queries/users'
import { LifecycleTracker } from '@/components/events/LifecycleTracker'
import { ManageFaculty } from '@/components/events/ManageFaculty'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { Calendar, Globe, Users, Building } from 'lucide-react'
import { TeacherEventTabs } from './TeacherEventTabs'

interface Props {
    params: Promise<{ id: string }>
}

export default async function TeacherEventDetailPage({ params }: Props) {
    const { id } = await params
    
    // Auth check
    const supabase = await createSSRClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
        redirect('/')
    }

    const event = await getEventById(id)
    if (!event) notFound()

    const isCreator = event.created_by === user.id
    const isFIC = profile?.role === 'teacher' && ((event.faculty_in_charge?.some(f => f.teacher_id === user.id) || false) || isCreator)

    // Archived events check (strict check for non-admins)
    if (!event.is_active && profile?.role !== 'admin') {
        notFound()
    }

    const [registrations, teams, winners, certificates, certStats, templates, activeTeachers] = await Promise.all([
        getRegistrationsByEvent(id),
        getTeamsByEvent(id),
        getWinnersByEvent(id),
        getCertificatesByEvent(id),
        getCertificateStatsByEvent(id),
        getTemplatesByEvent(id),
        getActiveTeachers(),
    ])

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <h1 className="page-title" style={{ marginBottom: 0 }}>{event.title}</h1>
                        {event.status === 'archived' && <Badge variant="archived">Archived</Badge>}
                    </div>
                    {event.description && <p className="page-sub">{event.description}</p>}
                </div>
            </div>

            <div className="glass" style={{ padding: 'clamp(12px, 3vw, 24px)', marginBottom: 24, overflow: 'visible' }}>
                <LifecycleTracker status={event.status} resultsPublished={event.results_published} />
            </div>

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
                isManageable={isFIC || profile?.role === 'admin'} 
            />

            <TeacherEventTabs
                event={event}
                registrations={registrations}
                teams={teams}
                winners={winners}
                certificates={certificates}
                certStats={certStats}
                templates={templates}
                isFIC={isFIC}
                userRole={profile?.role as any}
            />
        </div>
    )
}
