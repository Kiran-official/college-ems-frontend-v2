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
} from '@/lib/actions/registrationActions'
import { searchStudentsForInviteAction } from '@/lib/actions/userActions'
import { Users2, Trash2, Check, X, Search, Loader2, UserPlus, LogOut, UserMinus } from 'lucide-react'
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

// ... [restoring StudentSearchInput and MemberSearch] ...

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Badge variant="success">Registered</Badge>
                            {canRegister && (
                                <Button size="sm" variant="danger" onClick={() => wrap(() => cancelRegistrationAction(existingReg.id))} loading={pending}>
                                    Cancel Registration
                                </Button>
                            )}
                        </div>
                    ) : canRegister ? (
                        <Button onClick={() => wrap(() => registerForEventAction({ event_id: event.id }))} loading={pending}>
                            Register Now
                        </Button>
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
            {event.results_published && <WinnersDisplay winners={winners} />}
        </div>
    )
}