import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { getActiveEvents } from '@/lib/queries/events'
import { Plus } from 'lucide-react'
import { TeacherEventsList } from '@/components/teacher/TeacherEventsList'

export default async function TeacherEventsPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    // Get ALL active events
    const events = await getActiveEvents()

    return (
        <div className="page">
            <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="page-title">All Events</h1>
                    <p className="page-sub">View and manage college events</p>
                </div>
                <Link href="/teacher/events/create" className="btn btn--primary w-full sm:w-auto justify-center">
                    <Plus size={16} /> Create Event
                </Link>
            </div>

            <TeacherEventsList initialEvents={events} currentUserId={user.id} />
        </div>
    )
}

