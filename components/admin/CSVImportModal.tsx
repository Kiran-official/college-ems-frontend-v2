'use client'

import { useState, useTransition } from 'react'
import Papa from 'papaparse'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { bulkCreateUsersAction } from '@/lib/actions/userActions'
import { Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react'

const VALID_DEPTS = ['Commerce', 'Computer Science']
const VALID_PROGS = ['BCom', 'BCom (A&F)', 'BCom (BDA)', 'BCom (CA)', 'BBA', 'BCA', 'BCA (AI & ML)']
const DOB_REGEX = /^(\d{2})-(\d{2})-(\d{4})$/

function parseDOB(val: string): { valid: boolean; iso?: string; error?: string } {
    const m = val.match(DOB_REGEX)
    if (!m) return { valid: false, error: 'Date must be DD-MM-YYYY' }
    const [, dd, mm, yyyy] = m
    const date = new Date(`${yyyy}-${mm}-${dd}`)
    if (isNaN(date.getTime())) return { valid: false, error: 'Invalid calendar date' }
    return { valid: true, iso: `${yyyy}-${mm}-${dd}` }
}

function validateRow(row: Record<string, string>, role: 'student' | 'teacher') {
    const errors: string[] = []
    if (!row.name?.trim()) errors.push('Name required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email ?? '')) errors.push('Invalid email')
    if (!VALID_DEPTS.includes(row.department?.trim())) errors.push('Invalid department')
    if (role === 'student' && !VALID_PROGS.includes(row.programme?.trim())) errors.push('Invalid programme')
    if (row.date_of_birth?.trim()) {
        const r = parseDOB(row.date_of_birth.trim())
        if (!r.valid) errors.push(r.error!)
    }
    return errors
}

interface CSVImportModalProps {
    open: boolean
    onClose: () => void
    role: 'student' | 'teacher'
}

type ValidatedRow = {
    row: Record<string, string>
    errors: string[]
}

export function CSVImportModal({ open, onClose, role }: CSVImportModalProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
    const [validated, setValidated] = useState<ValidatedRow[]>([])
    const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
    const [pending, startTransition] = useTransition()

    function downloadSample() {
        const headers = role === 'student'
            ? 'name,email,phone_number,department,programme,date_of_birth'
            : 'name,email,phone_number,department,date_of_birth'
        const sample = role === 'student'
            ? '\nJohn Doe,john@example.com,9876543210,Commerce,BCom,15-08-2002'
            : '\nJane Smith,jane@example.com,9876543210,Computer Science,20-05-1990'
        const blob = new Blob([headers + sample], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sample_${role}s.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    function handleFile(file: File) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as Record<string, string>[]
                // Check for duplicate emails within CSV
                const emailCount = new Map<string, number>()
                rows.forEach(r => {
                    const e = r.email?.trim().toLowerCase() ?? ''
                    emailCount.set(e, (emailCount.get(e) ?? 0) + 1)
                })

                const validatedRows: ValidatedRow[] = rows.map(row => {
                    const errors = validateRow(row, role)
                    const email = row.email?.trim().toLowerCase() ?? ''
                    if (emailCount.get(email)! > 1) errors.push('Duplicate email in CSV')
                    return { row, errors }
                })

                setValidated(validatedRows)
                setStep(2)
            },
        })
    }

    function confirmImport() {
        setStep(3)
        const importReady = validated
            .filter(r => r.errors.length === 0)
            .map(r => ({
                ...r.row,
                date_of_birth: r.row.date_of_birth?.trim()
                    ? parseDOB(r.row.date_of_birth.trim()).iso
                    : undefined,
            }))

        startTransition(async () => {
            const res = await bulkCreateUsersAction(importReady as Parameters<typeof bulkCreateUsersAction>[0], role)
            setResult(res)
            setStep(4)
        })
    }

    const hasErrors = validated.some(r => r.errors.length > 0)
    const validCount = validated.filter(r => r.errors.length === 0).length

    function handleClose() {
        setStep(1)
        setValidated([])
        setResult(null)
        onClose()
    }

    return (
        <Modal
            open={open}
            onClose={step === 3 ? () => { } : handleClose}
            title={`Import ${role === 'student' ? 'Students' : 'Teachers'} via CSV`}
            subtitle={step === 1 ? 'Upload a CSV file to bulk import users' : undefined}
            large
        >
            {/* Step 1 — Instructions */}
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                            {role === 'student'
                                ? 'Headers: name, email, phone_number, department, programme, date_of_birth'
                                : 'Headers: name, email, phone_number, department, date_of_birth'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--warning)' }}>
                            Date format: DD-MM-YYYY (e.g. 15-08-2002)
                        </div>
                    </div>

                    <Button variant="outline" size="sm" onClick={downloadSample}>
                        <Download size={14} /> Download Sample CSV
                    </Button>

                    <div
                        style={{
                            border: '2px dashed var(--border-glass)',
                            borderRadius: 'var(--r-lg)',
                            padding: 40,
                            textAlign: 'center',
                            cursor: 'pointer',
                        }}
                        onClick={() => document.getElementById('csv-upload')?.click()}
                        onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                        onDrop={e => {
                            e.preventDefault()
                            const file = e.dataTransfer.files[0]
                            if (file && file.name.endsWith('.csv')) handleFile(file)
                        }}
                    >
                        <Upload size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
                        <div style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                            Drag & drop a CSV file here, or click to browse
                        </div>
                        <input
                            id="csv-upload"
                            type="file"
                            accept=".csv"
                            hidden
                            onChange={e => {
                                const file = e.target.files?.[0]
                                if (file) handleFile(file)
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Step 2 — Preview */}
            {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {validCount} valid · {validated.length - validCount} with errors · {validated.length} total
                    </div>

                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Dept</th>
                                        {role === 'student' && <th>Programme</th>}
                                        <th>DOB</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {validated.map((v, i) => (
                                        <tr key={i}>
                                            <td>{i + 1}</td>
                                            <td>{v.row.name}</td>
                                            <td>{v.row.email}</td>
                                            <td>{v.row.phone_number ?? '—'}</td>
                                            <td>{v.row.department}</td>
                                            {role === 'student' && <td>{v.row.programme}</td>}
                                            <td>{v.row.date_of_birth}</td>
                                            <td>
                                                {v.errors.length === 0 ? (
                                                    <Badge variant="generated">✓ Valid</Badge>
                                                ) : (
                                                    <span style={{ color: 'var(--error)', fontSize: '0.75rem' }}>
                                                        ✗ {v.errors.join(', ')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <Button variant="ghost" onClick={() => { setStep(1); setValidated([]) }}>Back</Button>
                        <Button onClick={confirmImport} disabled={hasErrors || validCount === 0}>
                            Confirm Import ({validCount} users)
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3 — Processing */}
            {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 40 }}>
                    <span className="spinner" style={{ width: 32, height: 32 }} />
                    <div style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                        Creating users in Supabase…
                    </div>
                </div>
            )}

            {/* Step 4 — Result */}
            {step === 4 && result && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 20 }}>
                    <CheckCircle2 size={48} style={{ color: 'var(--success)' }} />
                    <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                        ✓ {result.created} users created · {result.skipped} skipped
                    </div>
                    {result.errors.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--error)', maxHeight: 100, overflowY: 'auto' }}>
                            {result.errors.map((e, i) => <div key={i}>{e}</div>)}
                        </div>
                    )}
                    <Button onClick={handleClose}>Done</Button>
                </div>
            )}
        </Modal>
    )
}
