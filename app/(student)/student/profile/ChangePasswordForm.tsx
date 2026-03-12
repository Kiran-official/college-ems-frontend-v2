'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Eye, EyeOff } from 'lucide-react'

import { getPasswordStrength } from '@/lib/validators'

export function ChangePasswordForm() {
    const [current, setCurrent] = useState('')
    const [next, setNext] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [pending, startTransition] = useTransition()

    const [showCurrent, setShowCurrent] = useState(false)
    const [showNext, setShowNext] = useState(false)

    const strength = getPasswordStrength(next)
    const passwordsMatch = next.length > 0 && next === confirm

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
            {error && <div className="alert alert--error" style={{ marginBottom: 16 }}>{error}</div>}
            {success && (
                <div className="alert alert--success" style={{ marginBottom: 16 }}>
                    <CheckCircle size={18} />
                    <span>Password updated successfully</span>
                </div>
            )}
            <FormGroup label="Current Password">
                <div className="password-wrap">
                    <input
                        type={showCurrent ? 'text' : 'password'}
                        className="form-input"
                        value={current}
                        onChange={e => setCurrent(e.target.value)}
                    />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowCurrent(!showCurrent)}
                    >
                        {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </FormGroup>
            <FormGroup label="New Password" required>
                <div className="password-wrap">
                    <input
                        type={showNext ? 'text' : 'password'}
                        className="form-input"
                        value={next}
                        onChange={e => setNext(e.target.value)}
                    />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowNext(!showNext)}
                    >
                        {showNext ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                {next.length > 0 && (
                    <div className="strength-container" style={{ marginTop: 8 }}>
                        <div className="strength-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Security Strength</span>
                            <span style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: 600,
                                color: strength === 'strong' ? '#10E09A' : strength === 'fair' ? '#F5A623' : '#FF4D6A'
                            }}>
                                {strength.toUpperCase()}
                            </span>
                        </div>
                        <div className="strength-meter" style={{ height: 4, display: 'flex', gap: 4 }}>
                            <div style={{ flex: 1, borderRadius: 2, background: '#FF4D6A' }}></div>
                            <div style={{ flex: 1, borderRadius: 2, background: strength === 'fair' || strength === 'strong' ? '#F5A623' : 'rgba(255,255,255,0.1)' }}></div>
                            <div style={{ flex: 1, borderRadius: 2, background: strength === 'strong' ? '#10E09A' : 'rgba(255,255,255,0.1)' }}></div>
                        </div>
                    </div>
                )}
            </FormGroup>
            <FormGroup label="Confirm Password" required>
                <input
                    type="password"
                    className={`form-input ${confirm && !passwordsMatch ? 'form-input--error' : ''}`}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                />
                {confirm && !passwordsMatch && (
                    <span style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>Passwords do not match</span>
                )}
            </FormGroup>
            <Button type="submit" loading={pending} disabled={!next || !confirm || strength === 'weak' || !passwordsMatch}>
                Update Password
            </Button>
        </form>
    )
}
