import Link from 'next/link'
import { requireSession } from '@/lib/session'
import { getActiveEvents } from '@/lib/queries/events'
import { Plus } from 'lucide-react'
import { TeacherEventsList } from '@/components/teacher/TeacherEventsList'

export default async function TeacherEventsPage() {
    const [session, events] = await Promise.all([
        requireSession(),
        getActiveEvents(),
    ])

    return (
        <div className="page">
            <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="page-header__title-group">
                    <h1 className="page-title">All Events</h1>
                    <p className="page-sub">View and manage college events</p>
                </div>
                <Link href="/teacher/events/create" className="btn btn--primary w-full sm:w-auto justify-center">
                    <Plus size={16} /> Create Event
                </Link>
            </div>

            <TeacherEventsList initialEvents={events} currentUserId={session.id} />
        </div>
    )
}

