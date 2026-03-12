'use client'

import { useState, useTransition, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormGroup } from '@/components/forms/FormGroup'
import { Button } from '@/components/ui/Button'
import { updateUserCredentials, type UpdateUserInput } from '@/lib/actions/userActions'
import type { User } from '@/lib/types/db'

interface EditUserModalProps {
    user: User | null
    open: boolean
    onClose: () => void
    onSuccess: () => void
}

export function EditUserModal({ user, open, onClose, onSuccess }: EditUserModalProps) {
    const [formData, setFormData] = useState<UpdateUserInput>({})
    const [error, setError] = useState('')
    const [pending, startTransition] = useTransition()

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name,
                email: user.email,
                role: user.role as 'admin' | 'teacher' | 'student',
                student_type: user.student_type as 'internal' | 'external' | null,
                active: user.is_active,
                password: ''
            })
            setError('')
        }
    }, [user])

    async function handleSubmit() {
        if (!user) return
        setError('')
        
        startTransition(async () => {
            // Only send modified fields or needed fields.
            const result = await updateUserCredentials(user.id, formData)
            if (result.success) {
                onClose()
                onSuccess()
            } else {
                setError(result.error ?? 'An error occurred')
            }
        })
    }

    if (!user) return null

    return (
        <Modal open={open} onClose={onClose} title="Edit User">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && <div className="form-error">{error}</div>}
                
                <FormGroup label="Full Name" required>
                    <input 
                        className="form-input" 
                        value={formData.name || ''} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    />
                </FormGroup>
                
                <FormGroup label="Email" required>
                    <input 
                        type="email" 
                        className="form-input" 
                        value={formData.email || ''} 
                        onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    />
                </FormGroup>
                
                <FormGroup label="Role">
                    <select 
                        className="form-select" 
                        value={formData.role || 'student'} 
                        onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'teacher' | 'student' })}
                    >
                        <option value="admin">Admin</option>
                        <option value="teacher">Teacher</option>
                        <option value="student">Student</option>
                    </select>
                </FormGroup>
                
                {formData.role === 'student' && (
                    <FormGroup label="Student Type">
                        <select 
                            className="form-select" 
                            value={formData.student_type || 'internal'} 
                            onChange={e => setFormData({ ...formData, student_type: e.target.value as 'internal' | 'external' })}
                        >
                            <option value="internal">Internal</option>
                            <option value="external">External</option>
                        </select>
                    </FormGroup>
                )}
                
                <FormGroup label="Status">
                     <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={formData.active ?? true} 
                            onChange={e => setFormData({ ...formData, active: e.target.checked })} 
                        />
                        <span style={{ fontSize: '0.875rem' }}>Active</span>
                     </label>
                </FormGroup>

                <FormGroup label="Password">
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Leave blank to keep current" 
                        value={formData.password || ''} 
                        onChange={e => setFormData({ ...formData, password: e.target.value })} 
                    />
                </FormGroup>
            </div>
            
            <div className="modal-footer">
                <Button variant="ghost" onClick={onClose} disabled={pending}>Cancel</Button>
                <Button onClick={handleSubmit} loading={pending}>Save Changes</Button>
            </div>
        </Modal>
    )
}
