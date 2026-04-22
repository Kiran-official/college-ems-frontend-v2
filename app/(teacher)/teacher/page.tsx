import { Calendar, Activity, CheckCircle2, Award } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { getTeacherEventStats } from '@/lib/queries/events'
import { requireSession } from '@/lib/session'

export default async function TeacherDashboard() {
    const session = await requireSession()
    
    // FETCH DATA IN PARALLEL
    const stats = await getTeacherEventStats(session.id)
    const name = session.user_metadata?.name || session.email?.split('@')[0] || 'Teacher'

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <h1 className="page-title">Welcome, {name.split(' ')[0]}</h1>
                    <p className="page-sub">Your event management overview</p>
                </div>
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
