import { redirect } from 'next/navigation'
import { Calendar, Award, Hourglass, Activity } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { getCurrentUser } from '@/lib/queries/users'
import { getStudentRegistrationCount } from '@/lib/queries/registrations'
import { getUpcomingEventsCount } from '@/lib/queries/events'
import { getStudentCertificateCount } from '@/lib/queries/certificates'
import { getStudentPendingResults } from '@/lib/queries/winners'

export default async function StudentDashboard() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const [regCount, upcomingCount, certCount, pendingResults] = await Promise.all([
        getStudentRegistrationCount(user.id),
        getUpcomingEventsCount(),
        getStudentCertificateCount(user.id),
        getStudentPendingResults(user.id),
    ])

    return (
        <div className="page">
            <div className="mesh-bg" style={{ pointerEvents: 'none' }}>
                <div className="mesh-circle" style={{ width: '600px', height: '600px', top: '-200px', right: '-100px', background: 'var(--accent)', opacity: 0.3 }} />
                <div className="mesh-circle" style={{ width: '400px', height: '400px', bottom: '-100px', left: '-50px', background: 'var(--accent-secondary)', animationDelay: '-5s', opacity: 0.2 }} />
            </div>

            <div className="page-header">
                <h1 className="page-title">Welcome, {user.name.split(' ')[0]}</h1>
                <p className="page-sub">Your event participation overview</p>
            </div>

            <div className="bento-grid card-grid">
                <div className="bento-item">
                    <StatCard label="Total Registrations" value={regCount} icon={Calendar} />
                </div>
                <div className="bento-item">
                    <StatCard label="Upcoming Events" value={upcomingCount} icon={Activity} />
                </div>
                <div className="bento-item">
                    <StatCard label="Certificates Earned" value={certCount} icon={Award} />
                </div>
                <div className="bento-item">
                    <StatCard label="Pending Results" value={pendingResults} icon={Hourglass} />
                </div>
            </div>
        </div>
    )
}
