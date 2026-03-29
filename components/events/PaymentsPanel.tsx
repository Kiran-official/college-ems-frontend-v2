'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import {
    verifyPaymentAction,
    rejectPaymentAction,
    getPaymentProofSignedUrlAction,
} from '@/lib/actions/registrationActions'
import type { IndividualRegistration, Event } from '@/lib/types/db'
import { CheckCircle, XCircle, Image, Clock, AlertCircle, Hourglass, List } from 'lucide-react'

interface PaymentsPanelProps {
    event: Event
    registrations: IndividualRegistration[]
}

function PaymentStatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'pending':    return <Badge variant="pending">Awaiting Payment</Badge>
        case 'submitted':  return <Badge variant="info">Proof Submitted</Badge>
        case 'verified':   return <Badge variant="success">Verified</Badge>
        case 'rejected':   return <Badge variant="failed">Rejected</Badge>
        default:           return <Badge variant="pending">{status}</Badge>
    }
}

function ShowProofButton({ filePath }: { filePath: string }) {
    const [loading, setLoading] = useState(false)

    async function handleShow() {
        setLoading(true)
        const res = await getPaymentProofSignedUrlAction(filePath)
        setLoading(false)
        if (res.success && res.url) {
            window.open(res.url, '_blank')
        } else {
            alert('Could not load proof image')
        }
    }

    return (
        <Button size="sm" variant="outline" onClick={handleShow} loading={loading}>
            <Image size={14} style={{ marginRight: 6 }} /> Show Proof
        </Button>
    )
}

