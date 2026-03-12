'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { registerStudentAction } from '@/lib/actions/authActions'
import { getPasswordStrength } from '@/lib/validators'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'

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
                phone_number: phoneNumber.trim(),
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
                            <FormGroup label="Full Name" htmlFor="name">
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
                            </FormGroup>

                            <FormGroup label="Email Address" htmlFor="reg-email">
                                <input
                                    id="reg-email"
                                    type="email"
                                    className="form-input"
                                    placeholder="your.email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </FormGroup>

                            <FormGroup label="Phone Number" htmlFor="reg-phone">
                                <input
                                    id="reg-phone"
                                    type="tel"
                                    className="form-input"
                                    placeholder="Enter your phone number"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    required
                                />
                            </FormGroup>

                            <FormGroup label="Password" htmlFor="reg-password">
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
                                {password.length > 0 && (
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

                            <FormGroup label="Confirm Password" htmlFor="confirm-password">
                                <input
                                    id="confirm-password"
                                    type="password"
                                    className={`form-input ${confirmPassword && !passwordsMatch ? 'form-input--error' : ''}`}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </FormGroup>

                            <Button
                                type="submit"
                                className="btn--lg btn--full"
                                loading={loading}
                                disabled={loading || (password.length > 0 && strength === 'weak') || (confirmPassword.length > 0 && !passwordsMatch)}
                            >
                                {loading ? 'Initializing...' : 'Create Account'}
                            </Button>
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
