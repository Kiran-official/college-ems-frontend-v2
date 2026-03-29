'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { updateAttendanceAction, bulkUpdateAttendanceAction } from '@/lib/actions/attendanceActions'
import { Lock } from 'lucide-react'
import type { IndividualRegistration, Event } from '@/lib/types/db'

interface AttendancePanelProps {
    event: Event
    registrations: IndividualRegistration[]
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

interface AttendancePanelProps {
    event: Event
    registrations: IndividualRegistration[]
}

export function AttendancePanel({ event, registrations }: AttendancePanelProps) {
    const router = useRouter()
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

    function markAllPresent() {
        startBulk(async () => {
            await bulkUpdateAttendanceAction({ event_id: event.id, status: 'attended' })
            router.refresh()
        })
    }

    function resetAll() {
        startBulk(async () => {
            await bulkUpdateAttendanceAction({ event_id: event.id, status: 'registered' })
            router.refresh()
        })
    }

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-4">
                <Button size="sm" variant="outline" onClick={markAllPresent} loading={bulkPending} className="flex-1 sm:flex-none justify-center">
                    Mark All Present
                </Button>
                <Button size="sm" variant="ghost" onClick={resetAll} loading={bulkPending} className="flex-1 sm:flex-none justify-center">
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
                        {registrations.map(r => (
                            <AttendanceRow key={r.id} reg={r} eventStatus={event.status} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
