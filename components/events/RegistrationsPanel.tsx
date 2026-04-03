import React, { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ClipboardList, Filter, Plus, Phone } from 'lucide-react'
import { format } from 'date-fns'
import type { IndividualRegistration, Event, Team } from '@/lib/types/db'
import { AddParticipantModal } from '@/components/admin/AddParticipantModal'
import { usePathname } from 'next/navigation'

const DEPT_PROGRAMMES: Record<string, string[]> = {
    'Commerce': ['BCOM', 'BCOM(A&F)', 'BCOM(BDA)', 'BCOM(CA)', 'BBA'],
    'Computer Science': ['BCA', 'BCA(AI&ML)'],
}

const PAYMENT_LABELS: Record<string, string> = {
    'pending': 'Not Paid',
    'submitted': 'Still Review',
    'verified': 'Verified',
    'rejected': 'Rejected',
}

interface RegistrationsPanelProps {
    event: Event
    registrations: IndividualRegistration[]
    teams?: Team[]
}

function paymentBadgeVariant(status: string) {
    return status === 'verified' ? 'generated' as const :
        status === 'submitted' ? 'processing' as const :
        status === 'rejected' ? 'failed' as const : 'pending' as const
}

function attendanceBadgeVariant(status: string) {
    return status === 'attended' ? 'generated' as const :
        status === 'registered' ? 'pending' as const : 'failed' as const
}

// ── Mobile card for a single registration row ───────────────────
function RegCard({ r, isPaid }: { r: IndividualRegistration; isPaid: boolean }) {
    const student = r.student as any
    return (
        <div className="m-card">
            <div className="m-card__row">
                <span className="m-card__name">{student?.name ?? '—'}</span>
                {isPaid && (
                    <Badge variant={paymentBadgeVariant(r.payment_status)} style={{ fontSize: '9px', padding: '1px 6px' }}>
                        {PAYMENT_LABELS[r.payment_status] ?? r.payment_status}
                    </Badge>
                )}
                <Badge variant={attendanceBadgeVariant(r.attendance_status)} style={{ fontSize: '9px', padding: '1px 6px' }}>
                    {r.attendance_status === 'attended' ? 'present' : r.attendance_status}
                </Badge>
            </div>
            <div className="m-card__details">
                {student?.phone_number && (
                    <span className="m-card__detail">
                        <Phone size={11} /> {student.phone_number}
                    </span>
                )}
                {student?.department?.name && (
                    <span className="m-card__detail">{student.department.name}</span>
                )}
                <span className="m-card__detail">{format(new Date(r.registered_at), 'dd/MM/yyyy')}</span>
            </div>
        </div>
    )
}

// ── Desktop table for individual registrations ───────────────────
function RegistrationTable({ rows, isPaid }: { rows: IndividualRegistration[], isPaid: boolean }) {
    return (
        <>
            <div className="resp-table">
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Department</th>
                                {isPaid && <th>Payment</th>}
                                <th>Registered At</th>
                                <th>Attendance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.id}>
                                    <td data-label="Name">{r.student?.name ?? '—'}</td>
                                    <td data-label="Phone">{(r.student as { phone_number?: string } | undefined)?.phone_number ?? '—'}</td>
                                    <td data-label="Department">{(r.student?.department as { name?: string } | undefined)?.name ?? '—'}</td>
                                    {isPaid && (
                                        <td data-label="Payment">
                                            <Badge variant={paymentBadgeVariant(r.payment_status)}>
                                                {PAYMENT_LABELS[r.payment_status] ?? r.payment_status}
                                            </Badge>
                                        </td>
                                    )}
                                    <td data-label="Registered">{format(new Date(r.registered_at), 'dd/MM/yyyy')}</td>
                                    <td data-label="Attendance"><Badge variant={attendanceBadgeVariant(r.attendance_status)}>{r.attendance_status === 'attended' ? 'present' : r.attendance_status}</Badge></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="resp-cards">
                {rows.map(r => <RegCard key={r.id} r={r} isPaid={isPaid} />)}
            </div>
        </>
    )
}

