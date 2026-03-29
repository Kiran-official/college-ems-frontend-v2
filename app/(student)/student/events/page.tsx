import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { getUpcomingEvents, getClosedEvents, getCompletedEvents } from '@/lib/queries/events'
import { getRegistrationsByStudent } from '@/lib/queries/registrations'
import { EventCard } from '@/components/events/EventCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar } from 'lucide-react'

export default async function StudentEventsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const [upcoming, closed, completed, myRegs] = await Promise.all([
        getUpcomingEvents(),
        getClosedEvents(),
        getCompletedEvents(),
        getRegistrationsByStudent(user.id),
    ])

    const registeredIds = new Set(myRegs.map(r => r.event_id))

    // Filter by visibility
    const isExternal = user.student_type === 'external'
    function isVisible(event: typeof upcoming[0]) {
        if (event.visibility === 'public_all') return true
        if (event.visibility === 'internal_only' && !isExternal) return true
        if (event.visibility === 'external_only' && isExternal) return true
        return false
    }

    const visibleUpcoming = upcoming.filter(isVisible)
    const visibleClosed = closed.filter(isVisible)
    const visibleCompleted = completed.filter(isVisible)

    return (
        <div className="page">
            <div className="mesh-bg" style={{ pointerEvents: 'none' }}>
                <div className="mesh-circle" style={{ width: '800px', height: '800px', top: '-100px', left: '-200px', background: 'var(--accent)', opacity: 0.3 }} />
                <div className="mesh-circle" style={{ width: '600px', height: '600px', bottom: '-200px', right: '-100px', background: 'var(--accent-secondary)', animationDelay: '-8s', opacity: 0.2 }} />
            </div>

            <div className="page-header">
                <div className="page-header__title-group">
                    <h1 className="page-title">Events</h1>
                    <p className="page-sub">Discover, register, and track events</p>
                </div>
            </div>

            {/* Section 1: Open for Registration */}
            <section style={{ marginBottom: 64 }}>
                <div className="section-header">
                    <div className="status-indicator status-indicator--open" />
                    <h2 className="section-title">Open for Registration</h2>
                </div>
                {visibleUpcoming.length === 0 ? (
                    <EmptyState icon={Calendar} title="No open events" subtitle="Check back later for new events." />
                ) : (
                    <div className="event-card-grid">
                        {visibleUpcoming.map(e => (
                            <EventCard key={e.id} event={e} basePath="/student/events" isRegistered={registeredIds.has(e.id)} />
                        ))}
                    </div>
                )}
            </section>

            {/* Section 2: Ongoing / Closed */}
            <section style={{ marginBottom: 64 }}>
                <div className="section-header">
                    <div className="status-indicator status-indicator--closed" />
                    <h2 className="section-title">Ongoing / Closed</h2>
                </div>
                {visibleClosed.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-glass)', borderRadius: 'var(--r-xl)', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        No ongoing events right now.
                    </div>
                ) : (
                    <div className="event-card-grid">
                        {visibleClosed.map(e => (
                            <EventCard key={e.id} event={e} basePath="/student/events" isRegistered={registeredIds.has(e.id)} />
                        ))}
                    </div>
                )}
            </section>

            {/* Section 3: Completed */}
            <section>
                <div className="section-header">
                    <div className="status-indicator status-indicator--completed" />
                    <h2 className="section-title">Completed</h2>
                </div>
                {visibleCompleted.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-glass)', borderRadius: 'var(--r-xl)', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        No completed events yet.
                    </div>
                ) : (
                    <div className="event-card-grid">
                        {visibleCompleted.map(e => (
                            <EventCard key={e.id} event={e} basePath="/student/events" isRegistered={registeredIds.has(e.id)} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
