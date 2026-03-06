import { notFound } from 'next/navigation'
import { getEventById } from '@/lib/queries/events'
import { getCategoriesByEvent } from '@/lib/queries/categories'
import { getRegistrationsByEvent, getTeamsByEvent } from '@/lib/queries/registrations'
import { getWinnersByEvent } from '@/lib/queries/winners'
import { getCertificatesByEvent, getCertificateStatsByEvent } from '@/lib/queries/certificates'
import { LifecycleTracker } from '@/components/events/LifecycleTracker'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { EventDetailTabs } from './EventDetailTabs'

interface Props {
    params: Promise<{ id: string }>
}

export default async function AdminEventDetailPage({ params }: Props) {
    const { id } = await params
    const event = await getEventById(id)
    if (!event) notFound()

    const [categories, registrations, teams, winners, certificates, certStats] = await Promise.all([
        getCategoriesByEvent(id),
        getRegistrationsByEvent(id),
        getTeamsByEvent(id),
        getWinnersByEvent(id),
        getCertificatesByEvent(id),
        getCertificateStatsByEvent(id),
    ])

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">{event.title}</h1>
                {event.description && <p className="page-sub">{event.description}</p>}
            </div>

            {/* Lifecycle */}
            <div className="glass" style={{ padding: 24, marginBottom: 24, overflow: 'auto' }}>
                <LifecycleTracker status={event.status} resultsPublished={event.results_published} />
            </div>

            {/* Meta strip */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                <Badge variant={event.status}>{event.status}</Badge>
                <Badge variant="info">📅 {format(new Date(event.event_date), 'dd/MM/yyyy, hh:mm a')}</Badge>
                <Badge variant={event.visibility === 'public_all' ? 'info' : event.visibility === 'internal_only' ? 'internal' : 'external'}>
                    {event.visibility === 'public_all' ? 'Open to All' : event.visibility === 'internal_only' ? 'Internal Only' : 'External Only'}
                </Badge>
                <Badge variant="processing">
                    {registrations.length} Registrations
                </Badge>
                {event.department && <Badge variant="info">{event.department.name}</Badge>}
            </div>

            {/* Faculty strip */}
            {event.faculty_in_charge && event.faculty_in_charge.length > 0 && (
                <div className="faculty-pills" style={{ marginBottom: 24 }}>
                    {event.faculty_in_charge.filter(f => !f.category_id).map(f => (
                        <span key={f.teacher_id} className="faculty-pill">{f.teacher?.name}</span>
                    ))}
                </div>
            )}

            <EventDetailTabs
                event={event}
                categories={categories}
                registrations={registrations}
                teams={teams}
                winners={winners}
                certificates={certificates}
                certStats={certStats}
            />
        </div>
    )
}
