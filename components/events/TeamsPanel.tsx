'use client'

import React, { useState, useTransition, useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Users, Trash2, Plus, UserPlus, Star, UserMinus, UserX, Phone, Search } from 'lucide-react'
import type { Team, IndividualRegistration, Event } from '@/lib/types/db'
import { createTeam, deleteTeam } from '@/lib/actions/teams'
import { AddParticipantModal } from '@/components/admin/AddParticipantModal'
import { usePathname } from 'next/navigation'
import { transferLeadershipAction, removeMemberAction, deleteRegistrationAction } from '@/lib/actions/registrationActions'

const PAYMENT_LABELS: Record<string, string> = {
    'pending': 'Awaiting Payment',
    'submitted': 'Proof Submitted',
    'verified': 'Verified',
    'rejected': 'Rejected',
    'refund_requested': 'Refund Requested',
    'refunded': 'Refunded',
}

function paymentBadgeVariant(status: string) {
    if (status === 'verified') return 'generated' as const
    if (status === 'submitted') return 'processing' as const
    if (status === 'rejected') return 'failed' as const
    if (status === 'refunded') return 'failed' as const
    if (status === 'refund_requested') return 'pending' as const
    return 'pending' as const
}

interface TeamsPanelProps {
    event: Event
    teams: Team[]
    registrations: IndividualRegistration[]
    isFIC?: boolean
    userRole?: string
}

