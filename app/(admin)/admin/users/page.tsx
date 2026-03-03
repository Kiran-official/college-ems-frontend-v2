'use client'

<<<<<<< HEAD
import { useState, useTransition, useEffect } from 'react'
=======
import { useState, useTransition, useEffect, Suspense } from 'react'
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
import { useSearchParams, useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FormGroup } from '@/components/forms/FormGroup'
import { SearchInput } from '@/components/forms/SearchInput'
import { EmptyState } from '@/components/ui/EmptyState'
import { CSVImportModal } from '@/components/admin/CSVImportModal'
import { createUserAction, toggleUserActiveAction } from '@/lib/actions/userActions'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Upload, Power } from 'lucide-react'
import { format } from 'date-fns'
import type { User, Department } from '@/lib/types/db'

type Tab = 'students' | 'teachers' | 'admins'

<<<<<<< HEAD
export default function UsersPage() {
=======
function UsersContent() {
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
    const searchParams = useSearchParams()
    const router = useRouter()
    const tab = (searchParams.get('tab') as Tab) || 'students'

    const [users, setUsers] = useState<User[]>([])
    const [departments, setDepartments] = useState<Department[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    // Modals
    const [showCreate, setShowCreate] = useState(false)
    const [showCSV, setShowCSV] = useState(false)

    // Create form
    const [formData, setFormData] = useState({
<<<<<<< HEAD
        name: '', email: '', phone_number: '', role: tab === 'admins' ? 'admin' : tab === 'teachers' ? 'teacher' : 'student',
=======
        name: '', email: '', role: tab === 'admins' ? 'admin' : tab === 'teachers' ? 'teacher' : 'student',
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
        department_id: '', programme: '', student_type: 'internal' as 'internal' | 'external',
        date_of_birth: '',
    })
    const [createPending, startCreate] = useTransition()
    const [createError, setCreateError] = useState('')

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

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    )

    async function handleCreate() {
        setCreateError('')
        const role = tab === 'admins' ? 'admin' : tab === 'teachers' ? 'teacher' : 'student'
        startCreate(async () => {
            const result = await createUserAction({
                name: formData.name,
                email: formData.email,
                role: role as 'admin' | 'teacher' | 'student',
<<<<<<< HEAD
                phone_number: formData.phone_number || undefined,
=======
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
                department_id: formData.department_id || undefined,
                programme: formData.programme || undefined,
                student_type: role === 'student' ? formData.student_type : undefined,
                date_of_birth: formData.date_of_birth || undefined,
            })
            if (result.success) {
                setShowCreate(false)
<<<<<<< HEAD
                setFormData({ name: '', email: '', phone_number: '', role, department_id: '', programme: '', student_type: 'internal', date_of_birth: '' })
=======
                setFormData({ name: '', email: '', role, department_id: '', programme: '', student_type: 'internal', date_of_birth: '' })
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <SearchInput value={search} onChange={setSearch} placeholder={`Search ${tabRole.toLowerCase()}s…`} />
                <div style={{ display: 'flex', gap: 8 }}>
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
<<<<<<< HEAD
                                <th>Phone</th>
=======
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
                                {tab !== 'admins' && <th>Department</th>}
                                {tab === 'students' && <th>Programme</th>}
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
<<<<<<< HEAD
                                    <td>{u.phone_number ?? '—'}</td>
=======
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
                                    {tab !== 'admins' && <td>{u.department?.name ?? '—'}</td>}
                                    {tab === 'students' && <td>{u.programme ?? '—'}</td>}
                                    {tab === 'students' && (
                                        <td><Badge variant={u.student_type ?? 'internal'}>{u.student_type ?? 'internal'}</Badge></td>
                                    )}
                                    <td>
                                        <Badge variant={u.is_active ? 'generated' : 'failed'}>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
                                    <td>{format(new Date(u.created_at), 'dd MMM yyyy')}</td>
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
<<<<<<< HEAD
                    <FormGroup label="Phone Number">
                        <input className="form-input" type="tel" value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} placeholder="e.g. 9876543210" />
                    </FormGroup>
=======
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
                    <FormGroup label="Department">
                        <select className="form-select" value={formData.department_id} onChange={e => setFormData({ ...formData, department_id: e.target.value })}>
                            <option value="">Select…</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </FormGroup>
                    {tab === 'students' && (
                        <>
                            <FormGroup label="Programme">
                                <select className="form-select" value={formData.programme} onChange={e => setFormData({ ...formData, programme: e.target.value })}>
                                    <option value="">Select…</option>
                                    {['BCom', 'BCom (A&F)', 'BCom (BDA)', 'BCom (CA)', 'BBA', 'BCA', 'BCA (AI & ML)'].map(p => (
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
                    <FormGroup label="Date of Birth" helper="DD-MM-YYYY format (optional)">
                        <input className="form-input" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} placeholder="DD-MM-YYYY" />
                    </FormGroup>
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
<<<<<<< HEAD
=======

export default function UsersPage() {
    return (
        <Suspense fallback={<div className="page" style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Loading users...</div>}>
            <UsersContent />
        </Suspense>
    )
}
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
