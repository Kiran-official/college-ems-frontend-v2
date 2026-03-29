'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import {
    registerForEventAction,
    cancelRegistrationAction,
    createTeamAction,
    joinTeamAction,
    approveJoinRequestAction,
    rejectJoinRequestAction,
    deleteTeamAction,
    leaveTeamAction,
    removeMemberAction,
    sendInviteAction,
    acceptInviteAction,
    declineInviteAction,
    uploadPaymentProofAction,
} from '@/lib/actions/registrationActions'
import { searchStudentsForInviteAction } from '@/lib/actions/userActions'
import { Users2, Trash2, Check, X, Search, Loader2, UserPlus, LogOut, UserMinus, QrCode, Upload, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react'
import type { Event, Team, Winner } from '@/lib/types/db'

type StudentSearchResult = {
    id: string
    name: string
    email: string
    programme?: string
    semester?: number
}

interface StudentEventActionsProps {
    event: Event
    registration: any
    teams: Team[]
    winners: Winner[]
    studentId: string
    isDeadlinePassed: boolean
}

// ── Winners display ────────────────────────────────────────────

function WinnersDisplay({ winners }: { winners: Winner[] }) {
    if (winners.length === 0) return null
    return (
        <div className="glass-premium" style={{ padding: 24, marginTop: 32 }}>
            <h3 className="section-title" style={{ fontSize: '1.25rem', marginBottom: 20 }}>Results</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {winners.map(w => (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ marginTop: 2 }}>
                            <Badge variant="winner">{w.position_label}</Badge>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 600 }}>
                                    {w.winner_type === 'student' ? w.student?.name : (w.team as any)?.team_name}
                                </span>
                                {w.winner_type === 'student' && w.student && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                        {w.student.programme}{w.student.semester ? ` · Sem ${w.student.semester}` : ''}
                                    </span>
                                )}
                            </div>
                            {w.winner_type === 'team' && (w.team as any)?.members && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, fontStyle: 'italic' }}>
                                    Members: {(w.team as any).members.map((m: any) => m.student?.name).filter(Boolean).join(', ')}
                                </div>
                            )}
                            {w.tags && w.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                                    {w.tags.map(tag => <span key={tag} className="winner-tag">{tag}</span>)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Shared student search input ────────────────────────────────

interface StudentSearchInputProps {
    excludeId: string
    excludeIds?: string[]
    placeholder?: string
    onSelect: (student: StudentSearchResult) => void
}

function StudentSearchInput({ excludeId, excludeIds = [], placeholder = 'Search by name or email...', onSelect }: StudentSearchInputProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<StudentSearchResult[]>([])
    const [searching, setSearching] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    const allExcluded = [excludeId, ...excludeIds]

    const search = useCallback((val: string) => {
        clearTimeout(debounceRef.current)
        if (!val.trim() || val.trim().length < 2) { setResults([]); setShowDropdown(false); return }
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            const res = await searchStudentsForInviteAction(val, excludeId)
            setResults(res.filter(r => !allExcluded.includes(r.id)))
            setShowDropdown(true)
            setSearching(false)
        }, 300)
    }, [excludeId, allExcluded])

    function handleSelect(student: StudentSearchResult) {
        onSelect(student)
        setQuery('')
        setResults([])
        setShowDropdown(false)
    }

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                <input
                    className="form-input"
                    value={query}
                    onChange={e => { setQuery(e.target.value); search(e.target.value) }}
                    onFocus={() => results.length > 0 && setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    placeholder={placeholder}
                    style={{ paddingLeft: 32 }}
                />
                {searching && <Loader2 size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', animation: 'spin 1s linear infinite' }} />}
            </div>

            {showDropdown && results.length > 0 && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', overflow: 'hidden',
                }}>
                    {results.map(s => (
                        <button key={s.id} type="button" onMouseDown={() => handleSelect(s)} style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer',
                            textAlign: 'left', borderBottom: '1px solid var(--border)', transition: 'background 0.1s',
                        }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                            <div>
                                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    {s.email}{s.programme && ` · ${s.programme}`}{s.semester && ` · Sem ${s.semester}`}
                                </div>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 500 }}>+ Invite</span>
                        </button>
                    ))}
                </div>
            )}

            {showDropdown && !searching && query.length >= 2 && results.length === 0 && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)', padding: '10px 14px',
                    fontSize: '0.875rem', color: 'var(--text-tertiary)',
                }}>
                    No students found for &quot;{query}&quot;
                </div>
            )}
        </div>
    )
}

