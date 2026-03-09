'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'
import { TeacherSearchInput } from '@/components/forms/TeacherSearchInput'
import { CategoryToggleForm } from '@/components/forms/CategoryToggleForm'
import { createEventAction } from '@/lib/actions/eventActions'
import type { Department, User } from '@/lib/types/db'

interface CreateEventFormProps {
    departments: Department[]
    currentUser: User
    basePath: string
    isAdmin: boolean
}

export function CreateEventForm({ departments, currentUser, basePath, isAdmin }: CreateEventFormProps) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [error, setError] = useState('')

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [eventDate, setEventDate] = useState('')
    const [regDeadline, setRegDeadline] = useState('')
    const [departmentId, setDepartmentId] = useState('')
    const [visibility, setVisibility] = useState<'public_all' | 'internal_only' | 'external_only'>('public_all')
    const [participantType, setParticipantType] = useState<'single' | 'multiple'>('single')
    const [teamSize, setTeamSize] = useState<number | ''>('')

    // Faculty in charge
    const initialFaculty = isAdmin ? [] : [{ id: currentUser.id, name: currentUser.name }]
    const [faculty, setFaculty] = useState<Array<{ id: string; name: string }>>(initialFaculty)

    // Categories
    const [catEnabled, setCatEnabled] = useState(false)
    const [categories, setCategories] = useState<Array<{
        id: string; category_name: string; description: string; event_date: string; participant_type: 'single' | 'multiple'
        team_size: number | ''; faculty: Array<{ id: string; name: string }>
    }>>([])

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        startTransition(async () => {
            const result = await createEventAction({
                title,
                description: description || undefined,
                event_date: eventDate,
                registration_deadline: regDeadline,
                department_id: departmentId || undefined,
                visibility,
                participant_type: catEnabled ? 'single' : participantType,
                team_size: !catEnabled && participantType === 'multiple' ? (teamSize as number) : undefined,
                faculty_ids: faculty.map(f => f.id),
                categories: catEnabled ? categories.map(c => ({
                    category_name: c.category_name,
                    description: c.description || undefined,
                    event_date: c.event_date || undefined,
                    participant_type: c.participant_type,
                    team_size: c.participant_type === 'multiple' ? (c.team_size as number) : undefined,
                    faculty_ids: c.faculty.map(f => f.id),
                })) : undefined,
            })

            if (result.success) {
                router.push(`${basePath}/${result.event_id}`)
            } else {
                setError(result.error ?? 'Failed to create event')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit}>
            {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Event Details</h2>

                    <FormGroup label="Event Title" required>
                        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="Event name" />
                    </FormGroup>

                    <FormGroup label="Description">
                        <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} maxLength={500} placeholder="Brief description (optional)" />
                    </FormGroup>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <FormGroup label="Event Date & Time" required>
                            <input type="datetime-local" className="form-input" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                        </FormGroup>
                        <FormGroup label="Registration Deadline" required>
                            <input type="datetime-local" className="form-input" value={regDeadline} onChange={e => setRegDeadline(e.target.value)} />
                        </FormGroup>
                    </div>

                    <FormGroup label="Department">
                        <select className="form-select" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
                            <option value="">None</option>
                            {departments
                                .filter(d => ['Commerce', 'Computer Science'].includes(d.name))
                                .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </FormGroup>

                    <FormGroup label="Visibility" required>
                        <div style={{ display: 'flex', gap: 16 }}>
                            {[
                                { value: 'public_all', label: 'Open to All' },
                                { value: 'internal_only', label: 'Internal Only' },
                                { value: 'external_only', label: 'External Only' },
                            ].map(opt => (
                                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                                    <input
                                        type="radio"
                                        name="visibility"
                                        checked={visibility === opt.value}
                                        onChange={() => setVisibility(opt.value as typeof visibility)}
                                        style={{ accentColor: 'var(--accent)' }}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </FormGroup>
                </div>

                <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Participation & Faculty</h2>

                    <FormGroup label="Faculty in Charge">
                        <TeacherSearchInput
                            selectedTeachers={faculty}
                            onChange={setFaculty}
                            lockedIds={isAdmin ? [] : [currentUser.id]}
                        />
                    </FormGroup>

                    {!catEnabled && (
                        <>
                            <FormGroup label="Participant Type" required>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                                        <input
                                            type="radio"
                                            name="participantType"
                                            checked={participantType === 'single'}
                                            onChange={() => setParticipantType('single')}
                                            style={{ accentColor: 'var(--accent)' }}
                                        />
                                        Single Participant
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                                        <input
                                            type="radio"
                                            name="participantType"
                                            checked={participantType === 'multiple'}
                                            onChange={() => setParticipantType('multiple')}
                                            style={{ accentColor: 'var(--accent)' }}
                                        />
                                        Multiple Participants (Team)
                                    </label>
                                </div>
                            </FormGroup>

                            {participantType === 'multiple' && (
                                <FormGroup label="Team Size" required>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={teamSize}
                                        onChange={e => setTeamSize(e.target.value ? Number(e.target.value) : '')}
                                        min={2}
                                        placeholder="Exactly N members"
                                        style={{ maxWidth: 200 }}
                                    />
                                </FormGroup>
                            )}
                        </>
                    )}

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                        <CategoryToggleForm
                            enabled={catEnabled}
                            categories={categories}
                            onToggle={setCatEnabled}
                            onChange={setCategories}
                        />
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" loading={pending} disabled={!title || !eventDate || !regDeadline}>
                    Create Event
                </Button>
            </div>
        </form>
    )
}
