'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { registerForEventAction, cancelRegistrationAction, createTeamAction, joinTeamAction } from '@/lib/actions/registrationActions'
import { Trophy, Users2 } from 'lucide-react'
import type { Event, EventCategory, Team, Winner } from '@/lib/types/db'

interface StudentEventActionsProps {
    event: Event
    categories: EventCategory[]
    registrationMap: Record<string, any> // category_id or '__event__' → registration
    teams: Team[]
    winners: Winner[]
    studentId: string
    isDeadlinePassed: boolean
}

function WinnersDisplay({ winners }: { winners: Winner[] }) {
    if (winners.length === 0) return null
    return (
        <div className="glass" style={{ padding: 20, marginTop: 24 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 12 }}>🏆 Results</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {winners.map(w => (
                    <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Badge variant="winner">{w.position_label}</Badge>
                        <span style={{ fontWeight: 600 }}>
                            {w.winner_type === 'student' ? w.student?.name : (w.team as any)?.team_name}
                        </span>
                        {w.tags && w.tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 4 }}>
                                {w.tags.map(tag => (
                                    <span key={tag} className="winner-tag">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function RegistrationAction({
    event, categoryId, categoryName, participantType, teamSize,
    existingReg, teams, studentId, isDeadlinePassed,
}: {
    event: Event
    categoryId?: string
    categoryName?: string
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
<<<<<<< HEAD
    const [error, setError] = useState<string | null>(null)
=======
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229

    const canRegister = event.status === 'open' && !isDeadlinePassed
    const isRegistered = !!existingReg

    function register() {
<<<<<<< HEAD
        setError(null)
        startTransition(async () => {
            const result = await registerForEventAction({ event_id: event.id, category_id: categoryId })
            if (!result.success) {
                setError(result.error ?? 'Registration failed')
                return
            }
=======
        startTransition(async () => {
            await registerForEventAction({ event_id: event.id, category_id: categoryId })
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
            window.location.reload()
        })
    }

    function cancel() {
        if (!existingReg) return
<<<<<<< HEAD
        setError(null)
        startTransition(async () => {
            const result = await cancelRegistrationAction(existingReg.id)
            if (!result.success) {
                setError(result.error ?? 'Cancellation failed')
                return
            }
=======
        startTransition(async () => {
            await cancelRegistrationAction(existingReg.id)
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
            window.location.reload()
        })
    }

    function handleCreateTeam() {
        if (!teamName.trim()) return
<<<<<<< HEAD
        setError(null)
        startTransition(async () => {
            const result = await createTeamAction({
=======
        startTransition(async () => {
            await createTeamAction({
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
                event_id: event.id,
                category_id: categoryId,
                team_name: teamName.trim(),
                member_ids: [],
            })
<<<<<<< HEAD
            if (!result.success) {
                setError(result.error ?? 'Failed to create team')
                return
            }
=======
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
            window.location.reload()
        })
    }

    function handleJoinTeam(teamId: string) {
<<<<<<< HEAD
        setError(null)
        startTransition(async () => {
            const result = await joinTeamAction({ team_id: teamId, event_id: event.id, category_id: categoryId })
            if (!result.success) {
                setError(result.error ?? 'Failed to join team')
                return
            }
=======
        startTransition(async () => {
            await joinTeamAction({ team_id: teamId, event_id: event.id, category_id: categoryId })
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
            window.location.reload()
        })
    }

    const categoryTeams = teams.filter(t =>
        categoryId ? t.category_id === categoryId : !t.category_id
    )

    return (
        <div className="glass" style={{ padding: 20 }}>
<<<<<<< HEAD
            {error && (
                <div style={{
                    padding: '10px 14px', marginBottom: 12, borderRadius: 'var(--r-md)',
                    background: 'var(--danger-bg, #fef2f2)', color: 'var(--danger, #dc2626)',
                    fontSize: '0.875rem', fontWeight: 500,
                    border: '1px solid var(--danger, #dc2626)',
                }}>
                    ⚠ {error}
                </div>
            )}
=======
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
            {categoryName && (
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: 'var(--accent)' }}>
                    {categoryName}
                </h4>
            )}

            {/* Single participant */}
            {participantType === 'single' && (
                <div>
                    {isRegistered ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Badge variant="generated">✓ Registered</Badge>
                            {canRegister && (
                                <Button size="sm" variant="danger" onClick={cancel} loading={pending}>
                                    Cancel Registration
                                </Button>
                            )}
                        </div>
                    ) : canRegister ? (
                        <Button onClick={register} loading={pending}>
                            Register Now
                        </Button>
                    ) : (
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                            Registration is {event.status !== 'open' ? 'closed' : 'past deadline'}
                        </span>
                    )}
                </div>
            )}

            {/* Team / Multiple participants */}
            {participantType === 'multiple' && (
                <div>
                    {isRegistered ? (
                        <div>
                            <Badge variant="generated">✓ Registered</Badge>
                            {existingReg.team && (
                                <span style={{ marginLeft: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Team: {(existingReg.team as any)?.team_name}
                                </span>
                            )}
                            {canRegister && (
                                <Button size="sm" variant="danger" onClick={cancel} loading={pending} style={{ marginLeft: 12 }}>
                                    Leave / Cancel
                                </Button>
                            )}
                        </div>
                    ) : canRegister ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Existing teams to join */}
                            {categoryTeams.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                                        Join an existing team:
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {categoryTeams.map(team => {
                                            const isFull = teamSize ? (team.members?.length ?? 0) >= teamSize : false
                                            return (
                                                <div key={team.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{team.team_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                            {team.members?.length ?? 0}{teamSize ? `/${teamSize}` : ''} members
                                                        </div>
                                                    </div>
                                                    <Button size="sm" variant="outline" onClick={() => handleJoinTeam(team.id)} loading={pending} disabled={isFull}>
                                                        {isFull ? 'Full' : 'Join'}
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Create team */}
                            {!showCreateTeam ? (
                                <Button variant="outline" onClick={() => setShowCreateTeam(true)}>
                                    <Users2 size={16} /> Create New Team
                                </Button>
                            ) : (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        className="form-input"
                                        value={teamName}
                                        onChange={e => setTeamName(e.target.value)}
                                        placeholder="Enter team name…"
                                        style={{ flex: 1 }}
                                    />
                                    <Button onClick={handleCreateTeam} loading={pending} disabled={!teamName.trim()}>
                                        Create
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                            Registration is {event.status !== 'open' ? 'closed' : 'past deadline'}
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}

export function StudentEventActions({ event, categories, registrationMap, teams, winners, studentId, isDeadlinePassed }: StudentEventActionsProps) {
    const hasCategories = categories.length > 0

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {hasCategories ? (
                categories.map(cat => (
                    <RegistrationAction
                        key={cat.id}
                        event={event}
                        categoryId={cat.id}
                        categoryName={cat.category_name}
                        participantType={cat.participant_type}
                        teamSize={cat.team_size}
                        existingReg={registrationMap[cat.id]}
                        teams={teams}
                        studentId={studentId}
                        isDeadlinePassed={isDeadlinePassed}
                    />
                ))
            ) : (
                <RegistrationAction
                    event={event}
                    participantType={event.participant_type}
                    teamSize={event.team_size}
                    existingReg={registrationMap['__event__']}
                    teams={teams}
                    studentId={studentId}
                    isDeadlinePassed={isDeadlinePassed}
                />
            )}

            {event.results_published && <WinnersDisplay winners={winners} />}
        </div>
    )
}
