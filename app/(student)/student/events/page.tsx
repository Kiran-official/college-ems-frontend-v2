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
            <div className="page-header">
                <h1 className="page-title">Events</h1>
                <p className="page-sub">Discover, register, and track events</p>
            </div>

            {/* Section 1: Open for Registration */}
            <section style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
                    🟢 Open for Registration
                </h2>
                {visibleUpcoming.length === 0 ? (
                    <EmptyState icon={Calendar} title="No open events" subtitle="Check back later for new events." />
                ) : (
                    <div className="card-grid">
                        {visibleUpcoming.map(e => (
                            <div key={e.id} style={{ position: 'relative' }}>
                                {registeredIds.has(e.id) && (
                                    <span style={{
                                        position: 'absolute', top: 12, right: 12, zIndex: 2,
                                        padding: '4px 10px', borderRadius: 'var(--r-pill)',
                                        background: 'var(--success-bg)', color: 'var(--success)',
                                        fontSize: '0.75rem', fontWeight: 600,
                                    }}>✓ Registered</span>
                                )}
                                <EventCard event={e} basePath="/student/events" />
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Section 2: Ongoing / Closed */}
            <section style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
                    🔴 Ongoing / Closed
                </h2>
                {visibleClosed.length === 0 ? (
                    <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        No ongoing events right now.
                    </div>
                ) : (
                    <div className="card-grid">
                        {visibleClosed.map(e => (
                            <EventCard key={e.id} event={e} basePath="/student/events" />
                        ))}
                    </div>
                )}
            </section>

            {/* Section 3: Completed */}
            <section>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
                    ✅ Completed
                </h2>
                {visibleCompleted.length === 0 ? (
                    <div style={{ padding: 20, color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        No completed events yet.
                    </div>
                ) : (
                    <div className="card-grid">
                        {visibleCompleted.map(e => (
                            <EventCard key={e.id} event={e} basePath="/student/events" />
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
