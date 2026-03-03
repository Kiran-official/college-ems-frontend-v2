'use client'

import { useState, useTransition, useCallback } from 'react'
import Papa from 'papaparse'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { bulkCreateUsersAction } from '@/lib/actions/userActions'
import { Download, Upload, CheckCircle2, Trash2 } from 'lucide-react'

const VALID_DEPTS = ['Commerce', 'Computer Science']
const VALID_PROGS = ['BCom', 'BCom (A&F)', 'BCom (BDA)', 'BCom (CA)', 'BBA', 'BCA', 'BCA (AI & ML)']

/** Returns a map of field → error message for a single row */
function validateRowFields(row: Record<string, string>, role: 'student' | 'teacher') {
    const fieldErrors: Record<string, string> = {}
    if (!row.name?.trim()) fieldErrors.name = 'Name required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email ?? '')) fieldErrors.email = 'Invalid email'
    if (!VALID_DEPTS.includes(row.department?.trim())) fieldErrors.department = 'Invalid department'
    if (role === 'student' && !VALID_PROGS.includes(row.programme?.trim())) fieldErrors.programme = 'Invalid programme'
    return fieldErrors
}

interface CSVImportModalProps {
    open: boolean
    onClose: () => void
    role: 'student' | 'teacher'
}

type ValidatedRow = {
    row: Record<string, string>
    fieldErrors: Record<string, string>
    rowErrors: string[] // e.g. duplicate email
}

const FIELDS_STUDENT = ['name', 'email', 'phone_number', 'department', 'programme'] as const
const FIELDS_TEACHER = ['name', 'email', 'phone_number', 'department'] as const
const FIELD_LABELS: Record<string, string> = {
    name: 'Name', email: 'Email', phone_number: 'Phone',
    department: 'Dept', programme: 'Programme',
}