function RegistrationRow({ reg, event }: { reg: IndividualRegistration; event: Event }) {
    const [pending, startTransition] = useTransition()
    const [showReject, setShowReject] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [localStatus, setLocalStatus] = useState(reg.payment_status)
    const [error, setError] = useState<string | null>(null)

    function wrap(fn: () => Promise<{ success: boolean; error?: string }>, onSuccess?: () => void) {
        setError(null)
        startTransition(async () => {
            const result = await fn()
            if (!result.success) {
                setError(result.error ?? 'Something went wrong')
            } else {
                onSuccess?.()
            }
        })
    }

    function handleVerify() {
        wrap(
            () => verifyPaymentAction({ registration_id: reg.id, event_id: event.id }),
            () => setLocalStatus('verified')
        )
    }

    function handleReject() {
        if (!rejectReason.trim()) { setError('Please enter a rejection reason'); return }
        wrap(
            () => rejectPaymentAction({ registration_id: reg.id, event_id: event.id, rejection_reason: rejectReason }),
            () => { setLocalStatus('rejected'); setShowReject(false) }
        )
    }

    return (
        <div style={{
            padding: '16px 20px',
            borderRadius: 'var(--r-md)',
            border: `1px solid ${localStatus === 'submitted' ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
            background: localStatus === 'submitted' ? 'rgba(99,102,241,0.04)' : 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
        }}>
            {/* Left side: Student Info */}
            <div style={{ flex: '1 1 auto', minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                        {reg.student?.name ?? 'Unknown Student'}
                    </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    {reg.student?.email}
                    {reg.student?.programme && ` · ${reg.student.programme}`}
                    {reg.student?.semester && ` · Sem ${reg.student.semester}`}
                </div>
                {reg.payment_submitted_at && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                        Submitted {format(new Date(reg.payment_submitted_at), 'dd MMM yyyy, hh:mm a')}
                    </div>
                )}
                {reg.rejection_reason && localStatus === 'rejected' && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: 4, fontWeight: 500 }}>
                        Rejection reason: {reg.rejection_reason}
                    </div>
                )}
                {error && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--error)', fontWeight: 600, marginTop: 4 }}>{error}</div>
                )}
            </div>

            {/* Right side: Payment Details & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    ₹{event.registration_fee?.toFixed(2)}
                </div>
                <PaymentStatusBadge status={localStatus} />

                {reg.payment_proof_url && <ShowProofButton filePath={reg.payment_proof_url} />}

                {/* Inline Action block */}
                {showReject ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            className="form-input"
                            style={{ height: 32, fontSize: '0.8125rem' }}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Reason..."
                            autoFocus
                        />
                        <Button size="sm" variant="danger" onClick={handleReject} loading={pending} disabled={!rejectReason.trim()}>
                            Confirm
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowReject(false); setRejectReason('') }} disabled={pending}>
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <>
                        {localStatus === 'submitted' && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button
                                    size="sm"
                                    onClick={handleVerify}
                                    loading={pending}
                                    style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                                >
                                    <CheckCircle size={14} style={{ marginRight: 6 }}/> Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => setShowReject(true)}
                                    disabled={pending}
                                >
                                    <XCircle size={14} style={{ marginRight: 6 }}/> Reject
                                </Button>
                            </div>
                        )}
                        {localStatus === 'rejected' && (
                            <Button
                                size="sm"
                                onClick={handleVerify}
                                loading={pending}
                                style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                            >
                                <CheckCircle size={14} style={{ marginRight: 6 }}/> Approve Anyway
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export function PaymentsPanel({ event, registrations }: PaymentsPanelProps) {
    const [filter, setFilter] = useState<'all' | 'submitted' | 'pending' | 'verified' | 'rejected'>('submitted')

    const paidRegs = registrations.filter(r => r.payment_status !== 'not_required')

    const filtered = filter === 'all'
        ? paidRegs
        : paidRegs.filter(r => r.payment_status === filter)

    const counts = {
        all: paidRegs.length,
        pending: paidRegs.filter(r => r.payment_status === 'pending').length,
        submitted: paidRegs.filter(r => r.payment_status === 'submitted').length,
        verified: paidRegs.filter(r => r.payment_status === 'verified').length,
        rejected: paidRegs.filter(r => r.payment_status === 'rejected').length,
    }

    if (paidRegs.length === 0) {
        return (
            <div className="glass" style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontWeight: 600, marginBottom: 4 }}>No payment registrations yet</p>
                <p style={{ fontSize: '0.875rem' }}>Students who register for this paid event will appear here.</p>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Summary cards - Explicit Single Line Flex Layout */}
            <div style={{ display: 'flex', flexWrap: 'nowrap', width: '100%', gap: 8, marginBottom: 16 }}>
                {([
                    { key: 'all', label: 'All', color: '#a855f7', icon: List },
                    { key: 'submitted', label: 'Needs Review', color: '#818cf8', icon: Hourglass },
                    { key: 'pending', label: 'Awaiting Payment', color: '#f59e0b', icon: Clock },
                    { key: 'verified', label: 'Verified', color: '#22c55e', icon: CheckCircle },
                    { key: 'rejected', label: 'Rejected', color: '#ef4444', icon: XCircle },
                ] as const).map(item => {
                    const isActive = filter === item.key;
                    return (
                        <div 
                            key={item.key} 
                            onClick={() => setFilter(item.key)} 
                            className="glass" 
                            style={{ 
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '12px 4px',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'all 0.2s', 
                                transform: isActive ? 'translateY(-2px)' : 'none', 
                                border: isActive ? `1px solid ${item.color}50` : undefined, 
                                background: isActive ? `${item.color}15` : undefined,
                                borderRadius: 'var(--r-lg)'
                            }}
                        >
                            <div style={{ color: item.color, fontSize: 'clamp(1rem, 3vw, 1.5rem)', fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>
                                {counts[item.key]}
                            </div>
                            <div style={{ 
                                fontSize: 'clamp(0.55rem, 1.5vw, 0.75rem)', 
                                color: 'var(--text-tertiary)', 
                                fontWeight: 600, 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.02em', 
                                textAlign: 'center',
                                lineHeight: 1.2,
                                width: '100%',
                                wordWrap: 'break-word',
                                padding: '0 2px'
                            }}>
                                {item.label}
                            </div>
                            
                            {/* Icon entirely hidden to allow text packing on mobile */}
                            <div className="hidden lg:block absolute right-3 bottom-3" style={{ opacity: isActive ? 1 : 0.3 }}>
                                <item.icon size={20} color={item.color} />
                            </div>

                            <div className="absolute inset-0" style={{ background: item.color, opacity: isActive ? 0.1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none' }} />
                        </div>
                    )
                })}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                    No registrations with status &quot;{filter}&quot;
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.map(reg => (
                        <RegistrationRow key={reg.id} reg={reg} event={event} />
                    ))}
                </div>
            )}
        </div>
    )
}
