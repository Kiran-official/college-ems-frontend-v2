import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { getTeacherEvents, getEventsByCreator } from '@/lib/queries/events'
import { EventCard } from '@/components/events/EventCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar, Plus } from 'lucide-react'

export default async function TeacherEventsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    // Get events where teacher is creator OR faculty in charge
    const [createdEvents, ficEvents] = await Promise.all([
        getEventsByCreator(user.id),
        getTeacherEvents(user.id),
    ])

    // Merge and deduplicate
    const eventMap = new Map<string, typeof createdEvents[0]>()
    for (const e of [...createdEvents, ...ficEvents]) {
        eventMap.set(e.id, e)
    }
    const events = Array.from(eventMap.values())

    return (
        <div className="page">
            <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="page-title">My Events</h1>
                    <p className="page-sub">Events you created or are assigned to</p>
                </div>
                <Link href="/teacher/events/create" className="btn btn--primary w-full sm:w-auto justify-center">
                    <Plus size={16} /> Create Event
                </Link>
            </div>

            {events.length === 0 ? (
                <EmptyState icon={Calendar} title="No events yet" subtitle="Create your first event." />
            ) : (
                <div className="card-grid">
                    {events.map(e => (
                        <EventCard key={e.id} event={e} basePath="/teacher/events" />
                    ))}
                </div>
            )}
        </div>
    )
}
