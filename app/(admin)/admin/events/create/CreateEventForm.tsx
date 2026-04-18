'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'
import { MultiSelect } from '@/components/forms/MultiSelect'
import { DateTimeInput } from '@/components/forms/DateTimeInput'
import { createEventAction } from '@/lib/actions/eventActions'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/types/db'
import { EVENT_FORUMS } from '@/lib/types/db'

interface CreateEventFormProps {
    currentUser: User
    teachers: Pick<User, 'id' | 'name' | 'email' | 'role' | 'department_id'>[]
    basePath: string
    isAdmin: boolean
}

export function CreateEventForm({ currentUser, teachers, basePath, isAdmin }: CreateEventFormProps) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [error, setError] = useState('')

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [eventDate, setEventDate] = useState('')
    const [regDeadline, setRegDeadline] = useState('')
    const [forum, setForum] = useState('')
    const [visibility, setVisibility] = useState<'public_all' | 'internal_only' | 'external_only'>('public_all')
    const [participantType, setParticipantType] = useState<'single' | 'multiple'>('single')
    const [teamSize, setTeamSize] = useState<number | ''>('')

    // Payment fields
    const [isPaid, setIsPaid] = useState(false)
    const [registrationFee, setRegistrationFee] = useState<number | ''>('')
    const [qrFile, setQrFile] = useState<File | null>(null)
    const [qrPreview, setQrPreview] = useState<string | null>(null)
    const qrInputRef = useRef<HTMLInputElement>(null)

    // Faculty in charge
    const initialFaculty = isAdmin ? [] : [{ id: currentUser.id, name: currentUser.name }]
    const [faculty, setFaculty] = useState<Array<{ id: string; name: string }>>(initialFaculty)

    function handleQrChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setError('QR code must be an image file')
            return
        }
        setQrFile(file)
        const reader = new FileReader()
        reader.onload = (ev) => setQrPreview(ev.target?.result as string)
        reader.readAsDataURL(file)
    }

    async function uploadQrToStorage(file: File): Promise<string> {
        // Use the session-aware browser client for storage uploads
        const supabase = createClient()
        const ext = file.name.split('.').pop() ?? 'png'
        const path = `qr_${Date.now()}.${ext}`
        const { data, error } = await supabase.storage.from('event-qr').upload(path, file, { upsert: true })
        if (error) throw new Error('QR upload failed: ' + error.message)
        const { data: urlData } = supabase.storage.from('event-qr').getPublicUrl(data.path)
        return urlData.publicUrl
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (isPaid && !registrationFee) {
            setError('Please enter a registration fee for paid events')
            return
        }
        if (isPaid && !qrFile) {
            setError('Please upload a UPI QR code image for paid events')
            return
        }

        startTransition(async () => {
            try {
                let upiQrUrl: string | undefined
                if (isPaid && qrFile) {
                    upiQrUrl = await uploadQrToStorage(qrFile)
                }

                const result = await createEventAction({
                    title,
                    description: description || undefined,
                    event_date: eventDate,
                    registration_deadline: regDeadline,
                    department_id: undefined,
                    forum: forum || undefined,
                    visibility,
                    participant_type: participantType,
                    team_size: participantType === 'multiple' ? (teamSize as number) : undefined,
                    faculty_ids: faculty.map(f => f.id),
                    is_paid: isPaid,
                    registration_fee: isPaid ? (registrationFee as number) : undefined,
                    upi_qr_url: upiQrUrl,
                })

                if (result.success) {
                    router.push(`${basePath}/${result.event_id}`)
                } else {
                    setError(result.error ?? 'Failed to create event')
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to create event')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} style={{ paddingBottom: 40 }}>
            {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Event Details</h2>

                    <FormGroup label="Event Title" required>
                        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="Event name" />
                    </FormGroup>

                    <FormGroup label="Description">
                        <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} maxLength={500} placeholder="Brief description (optional)" />
                    </FormGroup>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormGroup label="Event Date & Time" required>
                            <DateTimeInput
                                value={eventDate}
                                onChange={setEventDate}
                                placeholder="Event date & time"
                                min={regDeadline || new Date().toISOString().slice(0, 16)}
                            />
                        </FormGroup>
                        <FormGroup label="Registration Deadline" required>
                            <DateTimeInput
                                value={regDeadline}
                                onChange={setRegDeadline}
                                placeholder="Last day to register"
                                max={eventDate}
                                min={new Date().toISOString().slice(0, 16)}
                            />
                        </FormGroup>
                    </div>

                    <FormGroup label="Forum">
                        <select className="form-select" value={forum} onChange={e => setForum(e.target.value)}>
                            <option value="">None</option>
                            {EVENT_FORUMS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </FormGroup>

                    <FormGroup label="Visibility" required>
                        <div className="flex flex-wrap gap-4 sm:gap-6">
                            {[
                                { value: 'public_all', label: 'Open to All' },
                                { value: 'internal_only', label: 'Internal Only' },
                                { value: 'external_only', label: 'External Only' },
                            ].map(opt => (
                                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
                                    <input
                                        type="radio"
                                        name="visibility"
                                        checked={visibility === opt.value}
                                        onChange={() => setVisibility(opt.value as typeof visibility)}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </FormGroup>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', opacity: 0.1 }} />

                {/* ── Payment Section ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Registration Fee</h2>

                    <FormGroup label="Event Type" required>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                    type="radio"
                                    name="isPaid"
                                    checked={!isPaid}
                                    onChange={() => { setIsPaid(false); setRegistrationFee(''); setQrFile(null); setQrPreview(null) }}
                                />
                                <span style={{ fontWeight: 600 }}>Free</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                    type="radio"
                                    name="isPaid"
                                    checked={isPaid}
                                    onChange={() => setIsPaid(true)}
                                />
                                <span style={{ fontWeight: 600 }}>Paid</span>
                            </label>
                        </div>
                    </FormGroup>

                    {isPaid && (
                        <>
                            <FormGroup label="Registration Fee (₹)" required>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={registrationFee}
                                    onChange={e => setRegistrationFee(e.target.value ? Number(e.target.value) : '')}
                                    min={1}
                                    step={0.01}
                                    placeholder="e.g. 100"
                                    style={{ maxWidth: 200 }}
                                />
                            </FormGroup>

                            <FormGroup label="UPI QR Code Image" required>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <input
                                        ref={qrInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleQrChange}
                                        style={{ display: 'none' }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => qrInputRef.current?.click()}
                                        style={{ width: 'fit-content' }}
                                    >
                                        {qrFile ? 'Change QR Image' : 'Upload QR Image'}
                                    </Button>
                                    {qrPreview && (
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <img
                                                src={qrPreview}
                                                alt="UPI QR Preview"
                                                style={{
                                                    width: 160,
                                                    height: 160,
                                                    objectFit: 'contain',
                                                    borderRadius: 'var(--r-md)',
                                                    border: '1px solid var(--border)',
                                                    background: '#fff',
                                                    padding: 8,
                                                }}
                                            />
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                                                {qrFile?.name}
                                            </p>
                                        </div>
                                    )}
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                        Upload a clear image of your UPI QR code. Max 2 MB. JPEG, PNG, or WebP.
                                    </p>
                                </div>
                            </FormGroup>
                        </>
                    )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', opacity: 0.1 }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <FormGroup label="Faculty in Charge">
                        <MultiSelect
                            options={teachers}
                            selectedIds={faculty.map(f => f.id)}
                            onChange={(selected: any[]) => {
                                if (!isAdmin) {
                                    // Ensure currentUser stays selected for non-admins
                                    if (!selected.find((s: any) => s.id === currentUser.id)) {
                                        const teacher = teachers.find(t => t.id === currentUser.id);
                                        if (teacher) selected = [teacher as any, ...selected];
                                    }
                                }
                                setFaculty(selected.map((s: any) => ({ id: s.id, name: s.name })))
                            }}
                            placeholder="Search and select faculty members..."
                        />
                    </FormGroup>

                    <FormGroup label="Participant Type" required>
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                    type="radio"
                                    name="participantType"
                                    checked={participantType === 'single'}
                                    onChange={() => setParticipantType('single')}
                                />
                                Single Participant
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                    type="radio"
                                    name="participantType"
                                    checked={participantType === 'multiple'}
                                    onChange={() => setParticipantType('multiple')}
                                />
                                Multiple Participants (Team)
                            </label>
                        </div>
                    </FormGroup>

                    {participantType === 'multiple' && (
                        <FormGroup label="Team Size" required>
                            <input
                                type="number"
                                className="form-input"
                                value={teamSize}
                                onChange={e => setTeamSize(e.target.value ? Number(e.target.value) : '')}
                                min={2}
                                placeholder="Exactly N members"
                                style={{ maxWidth: 200 }}
                            />
                        </FormGroup>
                    )}
                </div>
            </div>

            <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => router.back()} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" loading={pending} disabled={!title || !eventDate || !regDeadline} className="w-full sm:w-auto">
                    Create Event
                </Button>
            </div>
        </form>
    )
}
