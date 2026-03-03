import { redirect } from 'next/navigation'
import { Calendar, Award, Hourglass, Activity } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { getCurrentUser } from '@/lib/queries/users'
import { getStudentRegistrationCount, getStudentUpcomingCount } from '@/lib/queries/registrations'
import { getStudentCertificateCount } from '@/lib/queries/certificates'
import { getStudentPendingResults } from '@/lib/queries/winners'

export default async function StudentDashboard() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const [regCount, upcomingCount, certCount, pendingResults] = await Promise.all([
        getStudentRegistrationCount(user.id),
        getStudentUpcomingCount(user.id),
        getStudentCertificateCount(user.id),
        getStudentPendingResults(user.id),
    ])

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Welcome, {user.name.split(' ')[0]}</h1>
                <p className="page-sub">Your event participation overview</p>
            </div>

            <div className="card-grid">
                <StatCard label="Total Registrations" value={regCount} icon={Calendar} />
                <StatCard label="Upcoming Events" value={upcomingCount} icon={Activity} />
                <StatCard label="Certificates Earned" value={certCount} icon={Award} />
                <StatCard label="Pending Results" value={pendingResults} icon={Hourglass} />
            </div>

            <div className="glow-bg glow-bg--teal" style={{ width: 400, height: 400, top: -100, right: -100, position: 'fixed', opacity: 0.25 }} />
        </div>
    )
}
