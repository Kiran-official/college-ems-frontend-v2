'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { FormGroup } from './FormGroup'
import { TeacherSearchInput } from './TeacherSearchInput'
import { Button } from '@/components/ui/Button'

interface CategoryRow {
    id: string
    category_name: string
    participant_type: 'single' | 'multiple'
    team_size: number | ''
    faculty: Array<{ id: string; name: string }>
}

interface CategoryToggleFormProps {
    enabled: boolean
    categories: CategoryRow[]
    onToggle: (on: boolean) => void
    onChange: (categories: CategoryRow[]) => void
}

function makeId() {
    return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function CategoryToggleForm({ enabled, categories, onToggle, onChange }: CategoryToggleFormProps) {
    function handleToggle() {
        if (enabled && categories.length > 0) {
            if (!confirm('This will clear all category data. Continue?')) return
            onChange([])
        }
        onToggle(!enabled)
    }

    function addRow() {
        onChange([
            ...categories,
            { id: makeId(), category_name: '', participant_type: 'single', team_size: '', faculty: [] },
        ])
    }

    function updateRow(id: string, field: string, value: unknown) {
        onChange(categories.map(c => c.id === id ? { ...c, [field]: value } : c))
    }

    function removeRow(id: string) {
        onChange(categories.filter(c => c.id !== id))
    }

    return (
        <div>
            {/* Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: enabled ? 20 : 0 }}>
                <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 500,
                    color: 'var(--text-primary)',
                }}>
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={handleToggle}
                        style={{
                            width: 20, height: 20, accentColor: 'var(--accent)',
                            cursor: 'pointer',
                        }}
                    />
                    Add categories to this event?
                </label>
            </div>

            {/* Category rows */}
            {enabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {categories.map((cat, idx) => (
                        <div
                            key={cat.id}
                            className="glass"
                            style={{ padding: 20, position: 'relative' }}
                        >
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto',
                                gap: 16, alignItems: 'start',
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <FormGroup label={`Category ${idx + 1} Name`} required>
                                        <input
                                            className="form-input"
                                            value={cat.category_name}
                                            onChange={(e) => updateRow(cat.id, 'category_name', e.target.value)}
                                            placeholder="e.g. Science Quiz, Art Competition"
                                        />
                                    </FormGroup>

                                    <FormGroup label="Participant Type">
                                        <div style={{ display: 'flex', gap: 16 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                                                <input
                                                    type="radio"
                                                    name={`pt-${cat.id}`}
                                                    checked={cat.participant_type === 'single'}
                                                    onChange={() => updateRow(cat.id, 'participant_type', 'single')}
                                                    style={{ accentColor: 'var(--accent)' }}
                                                />
                                                Single Participant
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                                                <input
                                                    type="radio"
                                                    name={`pt-${cat.id}`}
                                                    checked={cat.participant_type === 'multiple'}
                                                    onChange={() => updateRow(cat.id, 'participant_type', 'multiple')}
                                                    style={{ accentColor: 'var(--accent)' }}
                                                />
                                                Multiple Participants (Team)
                                            </label>
                                        </div>
                                    </FormGroup>

                                    {cat.participant_type === 'multiple' && (
                                        <FormGroup label="Team Size" required>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={cat.team_size}
                                                onChange={(e) => updateRow(cat.id, 'team_size', e.target.value ? Number(e.target.value) : '')}
                                                min={2}
                                                placeholder="Exactly N members"
                                                style={{ maxWidth: 200 }}
                                            />
                                        </FormGroup>
                                    )}

                                    <FormGroup label="Faculty in Charge (optional)">
                                        <TeacherSearchInput
                                            selectedTeachers={cat.faculty}
                                            onChange={(teachers) => updateRow(cat.id, 'faculty', teachers)}
                                            placeholder="Search faculty for this category…"
                                        />
                                    </FormGroup>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => removeRow(cat.id)}
                                    style={{
                                        background: 'var(--error-bg)', border: 'none',
                                        borderRadius: 'var(--r-md)', padding: 8, cursor: 'pointer',
                                        color: 'var(--error)', marginTop: 24,
                                    }}
                                    aria-label={`Remove category ${idx + 1}`}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    <Button type="button" variant="outline" size="sm" onClick={addRow}>
                        <Plus size={16} /> Add Category
                    </Button>
                </div>
            )}
        </div>
    )
}
