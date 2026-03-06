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
            <div className="page-header">
                <h1 className="page-title">My Profile</h1>
                <p className="page-sub">Your account details</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div className="glass" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 20 }}>Personal Info</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Full Name
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 500 }}>{user.name}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Email
                            </div>
                            <div style={{ fontSize: '1rem' }}>{user.email}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Phone Number
                            </div>
                            <div style={{ fontSize: '1rem' }}>{user.phone_number ?? '—'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Department
                            </div>
                            <div style={{ fontSize: '1rem' }}>{user.department?.name ?? '—'}</div>
                        </div>
                        {user.programme && (
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                    Programme
                                </div>
                                <div style={{ fontSize: '1rem' }}>{user.programme}</div>
                            </div>
                        )}
                        {user.semester && (
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                    Semester
                                </div>
                                <div style={{ fontSize: '1rem' }}>{user.semester}</div>
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Student Type
                            </div>
                            <Badge variant={user.student_type ?? 'internal'}>{user.student_type ?? 'internal'}</Badge>
                        </div>

                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                                Member Since
                            </div>
                            <div style={{ fontSize: '1rem' }}>{format(new Date(user.created_at), 'dd/MM/yyyy')}</div>
                        </div>
                    </div>
                </div>

                <div className="glass" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 20 }}>Change Password</h3>
                    <ChangePasswordForm />
                </div>
            </div>
        </div>
    )
}