// ── Member search for team creation (with chips) ───────────────

interface MemberSearchProps {
    excludeId: string
    selectedMembers: StudentSearchResult[]
    onAdd: (student: StudentSearchResult) => void
    onRemove: (studentId: string) => void
    maxMembers?: number
}

function MemberSearch({ excludeId, selectedMembers, onAdd, onRemove, maxMembers }: MemberSearchProps) {
    const atMax = maxMembers !== undefined && selectedMembers.length >= maxMembers - 1

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Invite Members <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            {selectedMembers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {selectedMembers.map(m => (
                        <span key={m.id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 8px 3px 10px', borderRadius: 9999,
                            background: 'var(--accent-subtle, rgba(99,102,241,0.12))',
                            color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 500,
                            border: '1px solid var(--accent-border, rgba(99,102,241,0.25))',
                        }}>
                            <UserPlus size={11} />
                            {m.name}
                            <button type="button" onClick={() => onRemove(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex', alignItems: 'center', opacity: 0.7 }}>
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {!atMax ? (
                <StudentSearchInput
                    excludeId={excludeId}
                    excludeIds={selectedMembers.map(m => m.id)}
                    onSelect={onAdd}
                />
            ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Team is full — remove an invitee to add someone else.</p>
            )}
        </div>
    )
}

// ── Payment proof upload panel ─────────────────────────────────

function PaymentProofUpload({ registration, event }: { registration: any; event: Event }) {
    const [pending, startTransition] = useTransition()
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [submitted, setSubmitted] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const paymentStatus = registration?.payment_status ?? 'pending'

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]
        if (!f) return
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowed.includes(f.type)) {
            setError('Only image files are allowed (JPEG, PNG, WebP)')
            return
        }
        if (f.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5 MB')
            return
        }
        setError(null)
        setFile(f)
        const reader = new FileReader()
        reader.onload = ev => setPreview(ev.target?.result as string)
        reader.readAsDataURL(f)
    }

    function handleSubmit() {
        if (!file || !registration) return
        setError(null)

        startTransition(async () => {
            const reader = new FileReader()
            reader.onload = async (ev) => {
                const base64 = ev.target?.result as string
                const ext = file.name.split('.').pop() ?? 'jpg'
                const result = await uploadPaymentProofAction({
                    registration_id: registration.id,
                    event_id: event.id,
                    file_base64: base64,
                    file_type: file.type,
                    file_ext: ext,
                })
                if (result.success) {
                    setSubmitted(true)
                    setFile(null)
                    setPreview(null)
                } else {
                    setError(result.error ?? 'Upload failed')
                }
            }
            reader.readAsDataURL(file)
        })
    }

    // Status display
    if (!registration) return null

    if (paymentStatus === 'not_required') return null

    const statusMap: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
        verified: {
            icon: <CheckCircle2 size={16} />,
            label: 'Payment verified — you are fully registered!',
            color: '#22c55e',
            bg: 'rgba(34,197,94,0.08)',
        },
        submitted: {
            icon: <Clock size={16} />,
            label: submitted ? 'Proof submitted! Under review by admin.' : 'Payment proof is under review.',
            color: '#4f46e5',
            bg: 'rgba(79, 70, 229, 0.08)',
        },
    }

    return (
        <div className="glass-premium" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Payment info banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <QrCode size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Payment Required</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Registration fee: <strong>₹{event.registration_fee?.toFixed(2)}</strong>
                    </div>
                </div>
            </div>

            {/* QR Code */}
            {event.upi_qr_url && (paymentStatus === 'pending' || paymentStatus === 'rejected') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Scan & Pay via UPI
                    </div>
                    <img
                        src={event.upi_qr_url}
                        alt="UPI QR Code"
                        style={{
                            width: 180, height: 180,
                            objectFit: 'contain',
                            borderRadius: 'var(--r-md)',
                            border: '1px solid var(--border)',
                            background: '#fff',
                            padding: 8,
                        }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', maxWidth: 280 }}>
                        Scan the QR code using any UPI app (Google Pay, PhonePe, Paytm, etc.), pay ₹{event.registration_fee?.toFixed(2)}, then upload the screenshot below.
                    </p>
                </div>
            )}

            {/* Rejection notice */}
            {paymentStatus === 'rejected' && registration.rejection_reason && (
                <div style={{
                    padding: '10px 14px', borderRadius: 'var(--r-md)',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                    <XCircle size={15} style={{ color: '#ef4444', marginTop: 1, flexShrink: 0 }} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#ef4444' }}>Payment Rejected</div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            Reason: {registration.rejection_reason}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                            Please make a new payment and re-upload your proof below.
                        </div>
                    </div>
                </div>
            )}

            {/* Status display for submitted/verified */}
            {statusMap[paymentStatus] && (
                <div style={{
                    padding: '10px 14px', borderRadius: 'var(--r-md)',
                    background: statusMap[paymentStatus].bg,
                    border: `1px solid ${statusMap[paymentStatus].color}30`,
                    display: 'flex', alignItems: 'center', gap: 8,
                    color: statusMap[paymentStatus].color, fontWeight: 600, fontSize: '0.875rem',
                }}>
                    {statusMap[paymentStatus].icon}
                    {statusMap[paymentStatus].label}
                </div>
            )}

            {/* Upload form — shown for pending and rejected */}
            {(paymentStatus === 'pending' || paymentStatus === 'rejected') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Upload Payment Screenshot
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />

                    {preview ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <img
                                src={preview}
                                alt="Payment screenshot preview"
                                style={{
                                    width: 160, height: 160, objectFit: 'cover',
                                    borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
                                }}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button size="sm" onClick={handleSubmit} loading={pending}>
                                    <Upload size={14} /> Submit Proof
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setFile(null); setPreview(null) }} disabled={pending}>
                                    Change
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} style={{ width: 'fit-content' }}>
                            <Upload size={14} /> Choose Screenshot
                        </Button>
                    )}

                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--error)' }}>
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Max 5 MB · JPEG, PNG, or WebP
                    </p>
                </div>
            )}
        </div>
    )
}

