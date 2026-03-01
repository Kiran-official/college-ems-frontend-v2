import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { getEventById } from '@/lib/queries/events'
import { getCategoriesByEvent } from '@/lib/queries/categories'
import { getStudentRegistrationForEvent, getTeamsByEvent } from '@/lib/queries/registrations'
import { getWinnersByEvent } from '@/lib/queries/winners'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { StudentEventActions } from './StudentEventActions'

interface Props {
    params: Promise<{ id: string }>
}

export default async function StudentEventDetailPage({ params }: Props) {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const event = await getEventById(id)
    if (!event) notFound()

    const categories = await getCategoriesByEvent(id)
    const hasCategories = categories.length > 0

    // Get registration status per category or event-level
    const registrationMap = new Map<string, any>()
    if (hasCategories) {
        for (const cat of categories) {
            const reg = await getStudentRegistrationForEvent(user.id, id, cat.id)
            if (reg) registrationMap.set(cat.id, reg)
        }
    } else {
        const reg = await getStudentRegistrationForEvent(user.id, id)
        if (reg) registrationMap.set('__event__', reg)
    }

    // Get teams and winners for display
    const teams = await getTeamsByEvent(id)
    const winners = event.results_published ? await getWinnersByEvent(id) : []

    const isDeadlinePassed = new Date() >= new Date(event.registration_deadline)

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">{event.title}</h1>
                {event.description && <p className="page-sub">{event.description}</p>}
            </div>

            {/* Event info card */}
            <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                    <Badge variant={event.status}>{event.status}</Badge>
                    <Badge variant="info">📅 {format(new Date(event.event_date), 'dd MMM yyyy')}</Badge>
                    {event.status === 'open' && (
                        <Badge variant={isDeadlinePassed ? 'failed' : 'pending'}>
                            Deadline: {format(new Date(event.registration_deadline), 'dd MMM yyyy, hh:mm a')}
                        </Badge>
                    )}
                    {event.department && <Badge variant="info">{event.department.name}</Badge>}
                </div>

                {/* Faculty info (not admin role) */}
                {event.faculty_in_charge && event.faculty_in_charge.length > 0 && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                        <strong>Organised by:</strong>{' '}
                        {event.faculty_in_charge
                            .filter(f => !f.category_id)
                            .map(f => f.teacher?.name)
                            .filter(Boolean)
                            .join(', ')}
                    </div>
                )}
            </div>

            {/* Registration / Team Actions */}
            <StudentEventActions
                event={event}
                categories={categories}
                registrationMap={Object.fromEntries(registrationMap)}
                teams={teams}
                winners={winners}
                studentId={user.id}
                isDeadlinePassed={isDeadlinePassed}
            />
        </div>
    )
}
