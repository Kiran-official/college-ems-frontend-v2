import Link from 'next/link'
import { getPaginatedEvents } from '@/lib/queries/events'
import { Plus } from 'lucide-react'
import { AdminEventsList } from '@/components/admin/AdminEventsList'

export default async function AdminEventsPage({
    searchParams
}: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const page = Number(params?.page) || 1
    const search = params?.search as string || ''
    const status = params?.status as string || 'all'

    const { data: events, count } = await getPaginatedEvents({
        page,
        limit: 20,
        search,
        status,
    })

    const totalPages = Math.ceil(count / 20)

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <h1 className="page-title">Events Management</h1>
                    <p className="page-sub">Filter and search through all active and archived events</p>
                </div>
                <div className="page-header__actions">
                    <Link href="/admin/events/create" className="btn btn--primary">
                        <Plus size={16} /> Create Event
                    </Link>
                </div>
            </div>

            <AdminEventsList 
                initialEvents={events}
                currentPage={page}
                totalPages={totalPages}
                currentSearch={search}
                currentStatus={status}
            />
        </div>
    )
}

