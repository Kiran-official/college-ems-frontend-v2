import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { getTeacherEvents, getEventsByCreator } from '@/lib/queries/events'
import { Plus } from 'lucide-react'
import { TeacherEventsList } from '@/components/teacher/TeacherEventsList'

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
                    <p className="page-sub">Manage your assigned and created events</p>
                </div>
                <Link href="/teacher/events/create" className="btn btn--primary w-full sm:w-auto justify-center">
                    <Plus size={16} /> Create Event
                </Link>
            </div>

            <TeacherEventsList initialEvents={events} />
        </div>
    )
}

