'use client'

import { useState, useTransition, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FormGroup } from '@/components/forms/FormGroup'
import { SearchInput } from '@/components/forms/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { CSVImportModal } from '@/components/admin/CSVImportModal'
import { createUserAction, toggleUserActiveAction } from '@/lib/actions/userActions'
import { incrementSemesterAction, decrementSemesterAction } from '@/lib/actions/semesterActions'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Upload, Power, Filter, ChevronUp, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import type { User, Department } from '@/lib/types/db'

type Tab = 'students' | 'teachers' | 'admins'

const DEPT_PROGRAMMES: Record<string, string[]> = {
    'Commerce': ['BCOM', 'BCOM(A&F)', 'BCOM(BDA)', 'BCOM(CA)', 'BBA'],
    'Computer Science': ['BCA', 'BCA(AI&ML)'],
}

function UsersContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const tab = (searchParams.get('tab') as Tab) || 'students'

    const [users, setUsers] = useState<User[]>([])
    const [departments, setDepartments] = useState<Department[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    // Filters
    const [showFilters, setShowFilters] = useState(false)
    const [filterDept, setFilterDept] = useState('')
    const [filterProgramme, setFilterProgramme] = useState('')
    const [filterSemester, setFilterSemester] = useState('')
    const [filterStudentType, setFilterStudentType] = useState('')

    // Modals
    const [showCreate, setShowCreate] = useState(false)
    const [showCSV, setShowCSV] = useState(false)

    // Create form
    const [formData, setFormData] = useState({
        name: '', email: '', phone_number: '', role: tab === 'admins' ? 'admin' : tab === 'teachers' ? 'teacher' : 'student',
        department_id: '', programme: '', student_type: 'internal' as 'internal' | 'external',
    })
    const [createPending, startCreate] = useTransition()
    const [createError, setCreateError] = useState('')

    // Semester actions
    const [semesterPending, startSemester] = useTransition()

    useEffect(() => {
        loadData()
    }, [tab])

    async function loadData() {
        setLoading(true)
        const supabase = createClient()
        const role = tab === 'admins' ? 'admin' : tab === 'teachers' ? 'teacher' : 'student'
        const { data: usersData } = await supabase
            .from('users')
            .select('*, department:departments(*)')
            .eq('role', role)
            .order('name')
        const { data: deptsData } = await supabase
            .from('departments')
            .select('*')
            .eq('is_active', true)
            .order('name')
        setUsers(usersData ?? [])
        setDepartments(deptsData ?? [])
        setLoading(false)
    }

    function setTab(t: Tab) {
        router.push(`/admin/users?tab=${t}`)
    }

    // Only show departments that exist in DEPT_PROGRAMMES
    const allowedDepts = departments.filter(d => Object.keys(DEPT_PROGRAMMES).includes(d.name))

    // Get programmes for selected department
    const selectedDeptName = departments.find(d => d.id === formData.department_id)?.name ?? ''
    const availableProgrammes = DEPT_PROGRAMMES[selectedDeptName] ?? []

    // Filter programmes for filter dropdown based on filter dept
    const filterDeptName = departments.find(d => d.id === filterDept)?.name ?? ''
    const filterProgrammes = filterDeptName ? (DEPT_PROGRAMMES[filterDeptName] ?? []) : Object.values(DEPT_PROGRAMMES).flat()

    const filtered = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        const matchesDept = !filterDept || u.department_id === filterDept
        const matchesProg = !filterProgramme || u.programme === filterProgramme
        const matchesSem = !filterSemester || String(u.semester ?? 1) === filterSemester
        const matchesType = !filterStudentType || (u.student_type ?? 'internal') === filterStudentType
        return matchesSearch && matchesDept && matchesProg && matchesSem && matchesType
    })

    async function handleCreate() {
        setCreateError('')
        const role = tab === 'admins' ? 'admin' : tab === 'teachers' ? 'teacher' : 'student'
        startCreate(async () => {
            const result = await createUserAction({
                name: formData.name,
                email: formData.email,
                role: role as 'admin' | 'teacher' | 'student',
                phone_number: formData.phone_number || undefined,
                department_id: formData.department_id || undefined,
                programme: formData.programme || undefined,
                student_type: role === 'student' ? formData.student_type : undefined,
            })
            if (result.success) {
                setShowCreate(false)
                setFormData({ name: '', email: '', phone_number: '', role, department_id: '', programme: '', student_type: 'internal' })
                loadData()
            } else {
                setCreateError(result.error ?? 'Failed to create user')
            }
        })
    }

    const [togglePending, startToggle] = useTransition()
    function toggleActive(userId: string, current: boolean) {
        startToggle(async () => {
            await toggleUserActiveAction(userId, !current)
            loadData()
        })
    }

    function handleSemesterChange(direction: 'up' | 'down') {
        startSemester(async () => {
            const result = direction === 'up'
                ? await incrementSemesterAction()
                : await decrementSemesterAction()
            if (result.success) loadData()
            else alert(result.error ?? 'Failed to update semester')
        })
    }

    const tabRole = tab === 'admins' ? 'Admin' : tab === 'teachers' ? 'Teacher' : 'Student'

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">User Management</h1>
                <p className="page-sub">Manage administrators, teachers, and students</p>
            </div>

            {/* Tab bar */}
            <div className="tab-bar">
                {(['students', 'teachers', 'admins'] as Tab[]).map(t => (
                    <button
                        key={t}
                        className={`tab-item ${tab === t ? 'tab-item--active' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                    <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tabRole.toLowerCase()}s…`} />
                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                        <Filter size={14} /> Filters
                    </Button>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {tab === 'students' && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <Button variant="outline" size="sm" onClick={() => handleSemesterChange('up')} loading={semesterPending} title="Increment semester for all students">
                                <ChevronUp size={14} /> Next Sem
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleSemesterChange('down')} loading={semesterPending} title="Undo semester increment">
                                <ChevronDown size={14} /> Undo
                            </Button>
                        </div>
                    )}
                    {tab !== 'admins' && (
                        <Button variant="outline" size="sm" onClick={() => setShowCSV(true)}>
                            <Upload size={14} /> Import CSV
                        </Button>
                    )}
                    <Button size="sm" onClick={() => setShowCreate(true)}>
                        <Plus size={14} /> Add {tabRole}
                    </Button>
                </div>
            </div>

            {/* Filter bar */}
            {showFilters && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    {tab !== 'admins' && (
                        <div style={{ minWidth: 160 }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Department</label>
                            <select className="form-select" value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterProgramme('') }}>
                                <option value="">All Departments</option>
                                {allowedDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    )}
                    {tab === 'students' && (
                        <>
                            <div style={{ minWidth: 160 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Programme</label>
                                <select className="form-select" value={filterProgramme} onChange={e => setFilterProgramme(e.target.value)}>
                                    <option value="">All Programmes</option>
                                    {filterProgrammes.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div style={{ minWidth: 120 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Semester</label>
                                <select className="form-select" value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                                    <option value="">All Semesters</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={String(s)}>Sem {s}</option>)}
                                </select>
                            </div>
                            <div style={{ minWidth: 120 }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Student Type</label>
                                <select className="form-select" value={filterStudentType} onChange={e => setFilterStudentType(e.target.value)}>
                                    <option value="">All Types</option>
                                    <option value="internal">Internal</option>
                                    <option value="external">External</option>
                                </select>
                            </div>
                        </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { setFilterDept(''); setFilterProgramme(''); setFilterSemester(''); setFilterStudentType('') }}>
                        Clear
                    </Button>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 'var(--r-md)' }} />)}
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={Users} title={`No ${tabRole.toLowerCase()}s found`} subtitle={search ? 'Try a different search term' : `No ${tabRole.toLowerCase()}s have been added yet.`} />
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                {tab !== 'admins' && <th>Department</th>}
                                {tab === 'students' && <th>Programme</th>}
                                {tab === 'students' && <th>Semester</th>}
                                {tab === 'students' && <th>Type</th>}
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => (
                                <tr key={u.id}>
                                    <td>{u.name}</td>
                                    <td>{u.email}</td>
                                    <td>{u.phone_number ?? '—'}</td>
                                    {tab !== 'admins' && <td>{u.department?.name ?? '—'}</td>}
                                    {tab === 'students' && <td>{u.programme ?? '—'}</td>}
                                    {tab === 'students' && <td>{u.semester ?? 1}</td>}
                                    {tab === 'students' && (
                                        <td><Badge variant={u.student_type ?? 'internal'}>{u.student_type ?? 'internal'}</Badge></td>
                                    )}
                                    <td>
                                        <Badge variant={u.is_active ? 'generated' : 'failed'}>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
                                    <td>{format(new Date(u.created_at), 'dd/MM/yyyy')}</td>
                                    <td>
                                        <Button
                                            size="sm"
                                            variant={u.is_active ? 'danger' : 'outline'}
                                            onClick={() => toggleActive(u.id, u.is_active)}
                                            loading={togglePending}
                                        >
                                            <Power size={12} /> {u.is_active ? 'Deactivate' : 'Activate'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create user modal */}
            <Modal open={showCreate} onClose={() => setShowCreate(false)} title={`Add New ${tabRole}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {createError && <div className="form-error">{createError}</div>}
                    <FormGroup label="Full Name" required>
                        <input className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </FormGroup>
                    <FormGroup label="Email" required>
                        <input className="form-input" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </FormGroup>
                    <FormGroup label="Phone Number">
                        <input className="form-input" type="tel" value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} placeholder="e.g. 9876543210" />
                    </FormGroup>
                    {tab !== 'admins' && (
                        <FormGroup label="Department">
                            <select className="form-select" value={formData.department_id} onChange={e => setFormData({ ...formData, department_id: e.target.value, programme: '' })}>
                                <option value="">Select…</option>
                                {allowedDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </FormGroup>
                    )}
                    {tab === 'students' && (
                        <>
                            <FormGroup label="Programme">
                                <select className="form-select" value={formData.programme} onChange={e => setFormData({ ...formData, programme: e.target.value })}>
                                    <option value="">Select…</option>
                                    {availableProgrammes.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </FormGroup>
                            <FormGroup label="Student Type">
                                <select className="form-select" value={formData.student_type} onChange={e => setFormData({ ...formData, student_type: e.target.value as 'internal' | 'external' })}>
                                    <option value="internal">Internal</option>
                                    <option value="external">External</option>
                                </select>
                            </FormGroup>
                        </>
                    )}

                </div>
                <div className="modal-footer">
                    <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button onClick={handleCreate} loading={createPending} disabled={!formData.name || !formData.email}>
                        Create {tabRole}
                    </Button>
                </div>
            </Modal>

            {/* CSV Import Modal */}
            <CSVImportModal
                open={showCSV}
                onClose={() => { setShowCSV(false); loadData() }}
                role={tab === 'teachers' ? 'teacher' : 'student'}
            />
        </div>
    )
}

export default function UsersPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 24 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 'var(--r-md)' }} />)}
        </div>}>
            <UsersContent />
        </Suspense>
    )
}
