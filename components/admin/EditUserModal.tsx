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
                phone_number: user.phone_number || '',
                role: user.role as 'admin' | 'teacher' | 'student',
                student_type: user.student_type as 'internal' | 'external' | null,
                active: user.is_active,
                password: ''
            })
            setError('')
        }
    }, [user])

    function showValidationError(fieldId: string, message: string) {
        setError(message)
        setTimeout(() => {
            const el = document.getElementById(fieldId)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                el.focus()
            }
        }, 50)
    }

    async function handleSubmit() {
        if (!user) return
        setError('')

        // Client-side validation
        const name = (formData.name || '').trim()
        if (!name || name.length < 2) {
            showValidationError('edit-user-name', 'Name must be at least 2 characters'); return
        }
        if (!/^[A-Za-z\s.]+$/.test(name)) {
            showValidationError('edit-user-name', 'Name must contain only letters, spaces, and dots'); return
        }
        const email = (formData.email || '').trim()
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showValidationError('edit-user-email', 'Please enter a valid email address'); return
        }
        const phone = formData.phone_number || ''
        if (!phone || phone.length !== 10) {
            showValidationError('edit-user-phone', 'Phone number is required and must be exactly 10 digits'); return
        }
        
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
                        id="edit-user-name"
                        className="form-input" 
                        value={formData.name || ''} 
                        onChange={e => setFormData({ ...formData, name: e.target.value.replace(/[^A-Za-z\s.]/g, '') })} 
                        placeholder="Letters, spaces, and dots only"
                    />
                </FormGroup>
                
                <FormGroup label="Email" required>
                    <input 
                        id="edit-user-email"
                        type="email" 
                        className="form-input" 
                        value={formData.email || ''} 
                        onChange={e => setFormData({ ...formData, email: e.target.value })} 
                    />
                </FormGroup>
                
                <FormGroup label="Phone Number" required>
                    <input 
                        id="edit-user-phone"
                        type="tel" 
                        className="form-input" 
                        value={formData.phone_number || ''} 
                        onChange={e => setFormData({ ...formData, phone_number: e.target.value.replace(/\D/g, '').slice(0, 10) })} 
                        placeholder="e.g. 9876543210"
                        maxLength={10}
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
