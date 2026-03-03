import Link from 'next/link'
import { getAllEvents } from '@/lib/queries/events'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar, Plus, Archive, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { ArchiveRestoreButtons } from './ArchiveRestoreButtons'

export default async function AdminEventsPage() {
    const events = await getAllEvents()
    const active = events.filter(e => e.is_active)
    const archived = events.filter(e => !e.is_active)

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Events</h1>
                    <p className="page-sub">Manage all events across the system</p>
                </div>
                <Link href="/admin/events/create" className="btn btn--primary">
                    <Plus size={16} /> Create Event
                </Link>
            </div>

            {active.length === 0 ? (
                <EmptyState icon={Calendar} title="No events yet" subtitle="Create the first event to get started." />
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Categories</th>
                                <th>Type</th>
                                <th>Faculty</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {active.map(e => (
                                <tr key={e.id}>
                                    <td>
                                        <Link href={`/admin/events/${e.id}`} style={{ color: 'var(--accent)' }}>
                                            {e.title}
                                        </Link>
                                    </td>
                                    <td>{format(new Date(e.event_date), 'dd MMM yyyy')}</td>
                                    <td><Badge variant={e.status}>{e.status}</Badge></td>
                                    <td>{e.categories?.length ?? 0}</td>
                                    <td><Badge variant={e.participant_type === 'single' ? 'individual' : 'team'}>{e.participant_type}</Badge></td>
                                    <td>
                                        <div className="faculty-pills">
                                            {e.faculty_in_charge?.filter(f => !f.category_id).map(f => (
                                                <span key={f.teacher_id} className="faculty-pill">{f.teacher?.name}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <Link href={`/admin/events/${e.id}`} className="btn btn--outline btn--sm">Manage</Link>
                                            <ArchiveRestoreButtons eventId={e.id} isActive={e.is_active} />
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
                    <div className="table-wrap" style={{ marginTop: 12, opacity: 0.7 }}>
                        <table className="data-table">
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
                                        <td>{e.title}</td>
                                        <td>{format(new Date(e.event_date), 'dd MMM yyyy')}</td>
                                        <td><Badge variant={e.status}>{e.status}</Badge></td>
                                        <td><ArchiveRestoreButtons eventId={e.id} isActive={e.is_active} /></td>
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
