'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'
import { createClient } from '@/lib/supabase/client'

export function ChangePasswordForm() {
    const [current, setCurrent] = useState('')
    const [next, setNext] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [pending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setSuccess(false)

        if (next.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }
        if (next !== confirm) {
            setError('Passwords do not match')
            return
        }

        startTransition(async () => {
            const supabase = createClient()
            const { error: updateError } = await supabase.auth.updateUser({ password: next })
            if (updateError) {
                setError(updateError.message)
            } else {
                setSuccess(true)
                setCurrent('')
                setNext('')
                setConfirm('')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div className="form-error">{error}</div>}
            {success && (
                <div style={{ padding: '10px 16px', borderRadius: 'var(--r-md)', background: 'var(--success-bg)', color: 'var(--success)', fontSize: '0.875rem' }}>
                    ✓ Password updated successfully
                </div>
            )}
            <FormGroup label="Current Password">
                <input type="password" className="form-input" value={current} onChange={e => setCurrent(e.target.value)} />
            </FormGroup>
            <FormGroup label="New Password" required>
                <input type="password" className="form-input" value={next} onChange={e => setNext(e.target.value)} />
            </FormGroup>
            <FormGroup label="Confirm Password" required>
                <input type="password" className="form-input" value={confirm} onChange={e => setConfirm(e.target.value)} />
            </FormGroup>
            <Button type="submit" loading={pending} disabled={!next || !confirm}>
                Update Password
            </Button>
        </form>
    )
}
