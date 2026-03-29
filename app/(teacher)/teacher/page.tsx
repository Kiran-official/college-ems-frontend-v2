import { Calendar, Activity, CheckCircle2, Award } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { getTeacherEventStats } from '@/lib/queries/events'
import { getCurrentUser } from '@/lib/queries/users'
import { redirect } from 'next/navigation'

export default async function TeacherDashboard() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const stats = await getTeacherEventStats(user.id)

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Welcome, {user.name.split(' ')[0]}</h1>
                <p className="page-sub">Your event management overview</p>
            </div>

            <div className="card-grid">
                <StatCard label="My Events" value={stats.myEvents} icon={Calendar} />
                <StatCard label="Active Events" value={stats.activeEvents} icon={Activity} />
                <StatCard label="Completed" value={stats.completedEvents} icon={CheckCircle2} />
            </div>

            <div className="glow-bg glow-bg--violet" style={{ width: '400px', height: '400px', top: '-100px', right: '-100px', position: 'fixed', opacity: 0.25, pointerEvents: 'none' }} />
        </div>
    )
}
