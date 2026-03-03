import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ClipboardList } from 'lucide-react'
import { format } from 'date-fns'
import type { IndividualRegistration, Event, EventCategory } from '@/lib/types/db'

interface RegistrationsPanelProps {
    event: Event
    registrations: IndividualRegistration[]
    categories: EventCategory[]
}

function RegistrationTable({ rows }: { rows: IndividualRegistration[] }) {
    return (
        <div className="table-wrap">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Registered At</th>
                        <th>Attendance</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.id}>
                            <td>{r.student?.name ?? '—'}</td>
                            <td>{(r.student?.department as { name?: string } | undefined)?.name ?? '—'}</td>
                            <td>{format(new Date(r.registered_at), 'dd MMM yyyy')}</td>
                            <td><Badge variant={r.attendance_status === 'not_marked' ? 'not-marked' : r.attendance_status}>{r.attendance_status.replace('_', ' ')}</Badge></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function TeamGroupTable({ teams }: { teams: Map<string, { name: string; members: IndividualRegistration[] }> }) {
    const entries = Array.from(teams.entries())
    return (
        <div className="table-wrap">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Registered At</th>
                        <th>Attendance</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(([teamId, team], idx) => (
                        <tbody key={teamId}>
                            {idx > 0 && (
                                <tr className="team-group-gap"><td colSpan={4} /></tr>
                            )}
                            <tr className="team-group-header">
                                <td colSpan={4}>🏆 {team.name}</td>
                            </tr>
                            {team.members.map(r => (
                                <tr key={r.id}>
                                    <td>{r.student?.name ?? '—'}</td>
                                    <td>{(r.student?.department as { name?: string } | undefined)?.name ?? '—'}</td>
                                    <td>{format(new Date(r.registered_at), 'dd MMM yyyy')}</td>
                                    <td><Badge variant={r.attendance_status === 'not_marked' ? 'not-marked' : r.attendance_status}>{r.attendance_status.replace('_', ' ')}</Badge></td>
                                </tr>
                            ))}
                        </tbody>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export function RegistrationsPanel({ event, registrations, categories }: RegistrationsPanelProps) {
    if (registrations.length === 0) {
        return <EmptyState icon={ClipboardList} title="No registrations yet" subtitle="No one has registered for this event yet." />
    }

    const hasCategories = categories.length > 0
    const isTeam = event.participant_type === 'multiple'

    // Case A: no categories, single participant
    if (!hasCategories && !isTeam) {
        return <RegistrationTable rows={registrations} />
    }

    // Case B: no categories, team
    if (!hasCategories && isTeam) {
        const teamMap = new Map<string, { name: string; members: IndividualRegistration[] }>()
        for (const r of registrations) {
            const tid = r.team_id ?? 'ungrouped'
            const tname = (r.team as { team_name?: string } | undefined)?.team_name ?? 'Ungrouped'
            if (!teamMap.has(tid)) teamMap.set(tid, { name: tname, members: [] })
            teamMap.get(tid)!.members.push(r)
        }
        return <TeamGroupTable teams={teamMap} />
    }

    // Case C and D: has categories
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {categories.map(cat => {
                const catRegs = registrations.filter(r => r.category_id === cat.id)
                const catIsTeam = cat.participant_type === 'multiple'

                return (
                    <div key={cat.id}>
                        <div className="category-section-header">{cat.category_name}</div>
                        {catRegs.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                                No registrations in this category
                            </div>
                        ) : catIsTeam ? (
                            (() => {
                                const teamMap = new Map<string, { name: string; members: IndividualRegistration[] }>()
                                for (const r of catRegs) {
                                    const tid = r.team_id ?? 'ungrouped'
                                    const tname = (r.team as { team_name?: string } | undefined)?.team_name ?? 'Ungrouped'
                                    if (!teamMap.has(tid)) teamMap.set(tid, { name: tname, members: [] })
                                    teamMap.get(tid)!.members.push(r)
                                }
                                return <TeamGroupTable teams={teamMap} />
                            })()
                        ) : (
                            <RegistrationTable rows={catRegs} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
