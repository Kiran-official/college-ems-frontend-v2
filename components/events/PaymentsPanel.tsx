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
import { CheckCircle, XCircle, Image, Clock, AlertCircle } from 'lucide-react'

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

function ProofImage({ filePath }: { filePath: string }) {
    const [url, setUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getPaymentProofSignedUrlAction(filePath).then(res => {
            if (res.success && res.url) setUrl(res.url)
            setLoading(false)
        })
    }, [filePath])

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
            <Clock size={14} /> Loading proof...
        </div>
    )

    if (!url) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--error)', fontSize: '0.8125rem' }}>
            <AlertCircle size={14} /> Could not load image
        </div>
    )

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
            <img
                src={url}
                alt="Payment proof"
                style={{
                    width: 120,
                    height: 120,
                    objectFit: 'cover',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            />
            <p style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: 3 }}>Click to enlarge</p>
        </a>
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
            flexDirection: 'column',
            gap: 12,
        }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                        {reg.student?.name ?? 'Unknown Student'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {reg.student?.email}
                        {reg.student?.programme && ` · ${reg.student.programme}`}
                        {reg.student?.semester && ` · Sem ${reg.student.semester}`}
                    </div>
                    {reg.payment_submitted_at && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                            Submitted {format(new Date(reg.payment_submitted_at), 'dd MMM yyyy, hh:mm a')}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                        ₹{event.registration_fee?.toFixed(2)}
                    </div>
                    <PaymentStatusBadge status={localStatus} />
                </div>
            </div>

            {/* Payment proof image */}
            {reg.payment_proof_url && (
                <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                        Payment Proof
                    </div>
                    <ProofImage filePath={reg.payment_proof_url} />
                </div>
            )}

            {!reg.payment_proof_url && localStatus === 'pending' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                    <Image size={14} /> No proof uploaded yet
                </div>
            )}

            {/* Rejection reason (if previously rejected) */}
            {reg.rejection_reason && localStatus === 'rejected' && (
                <div style={{
                    padding: '8px 12px', borderRadius: 'var(--r-sm)',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    fontSize: '0.8125rem', color: 'var(--error)',
                }}>
                    Rejection reason: {reg.rejection_reason}
                </div>
            )}

            {error && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--error)', fontWeight: 600 }}>{error}</div>
            )}

            {/* Action buttons — only for submitted */}
            {localStatus === 'submitted' && !showReject && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button
                        size="sm"
                        onClick={handleVerify}
                        loading={pending}
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                    >
                        <CheckCircle size={14} /> Approve
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setShowReject(true)}
                        disabled={pending}
                    >
                        <XCircle size={14} /> Reject
                    </Button>
                </div>
            )}

            {/* Reject form */}
            {showReject && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                        className="form-input"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection (shown to student)..."
                        autoFocus
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Button size="sm" variant="danger" onClick={handleReject} loading={pending} disabled={!rejectReason.trim()}>
                            Confirm Reject
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowReject(false); setRejectReason('') }} disabled={pending}>
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Re-verify option for already-rejected */}
            {localStatus === 'rejected' && !showReject && (
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        size="sm"
                        onClick={handleVerify}
                        loading={pending}
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                    >
                        <CheckCircle size={14} /> Approve Anyway
                    </Button>
                </div>
            )}
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
            {/* Summary cards */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {([
                    { key: 'submitted', label: 'Needs Review', color: '#818cf8' },
                    { key: 'pending', label: 'Awaiting Payment', color: '#f59e0b' },
                    { key: 'verified', label: 'Verified', color: '#22c55e' },
                    { key: 'rejected', label: 'Rejected', color: '#ef4444' },
                ] as const).map(item => (
                    <button
                        key={item.key}
                        onClick={() => setFilter(item.key)}
                        style={{
                            padding: '10px 16px',
                            borderRadius: 'var(--r-md)',
                            border: `1px solid ${filter === item.key ? item.color : 'var(--border)'}`,
                            background: filter === item.key ? `${item.color}18` : 'var(--bg-surface)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            minWidth: 110,
                            transition: 'all 0.15s',
                        }}
                    >
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: item.color, lineHeight: 1 }}>
                            {counts[item.key]}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>Show:</span>
                {(['submitted', 'pending', 'verified', 'rejected', 'all'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '4px 10px', borderRadius: 20,
                            border: '1px solid var(--border)',
                            background: filter === f ? 'var(--accent)' : 'transparent',
                            color: filter === f ? '#fff' : 'var(--text-secondary)',
                            fontSize: '0.8125rem', cursor: 'pointer', fontWeight: filter === f ? 600 : 400,
                            transition: 'all 0.15s',
                        }}
                    >
                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f as keyof typeof counts]})
                    </button>
                ))}
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
