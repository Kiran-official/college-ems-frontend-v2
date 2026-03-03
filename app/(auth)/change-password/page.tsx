'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, AlertTriangle } from 'lucide-react'

function getPasswordStrength(pw: string): 'weak' | 'fair' | 'strong' {
    if (pw.length < 8) return 'weak'
    let score = 0
    if (/[A-Z]/.test(pw)) score++
    if (/[a-z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (pw.length >= 12) score++
    if (score >= 4) return 'strong'
    if (score >= 2) return 'fair'
    return 'weak'
}

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

            // Update must_change_password flag
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase.from('users').update({ must_change_password: false }).eq('id', user.id)
            }

            // Get role and redirect
            const { data: profile } = await supabase
                .from('users').select('role').eq('id', user!.id).single()

            router.push(`/${profile?.role ?? 'student'}`)
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
                    <div className="form-group">
                        <label className="form-label form-label--required" htmlFor="new-password">New Password</label>
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
                    </div>

                    <div className="form-group">
                        <label className="form-label form-label--required" htmlFor="confirm-new-password">Confirm Password</label>
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
                    </div>

                    <button
                        type="submit"
                        className={`btn btn--primary btn--lg btn--full ${loading ? 'btn--loading' : ''}`}
                        disabled={!canSubmit}
                    >
                        {loading ? 'Setting Password...' : 'Set Password'}
                    </button>
                </form>
            </div>
        </div>
    )
}
