'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { registerStudentAction } from '@/lib/actions/authActions'

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

export default function RegisterPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
<<<<<<< HEAD
    const [phoneNumber, setPhoneNumber] = useState('')
=======
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [dob, setDob] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const strength = getPasswordStrength(password)
    const passwordsMatch = password.length > 0 && password === confirmPassword

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }
        if (strength === 'weak') {
            setError('Password is too weak. Use at least 8 characters with mixed case, numbers, and symbols.')
            return
        }

        setLoading(true)
        try {
            const result = await registerStudentAction({
                name: name.trim(),
                email: email.trim(),
<<<<<<< HEAD
                phone_number: phoneNumber.trim() || undefined,
=======
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
                password,
                date_of_birth: dob || undefined,
            })

            if (!result.success) {
                setError(result.error || 'Registration failed')
                setLoading(false)
                return
            }

            // Auto-login after registration
            const supabase = createClient()
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password
            })
            if (loginError) {
                // Registration succeeded but auto-login failed — redirect to login
                router.push('/login')
                return
            }
            router.push('/student')
        } catch {
            setError('An unexpected error occurred')
            setLoading(false)
        }
    }

    return (
        <div className="register-page">
            <div className="register-card glass">
                <div className="register-title">Create Account</div>
                <div className="register-sub">Register as an external student</div>

                {error && (
                    <div className="alert alert--error" style={{ marginBottom: 24 }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="form-group">
                        <label className="form-label form-label--required" htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            className="form-input"
                            placeholder="Enter your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label form-label--required" htmlFor="reg-email">Email Address</label>
                        <input
                            id="reg-email"
                            type="email"
                            className="form-input"
                            placeholder="your.email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
<<<<<<< HEAD
                        <label className="form-label" htmlFor="phone">Phone Number (optional)</label>
                        <input
                            id="phone"
                            type="tel"
                            className="form-input"
                            placeholder="e.g. 9876543210"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
=======
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
                        <label className="form-label form-label--required" htmlFor="reg-password">Password</label>
                        <div className="password-wrap">
                            <input
                                id="reg-password"
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Create a strong password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
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
                        {password.length > 0 && (
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
                        <label className="form-label form-label--required" htmlFor="confirm-password">Confirm Password</label>
                        <input
                            id="confirm-password"
                            type="password"
                            className={`form-input ${confirmPassword && !passwordsMatch ? 'form-input--error' : ''}`}
                            placeholder="Confirm your password"
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

                    <div className="form-group">
                        <label className="form-label" htmlFor="dob">Date of Birth (optional)</label>
                        <input
                            id="dob"
                            type="date"
                            className="form-input"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className={`btn btn--primary btn--lg btn--full ${loading ? 'btn--loading' : ''}`}
                        disabled={loading || (password.length > 0 && strength === 'weak') || (confirmPassword.length > 0 && !passwordsMatch)}
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Already have an account?{' '}
                    </span>
                    <Link href="/login" className="link" style={{ fontSize: '0.875rem' }}>
                        Sign in →
                    </Link>
                </div>
            </div>
        </div>
    )
}
