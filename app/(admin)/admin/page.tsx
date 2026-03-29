import { Users, Calendar, Activity, Award } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { getUserStats } from '@/lib/queries/users'
import { getEventStats } from '@/lib/queries/events'
import { getCertificateStats } from '@/lib/queries/certificates'

export default async function AdminDashboard() {
    const [userStats, eventStats, certStats] = await Promise.all([
        getUserStats(),
        getEventStats(),
        getCertificateStats(),
    ])

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">System Dashboard</h1>
                <p className="page-sub">Overview of the Event Management System</p>
            </div>

            {/* Stat Cards */}
            <div className="card-grid" style={{ marginBottom: 32 }}>
                <StatCard label="Total Users" value={userStats.totalUsers} imageIcon="/assets/icon_users_white.png" />
                <StatCard label="Total Events" value={eventStats.totalEvents} imageIcon="/assets/icon_events_white.png" />
                <StatCard label="Active Events" value={eventStats.activeEvents} imageIcon="/assets/icon_active_events_white.png" />
                <StatCard label="Certificates" value={certStats.generated} imageIcon="/assets/icon_award_white.png" />
            </div>

            {/* Alert row */}
            {(certStats.failed > 0 || certStats.pending > 0) && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                    {certStats.failed > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 16px', borderRadius: 'var(--r-md)',
                            background: 'var(--error-bg)', border: '1px solid rgba(255,77,106,0.3)',
                            color: 'var(--error)', fontSize: '0.875rem', fontWeight: 500,
                        }}>
                            <Badge variant="failed">{certStats.failed}</Badge> failed certificates need attention
                        </div>
                    )}
                    {certStats.pending > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 16px', borderRadius: 'var(--r-md)',
                            background: 'var(--warning-bg)', border: '1px solid rgba(245,166,35,0.3)',
                            color: 'var(--warning)', fontSize: '0.875rem', fontWeight: 500,
                        }}>
                            <Badge variant="pending">{certStats.pending}</Badge> certificates pending
                        </div>
                    )}
                </div>
            )}

            {/* Glow decorators */}
            <div className="glow-bg glow-bg--cyan" style={{ width: '400px', height: '400px', top: '-100px', right: '-100px', position: 'fixed', opacity: 0.3, pointerEvents: 'none' }} />
        </div>
    )
}
