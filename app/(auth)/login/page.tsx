'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
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
            {/* Left brand panel */}
            <div className="login-brand">
                <div className="login-logo" style={{
                    background: 'linear-gradient(135deg, var(--accent), var(--info))',
                    borderRadius: '50%',
                    display: 'grid', placeItems: 'center',
                    fontSize: '2.5rem', fontWeight: 700, color: 'white'
                }}>S</div>
                <div className="login-college">Seshadripuram Institute of<br />Commerce and Management</div>
                <div className="login-system">Event Management System</div>
                <div className="login-tagline">MANAGE · ORGANIZE · EXCEL</div>
            </div>

            {/* Right form panel */}
            <div className="login-form-panel">
                <div className="login-card glass">
                    <div className="login-title">Welcome back</div>
                    <div className="login-sub">Sign in to your SICM account</div>

                    {error && (
                        <div className="alert alert--error" style={{ marginBottom: 24 }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div className="form-group">
                            <label className="form-label form-label--required" htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                className={`form-input ${error ? 'form-input--error' : ''}`}
                                placeholder="your.email@sicm.edu.in"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label form-label--required" htmlFor="password">Password</label>
                            <div className="password-wrap">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Enter your password"
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
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: 24 }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Don&apos;t have an account?{' '}
                        </span>
                        <Link href="/register" className="link" style={{ fontSize: '0.875rem' }}>
                            Create one →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
