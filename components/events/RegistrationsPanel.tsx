import React, { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ClipboardList, Filter } from 'lucide-react'
import { format } from 'date-fns'
import type { IndividualRegistration, Event } from '@/lib/types/db'

const DEPT_PROGRAMMES: Record<string, string[]> = {
    'Commerce': ['BCOM', 'BCOM(A&F)', 'BCOM(BDA)', 'BCOM(CA)', 'BBA'],
    'Computer Science': ['BCA', 'BCA(AI&ML)'],
}

interface RegistrationsPanelProps {
    event: Event
    registrations: IndividualRegistration[]
}

function RegistrationTable({ rows }: { rows: IndividualRegistration[] }) {
    return (
        <div className="table-wrap">
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Department</th>
                        <th>Registered At</th>
                        <th>Attendance</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.id}>
                            <td>{r.student?.name ?? '—'}</td>
                            <td>{(r.student as { phone_number?: string } | undefined)?.phone_number ?? '—'}</td>
                            <td>{(r.student?.department as { name?: string } | undefined)?.name ?? '—'}</td>
                            <td>{format(new Date(r.registered_at), 'dd/MM/yyyy')}</td>
                            <td><Badge variant={r.attendance_status === 'registered' ? 'pending' : r.attendance_status === 'attended' ? 'generated' : 'failed'}>{r.attendance_status === 'attended' ? 'present' : r.attendance_status}</Badge></td>
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
                        <th>Phone</th>
                        <th>Department</th>
                        <th>Registered At</th>
                        <th>Attendance</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(([teamId, team], idx) => (
                        <React.Fragment key={teamId}>
                            {idx > 0 && (
                                <tr className="team-group-gap"><td colSpan={5} /></tr>
                            )}
                            <tr className="team-group-header">
                                <td colSpan={5}>{team.name}</td>
                            </tr>
                            {team.members.map(r => (
                                <tr key={r.id}>
                                    <td>{r.student?.name ?? '—'}</td>
                                    <td>{(r.student as { phone_number?: string } | undefined)?.phone_number ?? '—'}</td>
                                    <td>{(r.student?.department as { name?: string } | undefined)?.name ?? '—'}</td>
                                    <td>{format(new Date(r.registered_at), 'dd/MM/yyyy')}</td>
                                    <td><Badge variant={r.attendance_status === 'registered' ? 'pending' : r.attendance_status === 'attended' ? 'generated' : 'failed'}>{r.attendance_status === 'attended' ? 'present' : r.attendance_status}</Badge></td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export function RegistrationsPanel({ event, registrations }: RegistrationsPanelProps) {
    const [showFilters, setShowFilters] = useState(false)
    const [filterDept, setFilterDept] = useState('')
    const [filterProgramme, setFilterProgramme] = useState('')
    const [filterSemester, setFilterSemester] = useState('')

    if (registrations.length === 0) {
        return <EmptyState icon={ClipboardList} title="No registrations yet" subtitle="No one has registered for this event yet." />
    }

    // Get unique departments from registrations for filter
    const depts = Array.from(new Set(registrations.map(r => (r.student?.department as { id: string; name: string } | undefined)?.name).filter(Boolean)))

    // Get programs based on filterDept
    const programmes = filterDept ? (DEPT_PROGRAMMES[filterDept] ?? []) : Object.values(DEPT_PROGRAMMES).flat()

    const filtered = registrations.filter(r => {
        const student = r.student as any
        const matchesDept = !filterDept || student?.department?.name === filterDept
        const matchesProg = !filterProgramme || student?.programme === filterProgramme
        const matchesSem = !filterSemester || String(student?.semester ?? 1) === filterSemester
        return matchesDept && matchesProg && matchesSem
    })

    const isTeam = event.participant_type === 'multiple'

    const renderActionHeader = () => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter size={14} /> {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
        </div>
    )

    const renderFilterBar = () => showFilters && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--bg-elevated)', padding: 16, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ minWidth: 160 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Department</label>
                <select className="form-select" value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterProgramme('') }}>
                    <option value="">All Departments</option>
                    {depts.map(d => <option key={d} value={d!}>{d}</option>)}
                </select>
            </div>
            <div style={{ minWidth: 160 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Programme</label>
                <select className="form-select" value={filterProgramme} onChange={e => setFilterProgramme(e.target.value)}>
                    <option value="">All Programmes</option>
                    {programmes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
            <div style={{ minWidth: 120 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Semester</label>
                <select className="form-select" value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                    <option value="">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={String(s)}>Sem {s}</option>)}
                </select>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setFilterDept(''); setFilterProgramme(''); setFilterSemester('') }}>
                Clear
            </Button>
        </div>
    )

    const content = () => {
        if (isTeam) {
            const teamMap = new Map<string, { name: string; members: IndividualRegistration[] }>()
            for (const r of filtered) {
                const tid = r.team_id ?? 'ungrouped'
                const tname = (r.team as { team_name?: string } | undefined)?.team_name ?? 'Ungrouped'
                if (!teamMap.has(tid)) teamMap.set(tid, { name: tname, members: [] })
                teamMap.get(tid)!.members.push(r)
            }
            return <TeamGroupTable teams={teamMap} />
        }

        return <RegistrationTable rows={filtered} />
    }

    return (
        <div>
            {renderActionHeader()}
            {renderFilterBar()}
            {content()}
        </div>
    )
}