// ── Desktop table + mobile cards for team-grouped registrations ─
function TeamGroupTable({ teams, isPaid }: { teams: Map<string, { name: string; members: IndividualRegistration[] }>, isPaid: boolean }) {
    const entries = Array.from(teams.entries())
    return (
        <>
            <div className="resp-table">
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Department</th>
                                {isPaid && <th>Payment</th>}
                                <th>Registered At</th>
                                <th>Attendance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(([teamId, team], idx) => (
                                <React.Fragment key={teamId}>
                                    {idx > 0 && (
                                        <tr className="team-group-gap"><td colSpan={isPaid ? 6 : 5} /></tr>
                                    )}
                                    <tr className="team-group-header">
                                        <td colSpan={isPaid ? 6 : 5}>{team.name}</td>
                                    </tr>
                                    {team.members.map(r => (
                                        <tr key={r.id}>
                                            <td data-label="Name">{r.student?.name ?? '—'}</td>
                                            <td data-label="Phone">{(r.student as { phone_number?: string } | undefined)?.phone_number ?? '—'}</td>
                                            <td data-label="Department">{(r.student?.department as { name?: string } | undefined)?.name ?? '—'}</td>
                                            {isPaid && (
                                                <td data-label="Payment">
                                                    <Badge variant={paymentBadgeVariant(r.payment_status)}>
                                                        {PAYMENT_LABELS[r.payment_status] ?? r.payment_status}
                                                    </Badge>
                                                </td>
                                            )}
                                            <td data-label="Registered">{format(new Date(r.registered_at), 'dd/MM/yyyy')}</td>
                                            <td data-label="Attendance"><Badge variant={attendanceBadgeVariant(r.attendance_status)}>{r.attendance_status === 'attended' ? 'present' : r.attendance_status}</Badge></td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="resp-cards">
                {entries.map(([teamId, team]) => (
                    <div key={teamId} style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', padding: '0 2px 8px' }}>
                            {team.name}
                        </div>
                        {team.members.map(r => <RegCard key={r.id} r={r} isPaid={isPaid} />)}
                    </div>
                ))}
            </div>
        </>
    )
}

export function RegistrationsPanel({ event, registrations, teams = [] }: RegistrationsPanelProps) {
    const [showFilters, setShowFilters] = useState(false)
    const [filterDept, setFilterDept] = useState('')
    const [filterProgramme, setFilterProgramme] = useState('')
    const [filterSemester, setFilterSemester] = useState('')
    const [filterPaymentStatus, setFilterPaymentStatus] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    
    const pathname = usePathname()
    const isAdminOrTeacher = pathname.includes('/admin') || pathname.includes('/teacher')

    if (registrations.length === 0) {
        return <EmptyState icon={ClipboardList} title="No registrations yet" subtitle="No one has registered for this event yet." />
    }

    // For paid team events, derive payment_status from the team (not the individual registration)
    const isTeam = event.participant_type === 'multiple'
    const effectiveRegistrations = registrations.map(r => {
        if (isTeam && event.is_paid && r.team_id && (r.team as any)?.payment_status) {
            return { ...r, payment_status: (r.team as any).payment_status }
        }
        return r
    })

    const depts = Array.from(new Set(effectiveRegistrations.map(r => (r.student?.department as { id: string; name: string } | undefined)?.name).filter(Boolean)))
    const programmes = filterDept ? (DEPT_PROGRAMMES[filterDept] ?? []) : Object.values(DEPT_PROGRAMMES).flat()

    const filtered = effectiveRegistrations.filter(r => {
        const student = r.student as any
        const matchesDept = !filterDept || student?.department?.name === filterDept
        const matchesProg = !filterProgramme || student?.programme === filterProgramme
        const matchesSem = !filterSemester || String(student?.semester ?? 1) === filterSemester
        const matchesPayment = !filterPaymentStatus || r.payment_status === filterPaymentStatus
        return matchesDept && matchesProg && matchesSem && matchesPayment
    })

    const renderActionHeader = () => (
        <div style={{ paddingBottom: 24 }}>
            <div className="flex justify-between items-center gap-3">
                <div>
                    {isAdminOrTeacher && event.status === 'open' && (
                        <Button size="sm" onClick={() => setShowAddModal(true)}>
                            <Plus size={14} /> Add Participant
                        </Button>
                    )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                    <Filter size={14} /> {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
            </div>
            
            <div style={{ padding: '12px 0 0 4px', fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                Showing {filtered.length} registration{filtered.length !== 1 ? 's' : ''}
            </div>
        </div>
    )

    const renderFilterBar = () => showFilters && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end flex-wrap w-full glass rounded-2xl border border-border bg-bg-elevated" style={{ padding: 20, marginBottom: 24, gap: 20 }}>
            <div className="w-full sm:w-auto flex-1 sm:min-w-[160px] flex flex-col justify-end" style={{ gap: 8 }}>
                <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 500, margin: 0, opacity: 0.9 }}>Department</label>
                <select className="form-select w-full" value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterProgramme('') }}>
                    <option value="">All Departments</option>
                    {depts.map(d => <option key={d} value={d!}>{d}</option>)}
                </select>
            </div>
            <div className="w-full sm:w-auto flex-1 sm:min-w-[160px] flex flex-col justify-end" style={{ gap: 8 }}>
                <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 500, margin: 0, opacity: 0.9 }}>Programme</label>
                <select className="form-select w-full" value={filterProgramme} onChange={e => setFilterProgramme(e.target.value)}>
                    <option value="">All Programmes</option>
                    {programmes.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
            <div className="w-full sm:w-auto flex-1 sm:min-w-[160px] flex flex-col justify-end" style={{ gap: 8 }}>
                <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 500, margin: 0, opacity: 0.9 }}>Semester</label>
                <select className="form-select w-full" value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                    <option value="">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={String(s)}>Sem {s}</option>)}
                </select>
            </div>
            {event.is_paid && (
                <div className="w-full sm:w-auto flex-1 sm:min-w-[160px] flex flex-col justify-end" style={{ gap: 8 }}>
                    <label className="form-label" style={{ fontSize: '0.8125rem', fontWeight: 500, margin: 0, opacity: 0.9 }}>Payment Status</label>
                    <select className="form-select w-full" value={filterPaymentStatus} onChange={e => setFilterPaymentStatus(e.target.value)}>
                        <option value="">All Statuses</option>
                        {Object.entries(PAYMENT_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                </div>
            )}
            <div className="w-full sm:w-auto flex-shrink-0 flex flex-col justify-end" style={{ marginTop: 8 }}>
                <Button variant="ghost" size="sm" className="w-full sm:w-auto justify-center" style={{ height: 42 }} onClick={() => { setFilterDept(''); setFilterProgramme(''); setFilterSemester(''); setFilterPaymentStatus('') }}>
                    Clear
                </Button>
            </div>
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
            return <TeamGroupTable teams={teamMap} isPaid={event.is_paid} />
        }

        return <RegistrationTable rows={filtered} isPaid={event.is_paid} />
    }

    const mappedTeams = teams.map(t => ({
        id: t.id,
        team_name: t.team_name,
        memberCount: registrations.filter(r => r.team_id === t.id).length
    }))

    return (
        <div>
            {renderActionHeader()}
            {renderFilterBar()}
            {content()}
            
            {isAdminOrTeacher && (
                <AddParticipantModal 
                    eventId={event.id}
                    eventType={isTeam ? 'team' : 'individual'}
                    isPaid={event.is_paid}
                    teams={mappedTeams}
                    teamSize={event.team_size || undefined}
                    open={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false)
                        window.location.reload()
                    }}
                />
            )}
        </div>
    )
}
