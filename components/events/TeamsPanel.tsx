'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Users, Trash2, Plus, UserPlus } from 'lucide-react'
import type { Team, IndividualRegistration, Event } from '@/lib/types/db'
import { createTeam, deleteTeam } from '@/lib/actions/teams'
import { AddParticipantModal } from '@/components/admin/AddParticipantModal'
import { usePathname } from 'next/navigation'

interface TeamsPanelProps {
    event: Event
    teams: Team[]
    registrations: IndividualRegistration[]
}

export function TeamsPanel({ event, teams, registrations }: TeamsPanelProps) {
    const [isCreating, startCreate] = useTransition()
    const [isDeleting, startDelete] = useTransition()
    const [newTeamName, setNewTeamName] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [error, setError] = useState('')

    // Participant Modal State
    const [showAddModal, setShowAddModal] = useState(false)
    const [modalTeamId, setModalTeamId] = useState<string | undefined>()

    const pathname = usePathname()
    const isAdminOrTeacher = pathname.includes('/admin') || pathname.includes('/teacher')

    const mappedTeams = teams.map(t => {
        const members = registrations.filter(r => r.team_id === t.id)
        return {
            ...t,
            memberCount: members.length,
            members
        }
    })

    async function handleCreateTeam() {
        if (!newTeamName.trim()) {
            setError('Team name is required')
            return
        }
        setError('')
        startCreate(async () => {
            const res = await createTeam(event.id, newTeamName)
            if (res.success) {
                setNewTeamName('')
                setShowCreateForm(false)
            } else {
                setError(res.error || 'Failed to create team')
            }
        })
    }

    async function handleDeleteTeam(teamId: string) {
        if (!confirm('Are you sure you want to delete this team?')) return
        startDelete(async () => {
            const res = await deleteTeam(teamId)
            if (!res.success) {
                alert(res.error || 'Failed to delete team')
            }
        })
    }

    return (
        <div>
            {isAdminOrTeacher && (
                <div style={{ paddingBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
                    {!showCreateForm ? (
                        <Button size="sm" onClick={() => setShowCreateForm(true)}>
                            <Plus size={14} /> Create Team
                        </Button>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-card p-2 sm:p-3 rounded-md border border-border w-full sm:w-auto">
                            <input 
                                className="form-input w-full sm:w-[200px]" 
                                style={{ padding: '6px 10px', fontSize: '13px' }} 
                                placeholder="New team name..." 
                                value={newTeamName} 
                                onChange={e => setNewTeamName(e.target.value)} 
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button size="sm" className="flex-1" onClick={handleCreateTeam} loading={isCreating}>Save</Button>
                                <Button variant="ghost" className="flex-1" size="sm" onClick={() => { setShowCreateForm(false); setError(''); setNewTeamName(''); }} disabled={isCreating}>Cancel</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            
            {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

            {teams.length === 0 ? (
                <EmptyState icon={Users} title="No teams yet" subtitle="There are no teams created for this event." />
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Team Name</th>
                                <th>Members</th>
                                <th>Created By</th>
                                {isAdminOrTeacher && <th style={{ textAlign: 'right' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {mappedTeams.map(t => (
                                <tr key={t.id}>
                                    <td data-label="Team Name" style={{ fontWeight: 500 }}>{t.team_name}</td>
                                    <td data-label="Members">
                                        <Badge variant={t.memberCount === event.team_size ? 'success' : 'info'}>
                                            {t.memberCount} / {event.team_size || '∞'}
                                        </Badge>
                                    </td>
                                    <td data-label="Created By">
                                        {/* Identify who created it among the members, fallback if empty */}
                                        {t.members.find(m => m.student_id === t.created_by)?.student?.name || 'Admin'}
                                    </td>
                                    {isAdminOrTeacher && (
                                        <td data-label="Actions" style={{ textAlign: 'right' }}>
                                            <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                {event.status === 'open' && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => {
                                                            setModalTeamId(t.id)
                                                            setShowAddModal(true)
                                                        }}
                                                        disabled={event.team_size ? t.memberCount >= event.team_size : false}
                                                        title="Add Member"
                                                    >
                                                        <UserPlus size={14} />
                                                    </Button>
                                                )}
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    style={{ color: 'var(--danger)' }} 
                                                    onClick={() => handleDeleteTeam(t.id)}
                                                    disabled={t.memberCount > 0 || isDeleting || event.status !== 'open'}
                                                    title={t.memberCount > 0 ? "Remove members first" : "Delete Team"}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reusing AddParticipantModal */}
            {isAdminOrTeacher && (
                <AddParticipantModal 
                    eventId={event.id}
                    eventType="team"
                    teams={mappedTeams.map(m => ({ id: m.id, team_name: m.team_name, memberCount: m.memberCount }))}
                    teamSize={event.team_size || undefined}
                    open={showAddModal}
                    onClose={() => {
                        setShowAddModal(false)
                        setModalTeamId(undefined)
                    }}
                    onSuccess={() => {
                        setShowAddModal(false)
                        setModalTeamId(undefined)
                        window.location.reload()
                    }}
                />
            )}
        </div>
    )
}
