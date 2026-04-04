'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'
import { declareWinnerAction, removeWinnerAction } from '@/lib/actions/winnersActions'
import { Trash2, X } from 'lucide-react'
import type { Winner, IndividualRegistration, Team, Event } from '@/lib/types/db'
import { Badge } from '@/components/ui/Badge'

function WinnerList({ winners, eventId, onRemoved, readOnly }: { winners: Winner[]; eventId: string; onRemoved: () => void; readOnly?: boolean }) {
    const [pending, startTransition] = useTransition()

    function remove(winnerId: string) {
        startTransition(async () => {
            await removeWinnerAction(winnerId, eventId)
            onRemoved()
        })
    }

    if (winners.length === 0) return null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {winners.map(w => (
                <div key={w.id} className="winner-entry glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                        <div style={{ marginTop: 2 }}>
                            <Badge variant="winner">{w.position_label}</Badge>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                <span className="winner-entry__name" style={{ fontSize: '1rem', fontWeight: 700 }}>
                                    {w.winner_type === 'student' ? w.student?.name : (w.team as { team_name?: string } | undefined)?.team_name}
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
                                <div className="winner-entry__tags" style={{ marginTop: 8 }}>
                                    {w.tags.map(tag => <span key={tag} className="winner-tag">{tag}</span>)}
                                </div>
                            )}
                        </div>
                    </div>
                    {!readOnly && (
                        <button
                            onClick={() => remove(w.id)}
                            disabled={pending}
                            className="btn--ghost"
                            style={{ padding: 8, borderRadius: 'var(--r-sm)', color: 'var(--error)' }}
                            aria-label="Remove winner"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}

interface WinnersPanelProps {
    event: Event
    winners: Winner[]
    registrations: IndividualRegistration[]
    teams: Team[]
    isFIC?: boolean
    userRole?: string
}

function WinnerForm({ eventId, isTeam, registrations, teams, onDeclared }: {
    eventId: string
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
    const [error, setError] = useState<string | null>(null)

    function addTag() {
        const t = tagInput.trim()
        if (t && !tags.includes(t)) {
            setTags([...tags, t])
            setTagInput('')
        }
    }

    function submit() {
        if (!winnerId || !positionLabel.trim()) return
        
        // Auto-add any pending tag text
        const finalTags = [...tags]
        const pendingTag = tagInput.trim()
        if (pendingTag && !finalTags.includes(pendingTag)) {
            finalTags.push(pendingTag)
        }

        startTransition(async () => {
            setError(null)
            const result = await declareWinnerAction({
                event_id: eventId,
                winner_type: isTeam ? 'team' : 'student',
                winner_id: winnerId,
                position_label: positionLabel.trim(),
                tags: finalTags,
            })
            
            if (result.success) {
                setWinnerId('')
                setPositionLabel('')
                setTagInput('')
                setTags([])
                onDeclared()
            } else {
                setError(result.error ?? 'Failed to declare winner')
            }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <Button size="sm" onClick={submit} loading={pending} disabled={!winnerId || !positionLabel.trim()} className="w-full sm:w-auto">
                Declare Winner
            </Button>

            {error && (
                <div style={{ color: 'var(--error)', fontSize: '0.8125rem', marginTop: 4, fontWeight: 500 }}>
                    ⚠️ {error}
                </div>
            )}
        </div>
    )
}

export function WinnersPanel({ event, winners, registrations, teams, isFIC = false, userRole }: WinnersPanelProps) {
    const router = useRouter()
    const [key, setKey] = useState(0)
    const refresh = () => { setKey(k => k + 1); router.refresh() }

    const canManage = userRole === 'admin' || isFIC
    const isTeam = event.participant_type === 'multiple'

    return (
        <div key={key}>
            {event.results_published && (
                <div className="glass" style={{ padding: 16, textAlign: 'center', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 500, border: '1px solid rgba(16,185,129,0.2)', marginBottom: 16 }}>
                    ✓ Results published for this event. No further changes can be made to finalist results.
                </div>
            )}
            {!event.results_published && event.status !== 'closed' && (
                <div className="glass" style={{ padding: 16, textAlign: 'center', color: 'var(--warning)', fontSize: '0.875rem', fontWeight: 500, border: '1px solid rgba(245,166,35,0.1)', marginBottom: 16 }}>
                    ⚠️ Event must be closed before declaring winners.
                </div>
            )}
            {canManage && !event.results_published && event.status === 'closed' && (
                <WinnerForm
                    eventId={event.id}
                    isTeam={isTeam}
                    registrations={registrations}
                    teams={teams}
                    onDeclared={refresh}
                />
            )}
            <WinnerList winners={winners} eventId={event.id} onRemoved={refresh} readOnly={event.results_published || !canManage} />
        </div>
    )
}
