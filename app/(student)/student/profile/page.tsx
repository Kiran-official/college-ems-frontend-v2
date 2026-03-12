import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ChangePasswordForm } from './ChangePasswordForm'

export default async function StudentProfilePage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    return (
        <div className="page">
            <div className="mesh-bg" style={{ pointerEvents: 'none' }}>
                <div className="mesh-circle" style={{ width: '800px', height: '800px', top: '-100px', right: '-200px', background: 'var(--accent)', opacity: 0.3 }} />
                <div className="mesh-circle" style={{ width: '600px', height: '600px', bottom: '-200px', left: '-100px', background: 'var(--accent-secondary)', animationDelay: '-8s', opacity: 0.2 }} />
            </div>

            <div className="page-header">
                <h1 className="page-title">My Profile</h1>
                <p className="page-sub">Your account details</p>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch">
                <div className="glass-premium" style={{ padding: 24 }}>
                    <h3 className="section-title" style={{ marginBottom: 24 }}>Personal Info</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="sm:col-span-2">
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Full Name
                            </div>
                            <div style={{ fontSize: '1.125rem', fontWeight: 500 }}>{user.name}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Email
                            </div>
                            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Phone Number
                            </div>
                            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{user.phone_number ?? '—'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Department
                            </div>
                            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{user.department?.name ?? '—'}</div>
                        </div>
                        {user.programme && (
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                    Programme
                                </div>
                                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{user.programme}</div>
                            </div>
                        )}
                        {user.semester && (
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                    Semester
                                </div>
                                <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{user.semester}</div>
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Student Type
                            </div>
                            <Badge variant="info">{user.student_type?.toUpperCase() ?? 'INTERNAL'}</Badge>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Member Since
                            </div>
                            <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{format(new Date(user.created_at), 'dd MMM yyyy')}</div>
                        </div>
                    </div>
                </div>

                <div className="glass-premium" style={{ padding: 24 }}>
                    <h3 className="section-title" style={{ marginBottom: 24 }}>Security</h3>
                    <ChangePasswordForm />
                </div>
            </div>
        </div>
    )
}
