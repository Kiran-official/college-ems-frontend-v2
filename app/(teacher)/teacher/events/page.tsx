import Link from 'next/link'
import { requireSession } from '@/lib/session'
import { getPaginatedEvents } from '@/lib/queries/events'
import { Plus } from 'lucide-react'
import { TeacherEventsList } from '@/components/teacher/TeacherEventsList'

export default async function TeacherEventsPage({
    searchParams
}: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const page = Number(params?.page) || 1
    const search = params?.search as string || ''
    const status = params?.status as string || 'all'
    const myEvents = params?.myEvents === 'true'

    const session = await requireSession()

    const { data: events, count } = await getPaginatedEvents({
        page,
        limit: 20,
        search,
        status,
        activeOnly: true,
        teacherIdOnly: myEvents ? session.id : undefined,
    })

    const totalPages = Math.ceil(count / 20)

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

            <TeacherEventsList 
                initialEvents={events} 
                currentUserId={session.id}
                currentPage={page}
                totalPages={totalPages}
                currentSearch={search}
                currentStatus={status}
                currentMyEvents={myEvents}
            />
        </div>
    )
}

