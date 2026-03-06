import { notFound } from 'next/navigation'
import { getEventById } from '@/lib/queries/events'
import { getCategoriesByEvent } from '@/lib/queries/categories'
import { getRegistrationsByEvent, getTeamsByEvent } from '@/lib/queries/registrations'
import { getWinnersByEvent } from '@/lib/queries/winners'
import { getCertificatesByEvent, getCertificateStatsByEvent } from '@/lib/queries/certificates'
import { LifecycleTracker } from '@/components/events/LifecycleTracker'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { TeacherEventTabs } from './TeacherEventTabs'

interface Props {
    params: Promise<{ id: string }>
}

export default async function TeacherEventDetailPage({ params }: Props) {
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

            <div className="glass" style={{ padding: 24, marginBottom: 24, overflow: 'auto' }}>
                <LifecycleTracker status={event.status} resultsPublished={event.results_published} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}>
                <Badge variant={event.status}>{event.status}</Badge>
                <Badge variant="info">📅 {format(new Date(event.event_date), 'dd/MM/yyyy, hh:mm a')}</Badge>
                <Badge variant="processing">{registrations.length} Registrations</Badge>
            </div>

            <TeacherEventTabs
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
