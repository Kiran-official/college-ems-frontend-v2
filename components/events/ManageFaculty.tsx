'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { addFacultyInChargeAction } from '@/lib/actions/eventActions'
import type { User, FacultyInCharge } from '@/lib/types/db'

interface Props {
    eventId: string
    currentFaculty: FacultyInCharge[]
    allTeachers: Pick<User, 'id' | 'name' | 'email'>[]
    isManageable: boolean
}

export function ManageFaculty({ eventId, currentFaculty, allTeachers, isManageable }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedTeacherId, setSelectedTeacherId] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Filter out teachers who are already assigned
    const assignedIds = currentFaculty.map(f => f.teacher_id)
    const availableTeachers = allTeachers.filter(t => !assignedIds.includes(t.id))

    const handleAdd = async () => {
        if (!selectedTeacherId) return
        setIsLoading(true)
        setError(null)
        try {
            const result = await addFacultyInChargeAction(eventId, selectedTeacherId)
            if (result.success) {
                setIsModalOpen(false)
                setSelectedTeacherId('')
            } else {
                setError(result.error || 'Failed to add faculty')
            }
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    if (!currentFaculty.length && !isManageable) return null

    return (
        <div className="faculty-pills" style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {currentFaculty.map(f => (
                <span key={f.teacher_id} className="faculty-pill" style={{ 
                    padding: '6px 12px', 
                    borderRadius: 'var(--r-pill)', 
                    background: 'var(--bg-elevated)', 
                    border: '1px solid var(--border)',
                    fontSize: '0.8125rem',
                    fontWeight: 500
                }}>
                    {f.teacher?.name}
                </span>
            ))}
            
            {isManageable && (
                <>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="faculty-pill"
                        style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--r-pill)',
                            background: 'var(--accent-dim)',
                            border: '1px dashed var(--accent)',
                            color: 'var(--accent)',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            cursor: 'pointer',
                            transition: 'all var(--t-fast)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--accent)'
                            e.currentTarget.style.color = '#fff'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--accent-dim)'
                            e.currentTarget.style.color = 'var(--accent)'
                        }}
                    >
                        <Plus size={14} /> Add Faculty
                    </button>

                    <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Faculty in Charge">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {error && (
                                <div style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
                                    {error}
                                </div>
                            )}
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8, color: 'var(--text-secondary)' }}>
                                    Select Teacher
                                </label>
                                <select 
                                    value={selectedTeacherId} 
                                    onChange={e => setSelectedTeacherId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: 'var(--r-md)',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    <option value="">-- Choose a teacher --</option>
                                    {availableTeachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                                    ))}
                                </select>
                                {availableTeachers.length === 0 && (
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                                        All active teachers are already assigned to this event.
                                    </p>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                                <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isLoading}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAdd} disabled={!selectedTeacherId || isLoading || availableTeachers.length === 0} loading={isLoading}>
                                    Add Faculty
                                </Button>
                            </div>
                        </div>
                    </Modal>
                </>
            )}
        </div>
    )
} 
