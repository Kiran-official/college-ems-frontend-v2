'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { SearchInput } from '@/components/forms/SearchInput'
import { format } from 'date-fns'
import { Settings, Archive, ChevronDown } from 'lucide-react'
import { ArchiveRestoreButtons } from '@/app/(admin)/admin/events/ArchiveRestoreButtons'
import { DeleteEventButton } from '@/app/(admin)/admin/events/DeleteEventButton'
import type { Event } from '@/lib/types/db'

interface AdminEventsListProps {
    initialEvents: Event[]
}

export function AdminEventsList({ initialEvents }: AdminEventsListProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    const filtered = initialEvents.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase())

        let matchesStatus = statusFilter === 'all' || e.status === statusFilter

        // Smart derived statuses
        if (statusFilter === 'processing') {
            matchesStatus = e.status === 'closed' && !e.results_published
        } else if (statusFilter === 'published') {
            matchesStatus = e.status === 'closed' && e.results_published
        }

        return matchesSearch && matchesStatus
    })

    const activeEvents = filtered.filter(e => e.is_active)
    const archivedEvents = filtered.filter(e => !e.is_active)

    const renderTable = (events: Event[]) => (
        <div className="table-wrap -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="data-table event-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Type</th>
                        <th>Faculty</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {events.map(e => (
                        <tr key={e.id}>
                            <td data-label="Title">
                                <Link href={`/admin/events/${e.id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
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
                                <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
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
    )

    return (
        <div className="admin-events-list">
            <div style={{ marginBottom: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: '1 1 0', minWidth: 0 }}>
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search events by title..."
                    />
                </div>

                <div style={{ position: "relative", flexShrink: 0 }}>
                    <select
                        className="form-input"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{
                            appearance: "none",
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                            paddingRight: "36px",
                            minWidth: 0,
                            width: "auto",
                        }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="processing">Processing</option>
                        <option value="published">Published</option>
                        <option value="completed">Completed</option>
                    </select>

                    <ChevronDown
                        size={16}
                        style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            pointerEvents: "none",
                            color: "#6b7280",
                        }}
                    />
                </div>
            </div>

            {activeEvents.length > 0 ? (
                renderTable(activeEvents)
            ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    No matching events found.
                </div>
            )}

            {archivedEvents.length > 0 && (
                <details style={{ marginTop: 40 }} open={searchQuery.length > 0}>
                    <summary style={{
                        cursor: 'pointer', fontSize: '1rem', fontWeight: 600,
                        color: 'var(--text-tertiary)', padding: '12px 0',
                    }}>
                        <Archive size={16} style={{ display: 'inline', marginRight: 8 }} />
                        Archived Events ({archivedEvents.length})
                    </summary>
                    <div style={{ marginTop: 12, opacity: 0.8 }}>
                        {renderTable(archivedEvents)}
                    </div>
                </details>
            )}
        </div>
    )
}
