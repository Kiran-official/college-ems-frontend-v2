'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clearMustChangePasswordAction } from '@/lib/actions/authActions'
import { Eye, EyeOff, AlertTriangle } from 'lucide-react'

import { getPasswordStrength } from '@/lib/validators'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'

export default function ChangePasswordPage() {
    const router = useRouter()
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const strength = getPasswordStrength(newPassword)
    const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword
    const canSubmit = strength !== 'weak' && passwordsMatch && !loading

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!canSubmit) return
        setError('')
        setLoading(true)

        try {
            const supabase = createClient()

            // Update auth password
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
            if (updateError) {
                setError(updateError.message)
                setLoading(false)
                return
            }

            // Clear must_change_password flag via server action (bypasses RLS)
            const flagResult = await clearMustChangePasswordAction()
            if (!flagResult.success) {
                setError(flagResult.error ?? 'Failed to update password flag')
                setLoading(false)
                return
            }

            // Sign out and redirect to login page
            await supabase.auth.signOut()
            router.push('/login')
        } catch {
            setError('An unexpected error occurred')
            setLoading(false)
        }
    }

    return (
        <div className="change-password-page">
            <div className="change-password-card glass">
                <div className="first-login-banner">
                    <AlertTriangle size={20} />
                    <span>You must set a new password before continuing</span>
                </div>

                <div className="login-title" style={{ fontSize: '1.75rem' }}>Set New Password</div>
                <div className="login-sub">Choose a strong password for your account</div>

                {error && (
                    <div className="alert alert--error" style={{ marginBottom: 24 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <FormGroup label="New Password" htmlFor="new-password" required>
                        <div className="password-wrap">
                            <input
                                id="new-password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                                autoFocus
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {newPassword.length > 0 && (
                            <>
                                <div className="strength-bar">
                                    <div className={`strength-bar__seg ${strength === 'weak' ? 'strength-bar__seg--weak' : strength === 'fair' ? 'strength-bar__seg--fair' : 'strength-bar__seg--strong'}`} />
                                    <div className={`strength-bar__seg ${strength === 'fair' ? 'strength-bar__seg--fair' : strength === 'strong' ? 'strength-bar__seg--strong' : ''}`} />
                                    <div className={`strength-bar__seg ${strength === 'strong' ? 'strength-bar__seg--strong' : ''}`} />
                                </div>
                                <span className={`strength-label strength-label--${strength}`}>
                                    {strength === 'weak' ? 'Weak' : strength === 'fair' ? 'Fair' : 'Strong'}
                                </span>
                            </>
                        )}
                    </FormGroup>

                    <FormGroup label="Confirm Password" htmlFor="confirm-new-password" required>
                        <input
                            id="confirm-new-password"
                            type="password"
                            className={`form-input ${confirmPassword && !passwordsMatch ? 'form-input--error' : ''}`}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        {confirmPassword && !passwordsMatch && (
                            <span className="form-error">Passwords do not match</span>
                        )}
                        {passwordsMatch && (
                            <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>✓ Passwords match</span>
                        )}
                    </FormGroup>

                    <Button
                        type="submit"
                        className="btn--lg btn--full"
                        loading={loading}
                        disabled={!canSubmit}
                    >
                        {loading ? 'Setting Password...' : 'Set Password'}
                    </Button>
                </form>
            </div>
        </div>
    )
}
