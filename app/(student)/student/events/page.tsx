import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { getUpcomingEvents, getClosedEvents, getCompletedEvents } from '@/lib/queries/events'
import { getRegistrationsByStudent } from '@/lib/queries/registrations'
import { StudentEventsList } from '@/components/student/StudentEventsList'

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

            <StudentEventsList 
                upcoming={visibleUpcoming} 
                closed={visibleClosed} 
                completed={visibleCompleted} 
                registeredIds={registeredIds} 
            />
        </div>
    )
}
