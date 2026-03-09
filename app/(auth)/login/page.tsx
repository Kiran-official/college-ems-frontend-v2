'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

function LoginContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (searchParams.get('error') === 'inactive') {
            setError('Your account is deactivated. Contact the administrator.')
        }
    }, [searchParams])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const supabase = createClient()
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
            if (authError) {
                setError(authError.message)
                setLoading(false)
                return
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setError('Authentication failed')
                setLoading(false)
                return
            }

            const { data: profile } = await supabase
                .from('users').select('role, is_active, must_change_password').eq('id', user.id).single()

            if (!profile) {
                setError('Profile not found')
                setLoading(false)
                return
            }

            if (!profile.is_active) {
                await supabase.auth.signOut()
                setError('Your account is deactivated. Contact the administrator.')
                setLoading(false)
                return
            }

            if (profile.must_change_password) {
                router.push('/change-password')
                return
            }

            router.push(`/${profile.role}`)
        } catch {
            setError('An unexpected error occurred')
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="auth-bg">
                <div className="auth-bg__blob auth-bg__blob--1"></div>
                <div className="auth-bg__blob auth-bg__blob--2"></div>
                <div className="auth-bg__blob auth-bg__blob--3"></div>
                <div className="auth-bg__blob auth-bg__blob--4"></div>
            </div>
            <div className="login-content-wrap">
                {/* Left brand panel */}
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

                {/* Right form panel */}
                <div className="login-form-panel">
                    <div className="login-card">
                        <div className="login-title">Welcome back</div>
                        <div className="login-sub">Sign in to your account</div>

                        {error && (
                            <div className="alert alert--error" style={{ marginBottom: 24 }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="email">Email Address</label>
                                <input
                                    id="email"
                                    type="email"
                                    className={`form-input ${error ? 'form-input--error' : ''}`}
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="password">Password</label>
                                <div className="password-wrap">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-input"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
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

                            <button
                                type="submit"
                                className={`btn btn--primary btn--lg btn--full ${loading ? 'btn--loading' : ''}`}
                                disabled={loading}
                            >
                                {loading ? 'Accessing...' : 'Sign In'}
                            </button>
                        </form>

                        <div style={{ textAlign: 'center', marginTop: 32 }}>
                            <span style={{ color: '#94A3B8', fontSize: '0.875rem' }}>
                                New member?{' '}
                            </span>
                            <Link href="/register" className="link" style={{ fontSize: '0.875rem', color: '#6366F1' }}>
                                Register here →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Loading...</div>}>
            <LoginContent />
        </Suspense>
    )
}
