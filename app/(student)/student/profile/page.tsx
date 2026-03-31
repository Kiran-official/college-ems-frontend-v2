import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { User, Mail, Phone, Building, GraduationCap, BookOpen, Hash, Calendar } from 'lucide-react'
import { ChangePasswordForm } from './ChangePasswordForm'
import { NotificationStatus } from '@/components/pwa/NotificationStatus'

export default async function StudentProfilePage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const infoItems = [
        { label: 'Full Name', value: user.name, icon: User, fullWidth: true },
        { label: 'Email', value: user.email, icon: Mail },
        { label: 'Phone Number', value: user.phone_number ?? '—', icon: Phone },
        { label: 'Department', value: user.department?.name ?? '—', icon: Building },
        { label: 'Programme', value: user.programme ?? '—', icon: GraduationCap },
        { label: 'Semester', value: user.semester ?? '—', icon: BookOpen },
        { label: 'Student Type', value: user.student_type?.toUpperCase() ?? 'INTERNAL', icon: Hash, isBadge: true },
        { label: 'Member Since', value: format(new Date(user.created_at), 'dd MMM yyyy'), icon: Calendar },
    ]

    return (
        <div className="page">
            <div className="mesh-bg" style={{ pointerEvents: 'none' }}>
                <div className="mesh-circle" style={{ width: '800px', height: '800px', top: '-100px', right: '-200px', background: 'var(--accent)', opacity: 0.3 }} />
                <div className="mesh-circle" style={{ width: '600px', height: '600px', bottom: '-200px', left: '-100px', background: 'var(--accent-secondary)', animationDelay: '-8s', opacity: 0.2 }} />
            </div>

            <div className="page-header">
                <div className="page-header__title-group">
                    <h1 className="page-title">My Profile</h1>
                    <p className="page-sub">Your account details</p>
                </div>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-[1.2fr_0.8fr] gap-6 items-stretch">
                <div className="flex flex-col gap-6">
                    <div className="glass-premium" style={{ padding: '32px 24px' }}>
                        <h3 className="section-title" style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="w-8 h-8 rounded-lg bg-accent-dim flex items-center justify-center text-accent">
                                <User size={18} />
                            </div>
                            Personal Info
                        </h3>
                        
                        <div className="profile-info-grid">
                            {infoItems.map((item, idx) => (
                                <div key={idx} className={`profile-info-item ${item.fullWidth ? 'profile-info-item--full' : ''}`}>
                                    <div className="profile-info-item__icon-container">
                                        <item.icon size={18} />
                                    </div>
                                    <div className="profile-info-item__content">
                                        <div className="profile-info-item__label">
                                            {item.label}
                                        </div>
                                        {item.isBadge ? (
                                            <Badge variant="info">
                                                {item.value}
                                            </Badge>
                                        ) : (
                                            <div className="profile-info-item__value">
                                                {item.value}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="glass-premium" style={{ padding: 24 }}>
                        <h3 className="section-title" style={{ marginBottom: 24 }}>Preferences</h3>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
                            Push Notifications
                        </div>
                        <NotificationStatus />
                    </div>

                    <div className="glass-premium" style={{ padding: 24 }}>
                        <h3 className="section-title" style={{ marginBottom: 24 }}>Security</h3>
                        <ChangePasswordForm />
                    </div>
                </div>
            </div>
        </div>
    )
}
