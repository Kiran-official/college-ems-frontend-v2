'use client'

import { useState } from 'react'
import { SearchInput } from '@/components/forms/SearchInput'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import type { Event } from '@/lib/types/db'

interface TeacherEventsListProps {
    initialEvents: Event[]
}

export function TeacherEventsList({ initialEvents }: TeacherEventsListProps) {
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

    const STATUS_ORDER: Record<string, number> = { open: 0, draft: 1, closed: 2, completed: 3 }
    const sorted = filtered.sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))

    const renderEvents = (events: Event[]) => (
        <>
            <div className="resp-table">
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Type</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map(e => (
                                <tr key={e.id}>
                                    <td data-label="Title">
                                        <Link href={`/teacher/events/${e.id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                            {e.title}
                                        </Link>
                                    </td>
                                    <td data-label="Date">{format(new Date(e.event_date), 'dd/MM/yyyy')}</td>
                                    <td data-label="Status"><Badge variant={e.status}>{e.status}</Badge></td>
                                    <td data-label="Type"><Badge variant={e.participant_type === 'single' ? 'individual' : 'team'}>{e.participant_type}</Badge></td>
                                    <td className="data-table__actions-cell">
                                        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                            <Link href={`/teacher/events/${e.id}`} className="btn btn--outline btn--sm">
                                                <Eye size={12} /> View
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="resp-cards">
                {events.map(e => (
                    <div key={e.id} className="m-card">
                        <div className="m-card__row">
                            <Link href={`/teacher/events/${e.id}`} className="m-card__name">
                                {e.title}
                            </Link>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <Badge variant={e.status} style={{ fontSize: '9px', padding: '1px 6px' }}>{e.status}</Badge>
                                <Badge variant={e.participant_type === 'single' ? 'individual' : 'team'} style={{ fontSize: '9px', padding: '1px 6px' }}>{e.participant_type}</Badge>
                            </div>
                        </div>
                        <div className="m-card__details" style={{ marginTop: 4 }}>
                            <span className="m-card__detail">{format(new Date(e.event_date), 'dd/MM/yyyy')}</span>
                        </div>
                        <div className="m-card__actions" style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                            <Link href={`/teacher/events/${e.id}`} className="btn btn--outline btn--sm" style={{ padding: '4px 8px', fontSize: '11px', height: '28px' }}>
                                <Eye size={12} /> View
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </>
    )

    return (
        <div className="teacher-events-list">
            <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search your events..."
                />

                <div style={{ position: 'relative', minWidth: 160 }}>
                    <select
                        className="form-input"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ paddingRight: 32 }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="open">Open (Registration)</option>
                        <option value="closed">Closed (Event Over)</option>
                        <option value="processing">Processing (Selecting Winners)</option>
                        <option value="published">Published (Results Out)</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            {sorted.length === 0 ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-glass)', borderRadius: 'var(--r-xl)' }}>
                    No matching events found.
                </div>
            ) : (
                renderEvents(sorted)
            )}
        </div>
    )
}
