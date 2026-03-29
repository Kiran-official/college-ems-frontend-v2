import Link from 'next/link'
import { getAllEvents, getActiveEvents } from '@/lib/queries/events'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar, Plus, Archive, RotateCcw, Settings } from 'lucide-react'
import { format } from 'date-fns'
import { ArchiveRestoreButtons } from './ArchiveRestoreButtons'
import { DeleteEventButton } from './DeleteEventButton'

export default async function AdminEventsPage() {
    const active = await getActiveEvents()
    const events = await getAllEvents()
    const archived = events.filter(e => !e.is_active)

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <h1 className="page-title">Events ({active.length})</h1>
                    <p className="page-sub">Manage all events across the system</p>
                </div>
                <div className="page-header__actions">
                    <Link href="/admin/events/create" className="btn btn--primary">
                        <Plus size={16} /> Create Event
                    </Link>
                </div>
            </div>

            {active.length === 0 ? (
                <EmptyState icon={Calendar} title="No events yet" subtitle="Create the first event to get started." />
            ) : (
                <div className="table-wrap -mx-4 px-4 sm:mx-0 sm:px-0">
                    <table className="data-table event-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Type</th>
                                <th>Faculty</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {active.map(e => (
                                <tr key={e.id}>
                                    <td data-label="Title">
                                        <Link href={`/admin/events/${e.id}`} style={{ color: 'var(--accent)' }}>
                                            {e.title}
                                        </Link>
                                    </td>
                                    <td data-label="Date">{format(new Date(e.event_date), 'dd/MM/yyyy')}</td>
                                    <td data-label="Status"><Badge variant={e.status}>{e.status}</Badge></td>
                                    <td data-label="Type"><Badge variant={e.participant_type === 'single' ? 'individual' : 'team'}>{e.participant_type}</Badge></td>
                                    <td data-label="Faculty">
                                        <div className="faculty-pills">
                                            {e.faculty_in_charge?.map(f => (
                                                <span key={f.teacher_id} className="faculty-pill">{f.teacher?.name}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="data-table__actions-cell">
                                        <div className="table-actions">
                                            <Link href={`/admin/events/${e.id}`} className="btn btn--outline btn--sm">
                                                <Settings size={12} /> Manage
                                            </Link>
                                            <ArchiveRestoreButtons eventId={e.id} isActive={e.is_active} />
                                            <DeleteEventButton eventId={e.id} eventTitle={e.title} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Archived section */}
            {archived.length > 0 && (
                <details style={{ marginTop: 32 }}>
                    <summary style={{
                        cursor: 'pointer', fontSize: '1rem', fontWeight: 600,
                        color: 'var(--text-tertiary)', padding: '12px 0',
                    }}>
                        <Archive size={16} style={{ display: 'inline', marginRight: 8 }} />
                        Archived Events ({archived.length})
                    </summary>
                    <div className="table-wrap -mx-4 px-4 sm:mx-0 sm:px-0" style={{ marginTop: 12, opacity: 0.7 }}>
                        <table className="data-table event-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {archived.map(e => (
                                    <tr key={e.id}>
                                        <td data-label="Title">{e.title}</td>
                                        <td data-label="Date">{format(new Date(e.event_date), 'dd/MM/yyyy')}</td>
                                        <td data-label="Status"><Badge variant={e.status}>{e.status}</Badge></td>
                                        <td className="data-table__actions-cell">
                                            <div className="table-actions">
                                                <ArchiveRestoreButtons eventId={e.id} isActive={e.is_active} />
                                                <DeleteEventButton eventId={e.id} eventTitle={e.title} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}
        </div>
    )
}
