'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { openEventAction, closeEventAction, publishResultsAction, completeEventAction } from '@/lib/actions/eventActions'
import { syncEventCertificatesAction } from '@/lib/actions/certificateActions'
import type { Event, IndividualRegistration } from '@/lib/types/db'
import { AlertCircle, CheckCircle2, Send, Lock } from 'lucide-react'

interface EventActionHeaderProps {
    event: Event
    registrations: IndividualRegistration[]
    isFIC?: boolean
    userRole?: 'admin' | 'teacher' | 'student'
}

export function EventActionHeader({ event, registrations, isFIC = false, userRole }: EventActionHeaderProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const incompleteAttendanceCount = registrations.filter(r => r.attendance_status === 'registered').length
    
    function handleAction(action: () => Promise<{ success: boolean; error?: string }>) {
        if (isPending) return
        startTransition(async () => {
            const result = await action()
            if (result.success) {
                router.refresh()
            } else {
                alert(result.error ?? 'Action failed')
            }
        })
    }

    if (event.status === 'cancelled') return null

    const canManage = userRole === 'admin' || isFIC
    
    // Header should only be visible to managers (Admin/FIC)
    if (!canManage) return null

    return (
        <div className="glass-premium" style={{ padding: '16px 20px', marginBottom: 24, border: '1px solid var(--accent-border, rgba(99,102,241,0.2))' }}>
            <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>Quick Actions</span>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-tertiary)' }}></div>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {event.status === 'open' ? 'Management' : event.status === 'closed' ? 'Attendance & Results' : 'Post-Event'}
                        </span>
                    </div>
                    {event.status === 'closed' && incompleteAttendanceCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>
                            <AlertCircle size={12} />
                            {incompleteAttendanceCount} attendance records pending
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {canManage && event.status === 'draft' && (
                        <Button 
                            size="sm" 
                            variant="primary" 
                            onClick={() => {
                                if (confirm('Publish this event and open registrations?')) {
                                    handleAction(() => openEventAction(event.id))
                                }
                            }} 
                            loading={isPending}
                        >
                            <Send size={14} /> Publish Event
                        </Button>
                    )}

                    {canManage && event.status === 'open' && (
                        <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                                if (confirm('Are you sure you want to close registrations? This cannot be undone.')) {
                                    handleAction(() => closeEventAction(event.id))
                                }
                            }} 
                            loading={isPending}
                        >
                            <Lock size={14} /> Close Registrations
                        </Button>
                    )}

                    {canManage && event.status === 'closed' && !event.results_published && (
                        <Button 
                            size="sm" 
                            variant="primary" 
                            onClick={() => {
                                if (incompleteAttendanceCount > 0) {
                                    alert('Please finalize attendance for all participants before publishing results.')
                                    return
                                }
                                if (confirm('Publish results to students?')) {
                                    handleAction(() => publishResultsAction(event.id))
                                }
                            }} 
                            loading={isPending}
                            disabled={incompleteAttendanceCount > 0}
                        >
                            <Send size={14} /> Publish Results
                        </Button>
                    )}

                    {canManage && event.status === 'closed' && event.results_published && (
                        <Button 
                            size="sm" 
                            variant="primary" 
                            onClick={() => {
                                if (confirm('Complete this event? This will finalize everything.')) {
                                    handleAction(() => completeEventAction(event.id))
                                }
                            }} 
                            loading={isPending}
                        >
                            <CheckCircle2 size={14} /> Complete Event
                        </Button>
                    )}

                    {canManage && event.status === 'completed' && (
                        <div className="flex items-center gap-4">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleAction(async () => {
                                    const res = await syncEventCertificatesAction(event.id)
                                    if (res.success) {
                                        alert(`Successfully synced! Queued ${res.queued} missing certificates.`)
                                    }
                                    return res
                                })} 
                                loading={isPending}
                            >
                                <Send size={14} /> Sync Certificates
                            </Button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600 }}>
                                <CheckCircle2 size={16} /> Event Completed
                            </div>
                        </div>
                    )}
                    {!canManage && event.status === 'completed' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--success)', fontWeight: 600 }}>
                            <CheckCircle2 size={16} /> Event Completed
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
