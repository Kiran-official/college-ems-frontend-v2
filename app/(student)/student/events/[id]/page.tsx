import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { getEventById } from '@/lib/queries/events'
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

    // Get registration status
    const registration = await getStudentRegistrationForEvent(user.id, id)

    // Get teams and winners for display
    const teams = await getTeamsByEvent(id)
    const winners = event.results_published ? await getWinnersByEvent(id) : []

    const isDeadlinePassed = new Date() >= new Date(event.registration_deadline)

    return (
        <div className="page">
            <div className="mesh-bg" style={{ pointerEvents: 'none' }}>
                <div className="mesh-circle" style={{ width: '800px', height: '800px', top: '-100px', right: '-200px', background: 'var(--accent)', opacity: 0.3 }} />
                <div className="mesh-circle" style={{ width: '600px', height: '600px', bottom: '-200px', left: '-100px', background: 'var(--accent-secondary)', animationDelay: '-8s', opacity: 0.2 }} />
            </div>

            <div className="page-header">
                <div className="page-header__title-group">
                    {event.department && (
                        <div style={{ marginBottom: 12 }}>
                            <Badge variant="info">{event.department.name}</Badge>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <h1 className="page-title" style={{ marginBottom: 0 }}>{event.title}</h1>
                        <Badge variant={event.status} style={{ padding: '6px 16px', fontSize: '0.875rem' }}>{event.status}</Badge>
                    </div>
                    {event.description && (
                        <p className="page-sub" style={{ maxWidth: 800, marginTop: 12 }}>
                            {event.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Event info card */}
            <div className="glass-premium" style={{ marginBottom: 40, padding: 32 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
                    <div className="bento-item__content">
                        <div className="stat-card__label" style={{ marginBottom: 8 }}>Event Date</div>
                        <div className="stat-card__value" style={{ fontSize: '1.25rem' }}>
                            {format(new Date(event.event_date), 'dd MMM yyyy, hh:mm a')}
                        </div>
                    </div>
                    {event.status === 'open' && (
                        <div className="bento-item__content">
                            <div className="stat-card__label" style={{ marginBottom: 8 }}>Registration Deadline</div>
                            <div className="stat-card__value" style={{ fontSize: '1.25rem', color: isDeadlinePassed ? 'var(--error)' : 'var(--text-primary)' }}>
                                {format(new Date(event.registration_deadline), 'dd MMM yyyy, hh:mm a')}
                            </div>
                        </div>
                    )}
                    <div className="bento-item__content">
                        <div className="stat-card__label" style={{ marginBottom: 8 }}>Participation</div>
                        <div className="stat-card__value" style={{ fontSize: '1.25rem' }}>
                            {event.participant_type === 'single' ? (
                                'Individual'
                            ) : (
                                <>Team <span style={{ fontSize: '0.875rem', opacity: 0.8 }}>(Max {event.team_size})</span></>
                            )}
                        </div>
                    </div>
                    {event.is_paid && event.registration_fee && (
                        <div className="bento-item__content">
                            <div className="stat-card__label" style={{ marginBottom: 8 }}>Registration Fee</div>
                            <div className="stat-card__value" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                                ₹{event.registration_fee.toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>
                <div className="stat-card__glow" />
            </div>

            {/* Registration / Team Actions */}
            <section>
                <div className="section-header" style={{ marginBottom: 24 }}>
                    <h2 className="section-title">Registration & Participation</h2>
                </div>
                <StudentEventActions
                    event={event}
                    registration={registration}
                    teams={teams}
                    winners={winners}
                    studentId={user.id}
                    isDeadlinePassed={isDeadlinePassed}
                />
            </section>
        </div>
    )
}
