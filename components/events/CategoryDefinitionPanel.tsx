'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'
import { TeacherSearchInput } from '@/components/forms/TeacherSearchInput'
import { addCategoryAction, updateCategoryAction, deleteCategoryAction } from '@/lib/actions/categoryActions'
import type { Event, EventCategory, ParticipantType } from '@/lib/types/db'

interface CategoryDefinitionPanelProps {
    event: Event
    categories: EventCategory[]
}

export function CategoryDefinitionPanel({ event, categories }: CategoryDefinitionPanelProps) {
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()

    // Form states
    const [name, setName] = useState('')
    const [desc, setDesc] = useState('')
    const [date, setDate] = useState('')
    const [pt, setPt] = useState<ParticipantType>('single')
    const [ts, setTs] = useState<number | ''>('')
    const [faculty, setFaculty] = useState<Array<{ id: string; name: string }>>([])

    function resetForm() {
        setName('')
        setDesc('')
        setDate('')
        setPt('single')
        setTs('')
        setFaculty([])
        setIsAdding(false)
        setEditingId(null)
    }

    function handleAdd() {
        if (!name) return
        startTransition(async () => {
            const res = await addCategoryAction({
                event_id: event.id,
                category_name: name,
                description: desc || undefined,
                event_date: date || undefined,
                participant_type: pt,
                team_size: pt === 'multiple' ? (ts as number) : undefined,
                faculty_ids: faculty.map(f => f.id)
            })
            if (res.success) {
                resetForm()
                window.location.reload()
            } else {
                alert(res.error)
            }
        })
    }

    function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this category? It will fail if there are registrations.')) return
        startTransition(async () => {
            const res = await deleteCategoryAction(id, event.id)
            if (res.success) window.location.reload()
            else alert(res.error)
        })
    }

    return (
        <div className="glass" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Event Categories</h3>
                {!isAdding && (
                    <Button size="sm" onClick={() => setIsAdding(true)}>
                        <Plus size={16} /> Add Category
                    </Button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {isAdding && (
                    <div className="glass" style={{ padding: 20, border: '2px dashed var(--accent)', marginBottom: 16 }}>
                        <h4 style={{ marginBottom: 16, fontWeight: 600 }}>New Category</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <FormGroup label="Category Name" required>
                                <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Solo Dance" />
                            </FormGroup>
                            <FormGroup label="Description">
                                <input className="form-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional details" />
                            </FormGroup>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <FormGroup label="Start Time">
                                    <input type="datetime-local" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
                                </FormGroup>
                                <FormGroup label="Participant Type">
                                    <select className="form-select" value={pt} onChange={e => setPt(e.target.value as ParticipantType)}>
                                        <option value="single">Single</option>
                                        <option value="multiple">Team</option>
                                    </select>
                                </FormGroup>
                            </div>
                            {pt === 'multiple' && (
                                <FormGroup label="Team Size" required>
                                    <input type="number" className="form-input" value={ts} onChange={e => setTs(Number(e.target.value))} min={2} />
                                </FormGroup>
                            )}
                            <FormGroup label="Faculty in Charge">
                                <TeacherSearchInput selectedTeachers={faculty} onChange={setFaculty} />
                            </FormGroup>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
                                <Button size="sm" onClick={handleAdd} loading={pending} disabled={!name}>Save Category</Button>
                            </div>
                        </div>
                    </div>
                )}

                {categories.length === 0 && !isAdding && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)' }}>
                        No categories defined for this event yet.
                    </div>
                )}

                {categories.map(cat => (
                    <div key={cat.id} className="glass" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{cat.category_name}</div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                {cat.participant_type === 'multiple' ? `Team (Size: ${cat.team_size})` : 'Single Participant'}
                                {cat.event_date && ` • ${new Date(cat.event_date).toLocaleString()}`}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className="icon-button"
                                onClick={() => handleDelete(cat.id)}
                                style={{ color: 'var(--error)' }}
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