export function CSVImportModal({ open, onClose, role }: CSVImportModalProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
    const [validated, setValidated] = useState<ValidatedRow[]>([])
    const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
    const [, startTransition] = useTransition()

    const fields = role === 'student' ? FIELDS_STUDENT : FIELDS_TEACHER

    function revalidateAll(rows: ValidatedRow[]): ValidatedRow[] {
        // Build email-count map for duplicate check
        const emailCount = new Map<string, number>()
        rows.forEach(r => {
            const e = r.row.email?.trim().toLowerCase() ?? ''
            emailCount.set(e, (emailCount.get(e) ?? 0) + 1)
        })
        return rows.map(r => {
            const fieldErrors = validateRowFields(r.row, role)
            const rowErrors: string[] = []
            const email = r.row.email?.trim().toLowerCase() ?? ''
            if (emailCount.get(email)! > 1) rowErrors.push('Duplicate email in CSV')
            return { row: r.row, fieldErrors, rowErrors }
        })
    }

    function downloadSample() {
        const headers = role === 'student'
            ? 'name,email,phone_number,department,programme'
            : 'name,email,phone_number,department'
        const sample = role === 'student'
            ? '\nJohn Doe,john@example.com,9876543210,Commerce,BCom'
            : '\nJane Smith,jane@example.com,9876543210,Computer Science'
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
                const initial: ValidatedRow[] = rows.map(row => ({
                    row, fieldErrors: {}, rowErrors: [],
                }))
                setValidated(revalidateAll(initial))
                setStep(2)
            },
        })
    }

    /** Update a single cell, then re-validate everything */
    const updateCell = useCallback((rowIndex: number, field: string, value: string) => {
        setValidated(prev => {
            const next = prev.map((v, i) => {
                if (i !== rowIndex) return v
                return { ...v, row: { ...v.row, [field]: value } }
            })
            return revalidateAll(next)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role])

    /** Remove a row entirely */
    function deleteRow(rowIndex: number) {
        setValidated(prev => revalidateAll(prev.filter((_, i) => i !== rowIndex)))
    }

    function confirmImport() {
        setStep(3)
        const importReady = validated
            .filter(r => Object.keys(r.fieldErrors).length === 0 && r.rowErrors.length === 0)
            .map(r => ({ ...r.row }))

        startTransition(async () => {
            const res = await bulkCreateUsersAction(importReady as Parameters<typeof bulkCreateUsersAction>[0], role)
            setResult(res)
            setStep(4)
        })
    }

    const validCount = validated.filter(r => Object.keys(r.fieldErrors).length === 0 && r.rowErrors.length === 0).length
    const errorCount = validated.length - validCount

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
            xlarge={step === 2}
            large
        >
            {/* Step 1 — Instructions */}
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                            {role === 'student'
                                ? 'Headers: name, email, phone_number, department, programme'
                                : 'Headers: name, email, phone_number, department'}
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

            {/* Step 2 — Editable Preview */}
            {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {validCount} valid · {errorCount} with errors · {validated.length} total
                        {errorCount > 0 && (
                            <span style={{ color: 'var(--warning)', marginLeft: 8, fontSize: '0.75rem' }}>
                                — Edit fields below to fix errors
                            </span>
                        )}
                    </div>

                    <div style={{ maxHeight: 340, overflowY: 'auto', overflowX: 'auto' }}>
                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        {fields.map(f => <th key={f}>{FIELD_LABELS[f]}</th>)}
                                        <th>Status</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {validated.map((v, i) => {
                                        const hasFieldErr = Object.keys(v.fieldErrors).length > 0
                                        const hasRowErr = v.rowErrors.length > 0
                                        const hasErr = hasFieldErr || hasRowErr
                                        return (
                                            <tr key={i} style={hasErr ? { background: 'var(--error-bg)' } : undefined}>
                                                <td style={{ fontWeight: 600 }}>{i + 1}</td>
                                                {fields.map(field => {
                                                    const err = v.fieldErrors[field]
                                                    return (
                                                        <td key={field} style={{ padding: '6px 8px' }}>
                                                            <input
                                                                type="text"
                                                                value={v.row[field] ?? ''}
                                                                onChange={e => updateCell(i, field, e.target.value)}
                                                                title={err ?? undefined}
                                                                style={{
                                                                    width: '100%',
                                                                    minWidth: field === 'email' ? 140 : field === 'name' ? 100 : 80,
                                                                    padding: '6px 10px',
                                                                    fontSize: '0.8125rem',
                                                                    fontFamily: 'inherit',
                                                                    background: 'var(--bg-input)',
                                                                    color: 'var(--text-primary)',
                                                                    border: `1.5px solid ${err ? 'var(--error)' : 'var(--border)'}`,
                                                                    borderRadius: 'var(--r-sm)',
                                                                    outline: 'none',
                                                                    transition: 'border-color 0.15s',
                                                                }}
                                                                onFocus={e => {
                                                                    if (!err) e.currentTarget.style.borderColor = 'var(--accent)'
                                                                }}
                                                                onBlur={e => {
                                                                    if (!err) e.currentTarget.style.borderColor = 'var(--border)'
                                                                }}
                                                            />
                                                            {err && (
                                                                <div style={{ fontSize: '0.625rem', color: 'var(--error)', marginTop: 2 }}>
                                                                    {err}
                                                                </div>
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                                <td>
                                                    {!hasErr ? (
                                                        <Badge variant="generated">✓ Valid</Badge>
                                                    ) : (
                                                        <Badge variant="failed">
                                                            ✗ {Object.keys(v.fieldErrors).length + v.rowErrors.length} error{Object.keys(v.fieldErrors).length + v.rowErrors.length > 1 ? 's' : ''}
                                                        </Badge>
                                                    )}
                                                    {v.rowErrors.map((e, j) => (
                                                        <div key={j} style={{ fontSize: '0.625rem', color: 'var(--error)', marginTop: 2 }}>
                                                            {e}
                                                        </div>
                                                    ))}
                                                </td>
                                                <td style={{ padding: '6px 4px' }}>
                                                    <button
                                                        onClick={() => deleteRow(i)}
                                                        title="Remove row"
                                                        style={{
                                                            background: 'none', border: 'none', cursor: 'pointer',
                                                            color: 'var(--text-tertiary)', padding: 4, borderRadius: 'var(--r-sm)',
                                                            transition: 'color 0.15s',
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <Button variant="ghost" onClick={() => { setStep(1); setValidated([]) }}>Back</Button>
                        <Button onClick={confirmImport} disabled={validCount === 0}>
                            Confirm Import ({validCount} user{validCount !== 1 ? 's' : ''})
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
