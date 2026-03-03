'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'
import { declareWinnerAction, removeWinnerAction } from '@/lib/actions/winnersActions'
import { Trash2, X } from 'lucide-react'
import type { Winner, IndividualRegistration, Team, Event, EventCategory } from '@/lib/types/db'

interface WinnersPanelProps {
    event: Event
    winners: Winner[]
    registrations: IndividualRegistration[]
    teams: Team[]
    categories: EventCategory[]
}

function WinnerForm({ eventId, categoryId, isTeam, registrations, teams, onDeclared }: {
    eventId: string
    categoryId?: string
    isTeam: boolean
    registrations: IndividualRegistration[]
    teams: Team[]
    onDeclared: () => void
}) {
    const [winnerId, setWinnerId] = useState('')
    const [positionLabel, setPositionLabel] = useState('')
    const [tagInput, setTagInput] = useState('')
    const [tags, setTags] = useState<string[]>([])
    const [pending, startTransition] = useTransition()

    function addTag() {
        const t = tagInput.trim()
        if (t && !tags.includes(t)) {
            setTags([...tags, t])
            setTagInput('')
        }
    }

    function submit() {
        if (!winnerId || !positionLabel.trim()) return
        startTransition(async () => {
            await declareWinnerAction({
                event_id: eventId,
                category_id: categoryId,
                winner_type: isTeam ? 'team' : 'student',
                winner_id: winnerId,
                position_label: positionLabel.trim(),
                tags,
            })
            setWinnerId('')
            setPositionLabel('')
            setTags([])
            onDeclared()
        })
    }

    // Unique students/teams for dropdown
    const options = isTeam
        ? teams.map(t => ({ id: t.id, label: t.team_name }))
        : [...new Map(registrations.map(r => [r.student_id, r])).values()].map(r => ({
            id: r.student_id,
            label: r.student?.name ?? r.student_id,
        }))

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormGroup label={isTeam ? 'Select Team' : 'Select Student'} required>
                    <select className="form-select" value={winnerId} onChange={e => setWinnerId(e.target.value)}>
                        <option value="">Choose…</option>
                        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                </FormGroup>
                <FormGroup label="Position Label" required>
                    <input
                        className="form-input"
                        value={positionLabel}
                        onChange={e => setPositionLabel(e.target.value)}
                        placeholder="e.g. 1st Place, Runner-up"
                    />
                </FormGroup>
            </div>

            <FormGroup label="Tags (optional)">
                <div className="tag-input-wrap">
                    {tags.map(tag => (
                        <span key={tag} className="tag-chip">
                            {tag}
                            <button className="tag-chip__remove" onClick={() => setTags(tags.filter(t => t !== tag))} type="button">
                                <X size={10} />
                            </button>
                        </span>
                    ))}
                    <input
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
                        placeholder="Type and press Enter"
                        style={{
                            flex: 1, minWidth: 100, border: 'none', background: 'none',
                            outline: 'none', color: 'var(--text-primary)', fontSize: '0.875rem',
                        }}
                    />
                </div>
            </FormGroup>

            <Button size="sm" onClick={submit} loading={pending} disabled={!winnerId || !positionLabel.trim()}>
                Declare Winner
            </Button>
        </div>
    )
}

function WinnerList({ winners, eventId, onRemoved }: { winners: Winner[]; eventId: string; onRemoved: () => void }) {
    const [pending, startTransition] = useTransition()

    function remove(winnerId: string) {
        startTransition(async () => {
            await removeWinnerAction(winnerId, eventId)
            onRemoved()
        })
    }

    if (winners.length === 0) return null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {winners.map(w => (
                <div key={w.id} className="winner-entry" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                        <span className="winner-entry__position">{w.position_label}</span>
                        <div>
                            <div className="winner-entry__name">
                                {w.winner_type === 'student' ? w.student?.name : (w.team as { team_name?: string } | undefined)?.team_name}
                            </div>
                            {w.winner_type === 'team' && w.team?.members && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                                    {w.team.members.map(m => m.student?.name).filter(Boolean).join(', ')}
                                </div>
                            )}
                            {w.tags && w.tags.length > 0 && (
                                <div className="winner-entry__tags">
                                    {w.tags.map(tag => <span key={tag} className="winner-tag">{tag}</span>)}
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => remove(w.id)}
                        disabled={pending}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 4 }}
                        aria-label="Remove winner"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
        </div>
    )
}

export function WinnersPanel({ event, winners, registrations, teams, categories }: WinnersPanelProps) {
    const [key, setKey] = useState(0)
    const refresh = () => { setKey(k => k + 1); window.location.reload() }
    const hasCategories = categories.length > 0

    if (!hasCategories) {
        const isTeam = event.participant_type === 'multiple'
        return (
            <div key={key}>
                <WinnerList winners={winners} eventId={event.id} onRemoved={refresh} />
                <WinnerForm
                    eventId={event.id}
                    isTeam={isTeam}
                    registrations={registrations}
                    teams={teams}
                    onDeclared={refresh}
                />
            </div>
        )
    }

    return (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {categories.map(cat => {
                const catWinners = winners.filter(w => w.category_id === cat.id)
                const catRegs = registrations.filter(r => r.category_id === cat.id)
                const catTeams = teams.filter(t => t.category_id === cat.id)
                const catIsTeam = cat.participant_type === 'multiple'

                return (
                    <div key={cat.id}>
                        <div className="category-section-header">{cat.category_name}</div>
                        <div style={{ padding: '0 4px' }}>
                            <WinnerList winners={catWinners} eventId={event.id} onRemoved={refresh} />
                            <WinnerForm
                                eventId={event.id}
                                categoryId={cat.id}
                                isTeam={catIsTeam}
                                registrations={catRegs}
                                teams={catTeams}
                                onDeclared={refresh}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
