'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SearchInput } from '@/components/forms/SearchInput'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import type { Event } from '@/lib/types/db'

interface TeacherEventsListProps {
    initialEvents: Event[]
    currentUserId: string
    currentPage: number
    totalPages: number
    currentSearch: string
    currentStatus: string
    currentMyEvents: boolean
}

export function TeacherEventsList({ initialEvents, currentUserId, currentPage, totalPages, currentSearch, currentStatus, currentMyEvents }: TeacherEventsListProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [searchQuery, setSearchQuery] = useState(currentSearch)

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== currentSearch) {
                const params = new URLSearchParams(searchParams.toString())
                if (searchQuery) params.set('search', searchQuery)
                else params.delete('search')
                params.set('page', '1')
                router.push(`${pathname}?${params.toString()}`)
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [searchQuery, currentSearch, pathname, router, searchParams])

    const handleStatusChange = (newStatus: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (newStatus !== 'all') params.set('status', newStatus)
        else params.delete('status')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const handleMyEventsChange = (checked: boolean) => {
        const params = new URLSearchParams(searchParams.toString())
        if (checked) params.set('myEvents', 'true')
        else params.delete('myEvents')
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const STATUS_ORDER: Record<string, number> = { open: 0, draft: 1, closed: 2, completed: 3 }
    const sorted = initialEvents.sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))

    const renderEvents = (events: Event[]) => (
        <>
            <div className="resp-table">
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                             <tr>
                                 <th>Title</th>
                                 <th>Date</th>
                                 <th>FIC / Organizer</th>
                                 <th>Status</th>
                                 <th>Type</th>
                                 <th style={{ textAlign: 'right' }}>Actions</th>
                             </tr>
                        </thead>
                        <tbody>
                             {events.map(e => {
                                 const isFIC = e.faculty_in_charge?.some((f: any) => f.teacher_id === currentUserId)
                                 const isCreator = e.created_by === currentUserId
                                 const isMyEvent = isFIC || isCreator
                                 const ficName = e.faculty_in_charge?.[0]?.teacher?.name || e.creator?.name || 'Admin'

                                 return (
                                     <tr key={e.id} className={isMyEvent ? 'row-highlight' : ''} style={isMyEvent ? { background: 'rgba(245,158,11,0.05)' } : undefined}>
                                         <td data-label="Title">
                                             <div className="flex items-center gap-2">
                                                 <Link href={`/teacher/events/${e.id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                                     {e.title}
                                                 </Link>
                                                 {isMyEvent && <Badge variant="warning" style={{ fontSize: '9px', padding: '1px 6px' }}>My Event</Badge>}
                                             </div>
                                         </td>
                                         <td data-label="Date">{format(new Date(e.event_date), 'dd/MM/yyyy')}</td>
                                         <td data-label="FIC">{ficName}</td>
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
                                 )
                             })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="resp-cards">
                {events.map(e => {
                    const isFIC = e.faculty_in_charge?.some((f: any) => f.teacher_id === currentUserId)
                    const isCreator = e.created_by === currentUserId
                    const isMyEvent = isFIC || isCreator
                    const ficName = e.faculty_in_charge?.[0]?.teacher?.name || e.creator?.name || 'Admin'

                    return (
                        <div key={e.id} className="m-card" style={isMyEvent ? { borderLeft: '3px solid var(--warning)' } : undefined}>
                            <div className="m-card__row">
                                <Link href={`/teacher/events/${e.id}`} className="m-card__name">
                                    {e.title}
                                </Link>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {isMyEvent && <Badge variant="warning" style={{ fontSize: '9px', padding: '1px 6px' }}>Mine</Badge>}
                                    <Badge variant={e.status} style={{ fontSize: '9px', padding: '1px 6px' }}>{e.status}</Badge>
                                </div>
                            </div>
                            <div className="m-card__details" style={{ marginTop: 4 }}>
                                <span className="m-card__detail">Date: {format(new Date(e.event_date), 'dd/MM/yyyy')}</span>
                                <span className="m-card__detail"> • FIC: {ficName}</span>
                            </div>
                            <div className="m-card__actions" style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                                <Link href={`/teacher/events/${e.id}`} className="btn btn--outline btn--sm" style={{ padding: '4px 8px', fontSize: '11px', height: '28px' }}>
                                    <Eye size={12} /> View
                                </Link>
                            </div>
                        </div>
                    )
                })}
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
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(e.target.value)}
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

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderLeft: '1px solid var(--border)', marginLeft: 8 }}>
                    <input 
                        type="checkbox" 
                        id="my-events-only"
                        className="form-checkbox"
                        checked={currentMyEvents}
                        onChange={(e) => handleMyEventsChange(e.target.checked)}
                    />
                    <label htmlFor="my-events-only" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        Show My Events Only
                    </label>
                </div>
            </div>

            {sorted.length === 0 ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-glass)', borderRadius: 'var(--r-xl)' }}>
                    No matching events found.
                </div>
            ) : (
                renderEvents(sorted)
            )}

            <Pagination currentPage={currentPage} totalPages={totalPages} />
        </div>
    )
}
