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
    const [phoneNumber, setPhoneNumber] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

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
                phone_number: phoneNumber.trim() || undefined,
                password,

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
            <div className="auth-bg">
                <div className="auth-bg__blob auth-bg__blob--1"></div>
                <div className="auth-bg__blob auth-bg__blob--2"></div>
                <div className="auth-bg__blob auth-bg__blob--3"></div>
                <div className="auth-bg__blob auth-bg__blob--4"></div>
            </div>
            <div className="login-content-wrap">
                <div className="login-brand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/assets/logo.png"
                        alt="SICM Logo"
                        className="login-logo"
                    />
                    <div className="login-college">Seshadripuram Institute of<br />Commerce and Management</div>
                    <div className="login-system">Event Management System</div>
                    <div className="login-tagline">MANAGE · ORGANIZE · EXCEL</div>
                </div>

                <div className="login-form-panel">
                    <div className="register-card">
                        <div className="register-title">Create Account</div>
                        <div className="register-sub">Register as an external student</div>

                        {error && (
                            <div className="alert alert--error" style={{ marginBottom: 24 }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="name">Full Name</label>
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
                                <label className="form-label" htmlFor="reg-email">Email Address</label>
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
                                <label className="form-label" htmlFor="reg-password">Password</label>
                                <div className="password-wrap">
                                    <input
                                        id="reg-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input"
                                        placeholder="••••••••"
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
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                                <input
                                    id="confirm-password"
                                    type="password"
                                    className={`form-input ${confirmPassword && !passwordsMatch ? 'form-input--error' : ''}`}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className={`btn btn--primary btn--lg btn--full ${loading ? 'btn--loading' : ''}`}
                                disabled={loading || (password.length > 0 && strength === 'weak') || (confirmPassword.length > 0 && !passwordsMatch)}
                            >
                                {loading ? 'Initializing...' : 'Create Account'}
                            </button>
                        </form>

                        <div style={{ textAlign: 'center', marginTop: 32 }}>
                            <span style={{ color: '#94A3B8', fontSize: '0.875rem' }}>
                                Already have an account?{' '}
                            </span>
                            <Link href="/login" className="link" style={{ fontSize: '0.875rem', color: '#6366F1' }}>
                                Sign in →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
