import Link from 'next/link'
import { getAllEvents } from '@/lib/queries/events'
import { Plus } from 'lucide-react'
import { AdminEventsList } from '@/components/admin/AdminEventsList'

export default async function AdminEventsPage() {
    const events = await getAllEvents()

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

            <AdminEventsList initialEvents={events} />
        </div>
    )
}