export function TeamsPanel({ event, teams, registrations, isFIC = false, userRole }: TeamsPanelProps) {
    const [isCreating, startCreate] = useTransition()
    const [isDeleting, startDelete] = useTransition()
    const [newTeamName, setNewTeamName] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [editingLeaderId, setEditingLeaderId] = useState<string | null>(null)
    const [error, setError] = useState('')
    const [pendingTransfer, startTransfer] = useTransition()
    const [searchQuery, setSearchQuery] = useState('')

    const [showAddModal, setShowAddModal] = useState(false)
    const [modalTeamId, setModalTeamId] = useState<string | undefined>()
    const [modalStudent, setModalStudent] = useState<{ id: string; name: string } | undefined>()
    const [isActionPending, startAction] = useTransition()

    const canManage = userRole === 'admin' || isFIC

    const mappedTeams = useMemo(() => {
        return teams.map(t => {
            const members = registrations.filter(r => r.team_id === t.id)
            return {
                ...t,
                memberCount: members.length,
                members: members.map(m => {
                    const tmRecord = t.members?.find(tm => tm.student_id === m.student_id)
                    let status = m.payment_status
                    // 1. For team events, prioritize team payment status
                    if (event.is_paid && t.payment_status && t.payment_status !== 'not_required') {
                        status = t.payment_status
                    }
                    // 2. For any paid event, fallback to 'pending' if status is 'not_required'
                    if (event.is_paid && status === 'not_required') {
                        status = 'pending'
                    }
                    return { ...m, team_member_id: tmRecord?.id, payment_status: status }
                })
            }
        })
    }, [teams, registrations, event.is_paid])

    const filteredTeams = useMemo(() => {
        if (!searchQuery.trim()) return mappedTeams
        const query = searchQuery.toLowerCase()
        return mappedTeams.filter(t => {
            const teamNameMatch = t.team_name.toLowerCase().includes(query)
            const studentMatch = t.members.some(m => m.student?.name?.toLowerCase().includes(query))
            return teamNameMatch || studentMatch
        })
    }, [mappedTeams, searchQuery])

    const ungroupedRegistrations = useMemo(() => {
        const ungrouped = registrations.filter(r => !r.team_id)
        const processed = ungrouped.map(r => {
            let status = r.payment_status
            if (event.is_paid && status === 'not_required') {
                status = 'pending'
            }
            return { ...r, payment_status: status }
        })
        if (!searchQuery.trim()) return processed
        const query = searchQuery.toLowerCase()
        return processed.filter(r => r.student?.name?.toLowerCase().includes(query))
    }, [registrations, searchQuery, event.is_paid])

    async function handleCreateTeam() {
        if (!newTeamName.trim()) { setError('Team name is required'); return }
        setError('')
        startCreate(async () => {
            const res = await createTeam(event.id, newTeamName)
            if (res.success) { setNewTeamName(''); setShowCreateForm(false) }
            else { setError(res.error || 'Failed to create team') }
        })
    }

    async function handleDeleteTeam(teamId: string) {
        if (!confirm('Are you sure you want to delete this team?')) return
        startDelete(async () => {
            const res = await deleteTeam(teamId)
            if (!res.success) alert(res.error || 'Failed to delete team')
        })
    }

    async function handleTransferLeadership(teamId: string, newLeaderId: string) {
        if (!newLeaderId) return
        startTransfer(async () => {
            const res = await transferLeadershipAction({ team_id: teamId, new_leader_id: newLeaderId, event_id: event.id })
            if (res.success) setEditingLeaderId(null)
            else alert(res.error || 'Failed to transfer leadership')
        })
    }

    async function handleRemoveMember(teamMemberId: string) {
        if (!confirm('Remove this student from the team? They will be moved to Ungrouped.')) return
        startAction(async () => {
            const res = await removeMemberAction({ team_member_id: teamMemberId, event_id: event.id })
            if (!res.success) alert(res.error || 'Failed to remove member')
        })
    }

    async function handleDeleteRegistration(registrationId: string) {
        if (!confirm('Are you sure you want to delete this registration entirely?')) return
        startAction(async () => {
            const res = await deleteRegistrationAction(registrationId)
            if (!res.success) alert(res.error || 'Failed to delete registration')
        })
    }

    // ── Shared sub-component: Team Header  ─────────────────────────
    function TeamHeader({ t }: { t: typeof mappedTeams[number] }) {
        return (
            <div className="teams-card-header">
                <div className="teams-card-header__left">
                    <Users size={16} className="text-accent shrink-0" />
                    <span className="teams-card-header__name">{t.team_name}</span>
                    <Badge variant={t.memberCount === event.team_size ? 'success' : 'info'} style={{ fontSize: '10px' }}>
                        {t.memberCount} / {event.team_size || '∞'}
                    </Badge>
                </div>
                <div className="teams-card-header__meta">
                    {editingLeaderId === t.id ? (
                        <select
                            className="form-select"
                            style={{ padding: '2px 4px', fontSize: '11px', minWidth: '120px' }}
                            defaultValue={t.leader_id}
                            onChange={(e) => handleTransferLeadership(t.id, e.target.value)}
                            onBlur={() => setEditingLeaderId(null)}
                            autoFocus
                            disabled={pendingTransfer}
                        >
                            <option value="" disabled>Select Leader</option>
                            {t.members.map(m => (
                                <option key={m.student_id} value={m.student_id}>{m.student?.name}</option>
                            ))}
                        </select>
                    ) : (
                        <div className="flex items-center gap-2 text-[11px] font-medium text-text-secondary">
                            <Star size={11} className={t.leader_id ? "text-warning" : "text-text-tertiary"} fill={t.leader_id ? "currentColor" : "none"} />
                            <span>Leader: {t.members.find(m => m.student_id === t.leader_id)?.student?.name || 'None'}</span>
                        </div>
                    )}
                    <span className="text-[10px] text-text-tertiary hidden sm:inline">
                        Created by: {t.members.find(m => m.student_id === t.created_by)?.student?.name || 'Admin'}
                    </span>
                </div>
                {canManage && (
                    <div className="teams-card-header__actions">
                        {event.status === 'open' && (
                            <Button
                                variant="ghost" size="sm"
                                style={{ padding: '4px', height: '28px', width: '28px' }}
                                onClick={() => { setModalTeamId(t.id); setModalStudent(undefined); setShowAddModal(true) }}
                                disabled={event.team_size ? t.memberCount >= event.team_size : false}
                                title="Add Member"
                            >
                                <UserPlus size={14} />
                            </Button>
                        )}
                        {!editingLeaderId && t.members.length > 0 && (
                            <Button
                                variant="ghost" size="sm"
                                style={{ padding: '4px', height: '28px', width: '28px' }}
                                onClick={() => setEditingLeaderId(t.id)}
                                title="Change Leader"
                            >
                                <Star size={14} />
                            </Button>
                        )}
                        <Button
                            variant="ghost" size="sm"
                            style={{ color: 'var(--danger)', padding: '4px', height: '28px', width: '28px' }}
                            onClick={() => handleDeleteTeam(t.id)}
                            disabled={isDeleting}
                            title="Delete Team"
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                )}
            </div>
        )
    }

    // ── Shared sub-component: Member Card (mobile) ──────────────────
    function MemberCardMobile({ m, t }: { m: typeof mappedTeams[number]['members'][number]; t: typeof mappedTeams[number] }) {
        return (
            <div className="teams-member-card">
                {/* Row 1: Name + badges + action — all on one line */}
                <div className="teams-member-card__top">
                    <span className="text-sm font-semibold truncate flex-1 min-w-0">{m.student?.name}</span>
                    {m.student_id === t.leader_id && <Badge variant="winner" style={{ fontSize: '9px', padding: '0 4px' }}>Leader</Badge>}
                    <Badge
                        variant={paymentBadgeVariant(m.payment_status)}
                        style={{ fontSize: '9px', padding: '1px 6px' }}
                    >
                        {PAYMENT_LABELS[m.payment_status] ?? m.payment_status.replace('_', ' ')}
                    </Badge>
                    {canManage && m.team_member_id && (
                        <Button
                            variant="ghost" size="sm"
                            style={{ height: '22px', width: '22px', padding: 0 }}
                            onClick={() => handleRemoveMember(m.team_member_id!)}
                            title="Remove"
                            disabled={isActionPending}
                        >
                            <UserMinus size={13} />
                        </Button>
                    )}
                </div>
                {/* Row 2: Email */}
                <span className="text-[11px] text-text-tertiary truncate block mt-0.5">{m.student?.email}</span>
                {/* Row 3: Phone + Programme */}
                <div className="teams-member-card__details">
                    {m.student?.phone_number && (
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                            <Phone size={11} className="text-text-tertiary" style={{ marginLeft: '1px' }} />
                            <span>{m.student.phone_number}</span>
                        </div>
                    )}
                    {m.student?.programme && (
                        <span className="text-xs text-text-secondary">
                            {m.student.programme} {m.student?.semester ? `(S${m.student.semester})` : ''}
                        </span>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div>
            {/* ── Toolbar: Search + Create ── */}
            <div className="teams-toolbar">
                <div
                    className="teams-search-bar group"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flex: '1 1 0',
                        height: '44px',
                        padding: '0 16px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                >
                    <Search
                        size={17}
                        className="shrink-0 text-text-tertiary group-focus-within:text-accent transition-colors duration-200"
                    />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search teams or students..."
                        style={{
                            flex: 1, height: '100%', background: 'transparent',
                            border: 'none', outline: 'none', fontSize: '0.9375rem',
                            color: 'var(--text-primary)', padding: 0, minHeight: 'auto',
                        }}
                    />
                </div>

                {canManage && (
                    <div className="flex items-center shrink-0">
                        {!showCreateForm ? (
                            <Button
                                size="sm"
                                onClick={() => setShowCreateForm(true)}
                                className="teams-create-btn whitespace-nowrap h-[44px] px-5 rounded-[10px] font-semibold shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                            >
                                <Plus size={16} />
                                <span className="teams-btn-label--full">Create Team</span>
                                <span className="teams-btn-label--short">Create</span>
                            </Button>
                        ) : (
                            <div className="teams-create-form">
                                <input
                                    className="form-input"
                                    style={{ padding: '6px 10px', fontSize: '13px', width: '140px', borderRadius: '8px' }}
                                    placeholder="Team name..."
                                    value={newTeamName}
                                    onChange={e => setNewTeamName(e.target.value)}
                                    autoFocus
                                />
                                <div className="flex gap-1.5">
                                    <Button size="sm" style={{ padding: '5px 12px', fontSize: '13px' }} onClick={handleCreateTeam} loading={isCreating}>Save</Button>
                                    <Button variant="ghost" size="sm" style={{ padding: '5px 12px', fontSize: '13px' }} onClick={() => { setShowCreateForm(false); setError(''); setNewTeamName('') }} disabled={isCreating}>Cancel</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

            {teams.length === 0 ? (
                <EmptyState icon={Users} title="No teams yet" subtitle="There are no teams created for this event." />
            ) : filteredTeams.length === 0 && searchQuery ? (
                <EmptyState icon={Search} title="No matches found" subtitle={`No teams or students match "${searchQuery}"`} />
            ) : (
                <>
                    {/* ── DESKTOP: Table layout (hidden on mobile) ── */}
                    <div className="resp-table">
                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Student / Details</th>
                                        <th>Phone Number</th>
                                        <th>Program / Sem</th>
                                        <th>Payment</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTeams.map(t => (
                                        <React.Fragment key={t.id}>
                                            <tr className="bg-muted/40 font-bold border-t-2 border-border/10">
                                                <td colSpan={3} className="py-2.5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <Users size={16} className="text-accent" />
                                                        <span className="text-[13px] uppercase tracking-wider font-bold">{t.team_name}</span>
                                                        <Badge variant={t.memberCount === event.team_size ? 'success' : 'info'} style={{ fontSize: '10px' }}>
                                                            {t.memberCount} / {event.team_size || '∞'}
                                                        </Badge>
                                                        <div className="h-4 w-[1px] bg-border mx-1" />
                                                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
                                                            {editingLeaderId === t.id ? (
                                                                <select
                                                                    className="form-select"
                                                                    style={{ padding: '2px 4px', fontSize: '11px', minWidth: '120px' }}
                                                                    defaultValue={t.leader_id}
                                                                    onChange={(e) => handleTransferLeadership(t.id, e.target.value)}
                                                                    onBlur={() => setEditingLeaderId(null)}
                                                                    autoFocus disabled={pendingTransfer}
                                                                >
                                                                    <option value="" disabled>Select Leader</option>
                                                                    {t.members.map(m => (
                                                                        <option key={m.student_id} value={m.student_id}>{m.student?.name}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <Star size={11} className={t.leader_id ? "text-warning" : "text-text-tertiary"} fill={t.leader_id ? "currentColor" : "none"} />
                                                                    <span>Leader: {t.members.find(m => m.student_id === t.leader_id)?.student?.name || 'None'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2.5">
                                                    <span className="text-[10px] text-text-tertiary uppercase tracking-tighter">Created by: {t.members.find(m => m.student_id === t.created_by)?.student?.name || 'Admin'}</span>
                                                </td>
                                                <td className="py-2.5 pr-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        {canManage && (
                                                            <>
                                                                {event.status === 'open' && (
                                                                    <Button variant="ghost" size="sm" style={{ padding: '4px', height: '28px', width: '28px' }}
                                                                        onClick={() => { setModalTeamId(t.id); setModalStudent(undefined); setShowAddModal(true) }}
                                                                        disabled={event.team_size ? t.memberCount >= event.team_size : false} title="Add Member"
                                                                    ><UserPlus size={14} /></Button>
                                                                )}
                                                                {!editingLeaderId && t.members.length > 0 && (
                                                                    <Button variant="ghost" size="sm" style={{ padding: '4px', height: '28px', width: '28px' }}
                                                                        onClick={() => setEditingLeaderId(t.id)} title="Change Leader"
                                                                    ><Star size={14} /></Button>
                                                                )}
                                                                <Button variant="ghost" size="sm" style={{ color: 'var(--danger)', padding: '4px', height: '28px', width: '28px' }}
                                                                    onClick={() => handleDeleteTeam(t.id)} disabled={isDeleting} title="Delete Team"
                                                                ><Trash2 size={14} /></Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {t.members.length === 0 ? (
                                                <tr><td colSpan={5} className="py-4 text-center text-text-tertiary italic text-xs bg-card/20">No members assigned yet</td></tr>
                                            ) : (
                                                t.members.map(m => (
                                                    <tr key={m.student_id} className="hover:bg-accent/5 group border-b border-border/5 last:border-0">
                                                        <td>
                                                            <div className="flex items-center gap-2 ml-4">
                                                                <div className="w-1 h-1 rounded-full bg-accent/40" />
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium">{m.student?.name}</span>
                                                                    <span className="text-[10px] text-text-tertiary">{m.student?.email}</span>
                                                                </div>
                                                                {m.student_id === t.leader_id && <Badge variant="winner" className="text-[9px] py-0 px-1 ml-1">Leader</Badge>}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                                                                <Phone size={10} className="text-text-tertiary" />
                                                                {m.student?.phone_number || '—'}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="text-xs text-text-secondary">
                                                                {m.student?.programme} {m.student?.semester ? `(S${m.student.semester})` : ''}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <Badge variant={paymentBadgeVariant(m.payment_status)} style={{ fontSize: '9px', padding: '1px 6px' }}>
                                                                {PAYMENT_LABELS[m.payment_status] ?? m.payment_status.replace('_', ' ')}
                                                            </Badge>
                                                        </td>
                                                        <td className="text-right">
                                                            {canManage && m.team_member_id && (
                                                                <Button variant="ghost" size="sm" style={{ height: '24px', width: '24px', padding: 0 }}
                                                                    onClick={() => handleRemoveMember(m.team_member_id!)}
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Remove from Team" disabled={isActionPending}
                                                                ><UserMinus size={14} /></Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                            <tr className="h-3 pointer-events-none border-0">
                                                <td colSpan={5} className="bg-transparent border-0 py-1"></td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── MOBILE: Card layout (hidden on desktop) ── */}
                    <div className="resp-cards">
                        {filteredTeams.map(t => (
                            <div key={t.id} className="teams-card">
                                <TeamHeader t={t} />
                                <div className="teams-card-body">
                                    {t.members.length === 0 ? (
                                        <p className="text-text-tertiary italic text-xs text-center py-4">No members assigned yet</p>
                                    ) : (
                                        t.members.map(m => <MemberCardMobile key={m.student_id} m={m} t={t} />)
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ── Ungrouped Participants ── */}
            {canManage && ungroupedRegistrations.length > 0 && (
                <div style={{ marginTop: 40 }}>
                    <h3 className="section-title flex items-center gap-2 mb-4" style={{ fontSize: '1.1rem' }}>
                        <Users size={18} className="text-accent" /> Ungrouped Participants
                    </h3>

                    {/* Desktop table */}
                    <div className="resp-table">
                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Phone Number</th>
                                        <th>Program / Sem</th>
                                        <th>Payment Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ungroupedRegistrations.map(r => (
                                        <tr key={r.id}>
                                            <td><div className="flex flex-col"><span className="font-semibold">{r.student?.name}</span><span className="text-xs text-text-tertiary">{r.student?.email}</span></div></td>
                                            <td>{r.student?.phone_number ? (<div className="flex items-center gap-1 text-sm"><Phone size={12} className="text-text-tertiary" /> {r.student.phone_number}</div>) : <span className="text-text-tertiary italic text-xs">—</span>}</td>
                                            <td><span className="text-sm">{r.student?.programme} {r.student?.semester ? `(Sem ${r.student.semester})` : ''}</span></td>
                                            <td><Badge variant={paymentBadgeVariant(r.payment_status)}>{PAYMENT_LABELS[r.payment_status] ?? r.payment_status.replace('_', ' ')}</Badge></td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                    {event.status === 'open' && (
                                                        <Button variant="ghost" size="sm" onClick={() => { setModalTeamId(undefined); setModalStudent({ id: r.student_id, name: r.student?.name || '' }); setShowAddModal(true) }} title="Add to Team"><UserPlus size={14} /></Button>
                                                    )}
                                                    <Button variant="ghost" size="sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteRegistration(r.id)} disabled={isActionPending} title="Delete Registration"><UserX size={14} /></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile cards */}
                    <div className="resp-cards">
                        {ungroupedRegistrations.map(r => (
                            <div key={r.id} className="teams-member-card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px' }}>
                                <div className="teams-member-card__top">
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span className="text-sm font-semibold truncate">{r.student?.name}</span>
                                        <span className="text-[11px] text-text-tertiary truncate">{r.student?.email}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Badge variant={paymentBadgeVariant(r.payment_status)} style={{ fontSize: '9px', padding: '1px 6px' }}>{PAYMENT_LABELS[r.payment_status] ?? r.payment_status.replace('_', ' ')}</Badge>
                                        {event.status === 'open' && (
                                            <Button variant="ghost" size="sm" style={{ height: '24px', width: '24px', padding: 0 }}
                                                onClick={() => { setModalTeamId(undefined); setModalStudent({ id: r.student_id, name: r.student?.name || '' }); setShowAddModal(true) }} title="Add to Team"
                                            ><UserPlus size={13} /></Button>
                                        )}
                                        <Button variant="ghost" size="sm" style={{ color: 'var(--danger)', height: '24px', width: '24px', padding: 0 }}
                                            onClick={() => handleDeleteRegistration(r.id)} disabled={isActionPending} title="Delete"
                                        ><UserX size={13} /></Button>
                                    </div>
                                </div>
                                <div className="teams-member-card__details">
                                    {r.student?.phone_number && (
                                        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                                            <Phone size={11} className="text-text-tertiary" /><span>{r.student.phone_number}</span>
                                        </div>
                                    )}
                                    {r.student?.programme && (
                                        <span className="text-xs text-text-secondary">{r.student.programme} {r.student?.semester ? `(Sem ${r.student.semester})` : ''}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Participant Modal */}
            {canManage && (
                <AddParticipantModal
                    eventId={event.id}
                    eventType="team"
                    isPaid={event.is_paid}
                    teams={mappedTeams.map(m => ({ id: m.id, team_name: m.team_name, memberCount: m.memberCount }))}
                    teamSize={event.team_size || undefined}
                    open={showAddModal}
                    onClose={() => { setShowAddModal(false); setModalTeamId(undefined); setModalStudent(undefined) }}
                    onSuccess={() => { setShowAddModal(false); setModalTeamId(undefined); setModalStudent(undefined); window.location.reload() }}
                    preselectedUser={modalStudent}
                    preselectedTeamId={modalTeamId}
                />
            )}
        </div>
    )
}