// ── Registration action block ──────────────────────────────────

function RegistrationAction({
    event,
    participantType,
    teamSize,
    existingReg, teams, studentId, isDeadlinePassed,
}: {
    event: Event
    participantType: 'single' | 'multiple'
    teamSize?: number | null
    existingReg: any
    teams: Team[]
    studentId: string
    isDeadlinePassed: boolean
}) {
    const [pending, startTransition] = useTransition()
    const [teamName, setTeamName] = useState('')
    const [showCreateTeam, setShowCreateTeam] = useState(false)
    const [selectedMembers, setSelectedMembers] = useState<StudentSearchResult[]>([])
    const [error, setError] = useState<string | null>(null)

    const canRegister = event.status === 'open' && !isDeadlinePassed
    const isRegistered = !!existingReg

    // For paid events, "registered" means payment is verified
    const paymentStatus = existingReg?.payment_status ?? null
    const isPaid = event.is_paid

    // Event-level teams
    const eventTeams = teams
    const studentCreatedTeam = eventTeams.find(t => t.created_by === studentId)
    const studentMemberTeam = !studentCreatedTeam
        ? eventTeams.find(t => t.members?.some(m => m.student_id === studentId && m.status === 'approved'))
        : undefined

    // Pending join request THIS student sent
    const pendingJoinEntry = !studentCreatedTeam && !studentMemberTeam
        ? (() => {
            for (const t of eventTeams) {
                const m = t.members?.find(m => m.student_id === studentId && m.status === 'pending' && !m.invited_by)
                if (m) return { teamMemberId: m.id, teamName: t.team_name }
            }
            return null
        })()
        : null

    // Incoming invites for this student
    const incomingInvites = !studentCreatedTeam && !studentMemberTeam
        ? eventTeams.flatMap(t =>
            (t.members ?? [])
                .filter(m => m.student_id === studentId && m.status === 'pending' && !!m.invited_by)
                .map(m => ({ teamMemberId: m.id, teamName: t.team_name, teamId: t.id }))
        )
        : []

    // Other teams
    const otherTeams = eventTeams.filter(t => t.created_by !== studentId)

    // IDs already in / pending for creator's team
    const creatorTeamMemberIds = studentCreatedTeam?.members?.map(m => m.student_id) ?? []

    function wrap(fn: () => Promise<{ success: boolean; error?: string }>) {
        setError(null)
        startTransition(async () => {
            const result = await fn()
            if (!result.success) setError(result.error ?? 'Something went wrong')
            else window.location.reload()
        })
    }

    function handleSendInvite(student: StudentSearchResult) {
        if (!studentCreatedTeam) return
        wrap(() => sendInviteAction({ team_id: studentCreatedTeam.id, student_id: student.id, event_id: event.id }))
    }

    function cancelCreateTeam() {
        setShowCreateTeam(false)
        setTeamName('')
        setSelectedMembers([])
        setError(null)
    }

    return (
        <div className="glass-premium" style={{ padding: 24 }}>
            {error && (
                <div style={{
                    padding: '12px 16px', marginBottom: 20, borderRadius: 'var(--r-md)',
                    background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                    fontSize: '0.875rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)',
                }}>
                    {error}
                </div>
            )}

            {/* ── Single participant ── */}
            {participantType === 'single' && (
                <div>
                    {isRegistered ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            {/* Payment status badge for paid events */}
                            {isPaid && paymentStatus && paymentStatus !== 'not_required' ? (
                                <>
                                    {paymentStatus === 'pending'   && <Badge variant="pending">⏳ Waiting for payment</Badge>}
                                    {paymentStatus === 'submitted' && <Badge variant="info">🔍 Under Review</Badge>}
                                    {paymentStatus === 'verified'  && <Badge variant="success">✓ Registered</Badge>}
                                    {paymentStatus === 'rejected'  && <Badge variant="failed">✗ Payment Rejected</Badge>}
                                </>
                            ) : (
                                <Badge variant="success">Registered</Badge>
                            )}
                            {canRegister && (paymentStatus === 'not_required' || paymentStatus === 'pending') && (
                                <Button size="sm" variant="danger" onClick={() => wrap(() => cancelRegistrationAction(existingReg.id))} loading={pending}>
                                    Cancel Registration
                                </Button>
                            )}
                        </div>
                    ) : canRegister ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Paid event preview */}
                            {isPaid && (
                                <div style={{
                                    padding: '10px 14px', borderRadius: 'var(--r-md)',
                                    background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
                                    fontSize: '0.875rem', color: 'var(--text-secondary)',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    <QrCode size={16} style={{ color: 'var(--accent)' }} />
                                    This is a paid event. Registration fee: <strong>₹{event.registration_fee?.toFixed(2)}</strong>
                                    {' '}— You will be asked to pay after registering.
                                </div>
                            )}
                            <Button onClick={() => wrap(() => registerForEventAction({ event_id: event.id }))} loading={pending}>
                                {isPaid ? '📋 Register & Proceed to Pay' : 'Register Now'}
                            </Button>
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                            Registration is {event.status !== 'open' ? 'closed' : 'past deadline'}
                        </span>
                    )}
                </div>
            )}

            {/* ── Team / Multiple participants ── */}
            {participantType === 'multiple' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {!studentCreatedTeam && studentMemberTeam && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <Badge variant="success">Registered</Badge>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Team: {studentMemberTeam.team_name}
                            </span>
                            {canRegister && (
                                <div className="w-full sm:w-auto mt-2 sm:mt-0">
                                    <Button size="sm" variant="danger" className="w-full sm:w-auto"
                                        onClick={() => {
                                            if (!confirm('Are you sure you want to leave this team?')) return
                                            wrap(() => leaveTeamAction({ team_id: studentMemberTeam.id, event_id: event.id }))
                                        }}
                                        loading={pending}>
                                        <LogOut size={14} /> Leave Team
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {incomingInvites.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Team Invitations
                            </div>
                            {incomingInvites.map(inv => (
                                <div key={inv.teamMemberId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-md border border-accent/30 bg-accent/5">
                                    <div>
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                            You&apos;ve been invited to join <span style={{ color: 'var(--accent)' }}>{inv.teamName}</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-row gap-2 w-full sm:w-auto">
                                        <Button size="sm" className="flex-1 sm:flex-none"
                                            onClick={() => wrap(() => acceptInviteAction({ team_member_id: inv.teamMemberId, event_id: event.id }))}
                                            loading={pending}>
                                            <Check size={14} /> Accept
                                        </Button>
                                        <Button size="sm" variant="danger" className="flex-1 sm:flex-none"
                                            onClick={() => wrap(() => declineInviteAction({ team_member_id: inv.teamMemberId, event_id: event.id }))}
                                            loading={pending}>
                                            <X size={14} /> Decline
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {studentCreatedTeam && (
                        <div style={{ padding: 16, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>
                                    Manage Team: {studentCreatedTeam.team_name}
                                </div>
                                {canRegister && (
                                    <Button size="sm" variant="danger" className="w-full sm:w-auto"
                                        onClick={() => {
                                            if (!confirm('Are you sure you want to delete this team? All members will be removed.')) return
                                            wrap(() => deleteTeamAction({ team_id: studentCreatedTeam.id, event_id: event.id }))
                                        }}
                                        loading={pending}>
                                        <Trash2 size={14} /> Delete Team
                                    </Button>
                                )}
                            </div>

                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                                Members ({studentCreatedTeam.members?.filter(m => m.status === 'approved').length ?? 0}{teamSize ? `/${teamSize}` : ''})
                            </div>
                            {studentCreatedTeam.members?.filter(m => m.status === 'approved').map(m => (
                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.875rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Badge variant="success">Approved</Badge>
                                        <span>{m.student?.name ?? m.student_id}</span>
                                        {m.student_id === studentId && <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>(you)</span>}
                                    </div>
                                    {m.student_id !== studentId && canRegister && (
                                        <button type="button"
                                            onClick={() => {
                                                if (!confirm(`Remove ${m.student?.name ?? 'this member'} from the team?`)) return
                                                wrap(() => removeMemberAction({ team_member_id: m.id, event_id: event.id }))
                                            }}
                                            disabled={pending} title="Remove member"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 4, display: 'flex', alignItems: 'center', opacity: pending ? 0.5 : 1 }}>
                                            <UserMinus size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {(studentCreatedTeam.members?.filter(m => m.status === 'pending' && !m.invited_by).length ?? 0) > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--warning)', marginBottom: 6 }}>
                                        Join Requests
                                    </div>
                                    {studentCreatedTeam.members?.filter(m => m.status === 'pending' && !m.invited_by).map(m => (
                                        <div key={m.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-2 border-b border-border/10 gap-2">
                                            <div>
                                                <span style={{ fontSize: '0.875rem' }}>{m.student?.name ?? m.student_id}</span>
                                                {m.student?.email && <span className="block sm:inline ml-0 sm:ml-2 text-xs text-text-tertiary">{m.student.email}</span>}
                                            </div>
                                            <div className="flex flex-row gap-2 w-full sm:w-auto">
                                                <Button size="sm" className="flex-1 sm:flex-none" onClick={() => wrap(() => approveJoinRequestAction({ team_member_id: m.id, event_id: event.id }))} loading={pending}>
                                                    <Check size={14} /> Approve
                                                </Button>
                                                <Button size="sm" variant="danger" className="flex-1 sm:flex-none" onClick={() => wrap(() => rejectJoinRequestAction({ team_member_id: m.id, event_id: event.id }))} loading={pending}>
                                                    <X size={14} /> Reject
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {(studentCreatedTeam.members?.filter(m => m.status === 'pending' && !!m.invited_by).length ?? 0) > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                                        Invite Sent — Awaiting Response
                                    </div>
                                    {studentCreatedTeam.members?.filter(m => m.status === 'pending' && !!m.invited_by).map(m => (
                                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                            <div>
                                                <span style={{ fontSize: '0.875rem' }}>{m.student?.name ?? m.student_id}</span>
                                                {m.student?.email && <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: 6 }}>{m.student.email}</span>}
                                            </div>
                                            <button type="button"
                                                onClick={() => wrap(() => rejectJoinRequestAction({ team_member_id: m.id, event_id: event.id }))}
                                                disabled={pending} title="Cancel invite"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 4, display: 'flex', alignItems: 'center', opacity: pending ? 0.5 : 1 }}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {canRegister && (() => {
                                const approvedCount = studentCreatedTeam.members?.filter(m => m.status === 'approved').length ?? 0
                                const isFull = teamSize ? approvedCount >= teamSize : false
                                return !isFull
                            })() && (
                                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                            Invite a Student
                                        </div>
                                        <StudentSearchInput
                                            excludeId={studentId}
                                            excludeIds={creatorTeamMemberIds}
                                            placeholder="Search student to invite..."
                                            onSelect={handleSendInvite}
                                        />
                                    </div>
                                )}
                        </div>
                    )}

                    {otherTeams.length > 0 && (
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                                {!studentMemberTeam && !studentCreatedTeam && canRegister ? 'Join an existing team:' : 'Other teams:'}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {otherTeams.map(team => {
                                    const approvedCount = team.members?.filter(m => m.status === 'approved').length ?? 0
                                    const isFull = teamSize ? approvedCount >= teamSize : false
                                    const myEntry = team.members?.find(m => m.student_id === studentId && m.status === 'pending')
                                    const hasPendingJoin = myEntry && !myEntry.invited_by
                                    const hasIncomingInvite = myEntry && !!myEntry.invited_by
                                    const canJoin = !studentMemberTeam && !studentCreatedTeam && canRegister && !isFull && !pendingJoinEntry

                                    return (
                                        <div key={team.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{team.team_name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                    {approvedCount}{teamSize ? `/${teamSize}` : ''} member{approvedCount !== 1 ? 's' : ''}
                                                </div>
                                            </div>

                                            {hasPendingJoin ? (
                                                <Badge variant="pending">Request Pending</Badge>
                                            ) : hasIncomingInvite ? (
                                                <Badge variant="pending">Invited</Badge>
                                            ) : !studentMemberTeam && !studentCreatedTeam && canRegister ? (
                                                isFull ? (
                                                    <Badge variant="failed">Full</Badge>
                                                ) : (
                                                    <div className="w-full sm:w-auto mt-2 sm:mt-0">
                                                        <Button size="sm" variant="outline" className="w-full sm:w-auto"
                                                            onClick={() => wrap(() => joinTeamAction({ team_id: team.id, event_id: event.id }))}
                                                            loading={pending} disabled={!canJoin}>
                                                            Request to Join
                                                        </Button>
                                                    </div>
                                                )
                                            ) : (
                                                isFull ? <Badge variant="failed">Full</Badge> : <Badge variant="pending">{approvedCount === 0 ? 'Vacant' : 'Open'}</Badge>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {!studentCreatedTeam && !studentMemberTeam && canRegister && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {pendingJoinEntry && (
                                <div style={{
                                    padding: '10px 14px', borderRadius: 'var(--r-md)',
                                    background: 'var(--warning-bg)', color: 'var(--warning)',
                                    fontSize: '0.875rem', fontWeight: 500,
                                    border: '1px solid rgba(245, 166, 35, 0.3)',
                                }}>
                                    Your join request to <strong>{pendingJoinEntry.teamName}</strong> is pending.
                                    Creating a team will automatically cancel it.
                                </div>
                            )}

                            {!showCreateTeam ? (
                                <Button variant="outline" onClick={() => setShowCreateTeam(true)}>
                                    <Users2 size={16} /> Create Team {teamSize ? `(Size: ${teamSize})` : ''}
                                </Button>
                            ) : (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', gap: 12,
                                    padding: 16, borderRadius: 'var(--r-md)',
                                    border: '1px solid var(--border)', background: 'var(--bg-surface)',
                                }}>
                                    <div className="registration-action__details">
                                        <div className="registration-action__info">
                                            <h3 className="registration-action__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>{event.title}</span>
                                                {teamSize && <Badge variant="info">Team of {teamSize}</Badge>}
                                            </h3>
                                            <div className="registration-action__meta">
                                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>
                                                    Team Name <span style={{ color: 'var(--error)' }}>*</span>
                                                </label>
                                                <input
                                                    className="form-input"
                                                    value={teamName}
                                                    onChange={e => setTeamName(e.target.value)}
                                                    placeholder="Enter team name..."
                                                />
                                            </div>
                                            <MemberSearch
                                                excludeId={studentId}
                                                selectedMembers={selectedMembers}
                                                onAdd={s => setSelectedMembers(prev => [...prev, s])}
                                                onRemove={id => setSelectedMembers(prev => prev.filter(m => m.id !== id))}
                                                maxMembers={teamSize ?? undefined}
                                            />
                                            {selectedMembers.length > 0 && (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: 0 }}>
                                                    Invited members will see the invite and can accept or decline.
                                                </p>
                                            )}
                                            <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                                <Button className="w-full sm:w-auto"
                                                    onClick={() => wrap(() => createTeamAction({
                                                        event_id: event.id,
                                                        team_name: teamName.trim(),
                                                        member_ids: selectedMembers.map(m => m.id),
                                                    }))}
                                                    loading={pending} disabled={!teamName.trim()}>
                                                    Create Team
                                                </Button>
                                                <Button variant="outline" className="w-full sm:w-auto" onClick={cancelCreateTeam} disabled={pending}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!studentMemberTeam && !studentCreatedTeam && !canRegister && (
                                <div style={{ padding: '12px 16px', borderRadius: 'var(--r-md)', background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Badge variant="pending">Info</Badge>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                                        Registration is {event.status !== 'open' ? 'closed' : 'past deadline'}. Team modifications are restricted.
                                    </span>
                                </div>
                            )}
                            {(studentCreatedTeam || studentMemberTeam) && !canRegister && (
                                <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    ℹ️ Event is {event.status !== 'open' ? event.status : 'past deadline'}. Team changes are no longer allowed.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Root export ────────────────────────────────────────────────

export function StudentEventActions({ event, registration, teams, winners, studentId, isDeadlinePassed }: StudentEventActionsProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <RegistrationAction
                event={event}
                participantType={event.participant_type}
                teamSize={event.team_size}
                existingReg={registration}
                teams={teams}
                studentId={studentId}
                isDeadlinePassed={isDeadlinePassed}
            />
            {/* Payment proof upload — shown only for paid events where student has registered */}
            {event.is_paid && registration && registration.payment_status !== 'not_required' && (
                <PaymentProofUpload registration={registration} event={event} />
            )}
            {event.results_published && <WinnersDisplay winners={winners} />}
        </div>
    )
}