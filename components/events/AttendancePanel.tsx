'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { updateAttendanceAction, bulkUpdateAttendanceAction } from '@/lib/actions/attendanceActions'
import { Lock } from 'lucide-react'
import type { IndividualRegistration, Event, EventCategory } from '@/lib/types/db'

interface AttendancePanelProps {
    event: Event
    registrations: IndividualRegistration[]
    categories: EventCategory[]
    categoryId?: string
}

function AttendanceRow({ reg, eventStatus }: { reg: IndividualRegistration; eventStatus: string }) {
    const [status, setStatus] = useState(reg.attendance_status)
    const [pending, startTransition] = useTransition()
    const isEditable = eventStatus === 'closed'

    function mark(newStatus: 'attended' | 'absent' | 'registered') {
        if (!isEditable) return
        startTransition(async () => {
            const result = await updateAttendanceAction({ registration_id: reg.id, status: newStatus })
            if (result.success) setStatus(newStatus)
        })
    }

    return (
        <tr>
            <td>{reg.student?.name ?? '—'}</td>
            <td>{(reg.student?.department as { name?: string } | undefined)?.name ?? '—'}</td>
            <td>
                {isEditable ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            className={`btn btn--sm ${status === 'attended' ? 'btn--success' : 'btn--ghost'}`}
                            onClick={() => mark('attended')}
                            disabled={pending}
                            style={{
                                background: status === 'attended' ? 'var(--success)' : 'var(--success-bg)',
                                color: status === 'attended' ? 'var(--bg-void)' : 'var(--success)',
                                borderColor: 'var(--success)',
                            }}
                        >
                            Present
                        </button>
                        <button
                            className={`btn btn--sm ${status === 'absent' ? 'btn--danger' : 'btn--ghost'}`}
                            onClick={() => mark('absent')}
                            disabled={pending}
                            style={{
                                background: status === 'absent' ? 'var(--error)' : 'var(--error-bg)',
                                color: status === 'absent' ? 'var(--bg-void)' : 'var(--error)',
                                borderColor: 'var(--error)',
                            }}
                        >
                            Absent
                        </button>
                    </div>
                ) : (
                    <Badge variant={status === 'registered' ? 'pending' : status === 'attended' ? 'generated' : 'failed'}>
                        {status === 'attended' ? 'present' : status}
                    </Badge>
                )}
            </td>
            <td>
                {status !== 'registered' ? (
                    <Badge variant="generated">✓ Marked</Badge>
                ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>Pending</span>
                )}
            </td>
        </tr>
    )
}

export function AttendancePanel({ event, registrations, categories, categoryId }: AttendancePanelProps) {
    const [bulkPending, startBulk] = useTransition()

    // Locked states
    if (event.status === 'open') {
        return (
            <div className="attendance-locked">
                <Lock size={20} />
                <span>Attendance can only be marked after the event is closed.</span>
            </div>
        )
    }
    if (event.status === 'completed') {
        return (
            <div className="attendance-locked">
                <Lock size={20} />
                <span>This event is completed. Attendance records are final.</span>
            </div>
        )
    }

    const hasCategories = categories.length > 0

    function markAllPresent(categoryId?: string) {
        startBulk(async () => {
            await bulkUpdateAttendanceAction({ event_id: event.id, status: 'attended', category_id: categoryId })
            window.location.reload()
        })
    }

    function resetAll(categoryId?: string) {
        startBulk(async () => {
            await bulkUpdateAttendanceAction({ event_id: event.id, status: 'registered', category_id: categoryId })
            window.location.reload()
        })
    }

    function renderTable(rows: IndividualRegistration[], categoryId?: string) {
        return (
            <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <Button size="sm" variant="outline" onClick={() => markAllPresent(categoryId)} loading={bulkPending}>
                        Mark All Present
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => resetAll(categoryId)} loading={bulkPending}>
                        Reset All
                    </Button>
                </div>
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Department</th>
                                <th>Attendance</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <AttendanceRow key={r.id} reg={r} eventStatus={event.status} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    if (categoryId) {
        const catRegs = registrations.filter(r => r.category_id === categoryId)
        if (catRegs.length === 0) {
            return (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                    No registrations in this category.
                </div>
            )
        }
        return renderTable(catRegs, categoryId)
    }

    if (!hasCategories) {
        return renderTable(registrations)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {categories.map(cat => {
                const catRegs = registrations.filter(r => r.category_id === cat.id)
                return (
                    <div key={cat.id}>
                        <div className="category-section-header">{cat.category_name}</div>
                        {catRegs.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                                No registrations in this category
                            </div>
                        ) : (
                            renderTable(catRegs, cat.id)
                        )}
                    </div>
                )
            })}
        </div>
    )
}
