'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'
import { createTemplateAction, updateTemplateAction, uploadTemplateBackgroundAction } from '@/lib/actions/certificateActions'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, Move, GripVertical, Upload, Loader2, AlignLeft, AlignCenter, AlignRight, Type, Bold, Italic, Settings2, LayoutTemplate, Paintbrush, Image as ImageIcon } from 'lucide-react'
import type { TemplateField, TemplateLayout, CertificateTemplate, Event } from '@/lib/types/db'

const DEFAULT_TEMPLATE_FIELDS: TemplateField[] = [
    { id: 'default-1', field_type: 'student_name', x: 50, y: 35, width: 60, fontSize: 32, fontFamily: 'Space Grotesk', color: '#FFFFFF', bold: true, italic: false, align: 'center' },
    { id: 'default-2', field_type: 'event_name', x: 50, y: 50, width: 70, fontSize: 18, fontFamily: 'Space Grotesk', color: '#A0AECB', bold: false, italic: false, align: 'center' },
    { id: 'default-4', field_type: 'position', x: 50, y: 63, width: 50, fontSize: 16, fontFamily: 'Space Grotesk', color: '#F5A623', bold: true, italic: false, align: 'center' },
    { id: 'default-5', field_type: 'date', x: 50, y: 72, width: 40, fontSize: 14, fontFamily: 'Space Grotesk', color: '#5B6B8A', bold: false, italic: false, align: 'center' },
    { id: 'default-6', field_type: 'certificate_type', x: 85, y: 85, width: 20, fontSize: 12, fontFamily: 'Space Grotesk', color: '#5B6B8A', bold: false, italic: false, align: 'right' },
]

function initFields(): TemplateField[] {
    return DEFAULT_TEMPLATE_FIELDS
}

const FIELD_TYPES = [
    { value: 'student_name', label: 'Student Name' },
    { value: 'event_name', label: 'Event Name' },
    { value: 'position', label: 'Position / Award' },
    { value: 'date', label: 'Date' },
    { value: 'certificate_type', label: 'Certificate Type' },
    { value: 'custom', label: 'Custom Text' },
]

interface TemplateBuilderProps {
    events: Event[]
    template?: CertificateTemplate
    basePath: string
}

export function TemplateBuilder({ events, template, basePath }: TemplateBuilderProps) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [uploading, setUploading] = useState(false)
    const canvasRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const searchParams = useSearchParams()
    
    // Prefill logic
    const queryEventId = searchParams.get('eventId')
    const queryType = searchParams.get('type') as 'participation' | 'winner' | null

    const [eventId, setEventId] = useState(template?.event_id ?? queryEventId ?? '')
    const [templateName, setTemplateName] = useState(template?.template_name ?? '')
    const [certType, setCertType] = useState<'participation' | 'winner'>(
        template?.certificate_type ?? queryType ?? 'participation'
    )
    const [bgUrl, setBgUrl] = useState(template?.background_image_url ?? '')

    const selectedEvent = events.find(e => e.id === eventId)

    const [fields, setFields] = useState<TemplateField[]>(
        template?.layout_json?.fields ?? initFields()
    )
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
    const [dragging, setDragging] = useState<string | null>(null)

    const selectedField = fields.find(f => f.id === selectedFieldId) ?? null

    const availableFieldTypes = FIELD_TYPES

    function addField(fieldType: string) {
        const newField: TemplateField = {
            id: `field_${Date.now()}`,
            field_type: fieldType,
            x: 50, y: 50, width: 40,
            fontSize: 16, fontFamily: 'Space Grotesk',
            color: '#FFFFFF', bold: false, italic: false,
            align: 'center',
            ...(fieldType === 'custom' ? { customText: 'Custom text here' } : {}),
        }
        setFields([...fields, newField])
        setSelectedFieldId(newField.id)
    }

    function updateField(id: string, updates: Partial<TemplateField>) {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f))
    }

    function removeField(id: string) {
        setFields(fields.filter(f => f.id !== id))
        if (selectedFieldId === id) setSelectedFieldId(null)
    }

    // Drag handling
    const handleMouseDown = useCallback((fieldId: string, e: React.MouseEvent) => {
        e.preventDefault()
        setDragging(fieldId)
        setSelectedFieldId(fieldId)
    }, [])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragging || !canvasRef.current) return
        const rect = canvasRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
        const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
        updateField(dragging, { x: Math.round(x), y: Math.round(y) })
    }, [dragging, fields])

    const handleMouseUp = useCallback(() => {
        setDragging(null)
    }, [])

    function getFieldLabel(f: TemplateField) {
        if (f.field_type === 'custom') return f.customText ?? 'Custom'
        const ft = FIELD_TYPES.find(t => t.value === f.field_type)
        return ft?.label ?? f.field_type
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            alert('File is too large. Max size is 5MB.')
            return
        }

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const result = await uploadTemplateBackgroundAction(formData)
            if (result.success && result.url) {
                setBgUrl(result.url)
            } else {
                alert(result.error || 'Failed to upload image')
            }
        } catch (err: any) {
            console.error('Client Upload Error:', err)
            alert('Upload failed: ' + (err?.message || 'An unexpected error occurred'))
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    function save() {
        if (!eventId || !templateName.trim()) return
        const layout: TemplateLayout = { fields }

        startTransition(async () => {
            if (template) {
                const result = await updateTemplateAction(template.id, { template_name: templateName, layout_json: layout, background_image_url: bgUrl || undefined })
                if (result.success) {
                    alert('Template updated successfully.')
                } else {
                    alert(result.error || 'Failed to update template.')
                }
            } else {
                const result = await createTemplateAction({
                    event_id: eventId,
                    template_name: templateName.trim(),
                    certificate_type: certType,
                    layout_json: layout,
                    background_image_url: bgUrl || undefined,
                })
                if (result.success && result.template_id) {
                    router.push(`${basePath}/${result.template_id}`)
                } else {
                    alert(result.error || 'Failed to create template.')
                    console.error('Template creation error:', result.error)
                }
            }
        })
    }

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-[400px_1fr] gap-8 items-start min-h-[calc(100vh-140px)]">
            {/* Left panel — toolbar and field properties */}
            <div className="flex flex-col gap-6 lg:pr-2 lg:pb-[120px] w-full">
                {/* Meta fields */}
                <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, borderRadius: 'var(--r-lg)', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, rgba(0,201,255,0.2) 0%, rgba(146,254,157,0.2) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,201,255,0.3)' }}>
                            <Settings2 size={16} color="var(--accent)" />
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Template Settings</h3>
                    </div>

                    <FormGroup label="Template Name" required>
                        <input className="form-input" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Participation Certificate" />
                    </FormGroup>
                    <FormGroup label="Event" required>
                        <select className="form-select" value={eventId} onChange={e => setEventId(e.target.value)} disabled={!!template}>
                            <option value="">Select event…</option>
                            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                        </select>
                    </FormGroup>
                    <FormGroup label="Certificate Type">
                        <select className="form-select" value={certType} onChange={e => setCertType(e.target.value as 'participation' | 'winner')} disabled={!!template}>
                            <option value="participation">Participation</option>
                            <option value="winner">Winner</option>
                        </select>
                    </FormGroup>

                    <FormGroup label="Background Image">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <ImageIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input className="form-input" style={{ paddingLeft: 34 }} value={bgUrl} onChange={e => setBgUrl(e.target.value)} placeholder="https://…" />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    loading={uploading}
                                    type="button"
                                    style={{ height: 42 }}
                                >
                                    {!uploading && <Upload size={14} style={{ marginRight: 6 }} />}
                                    Upload
                                </Button>
                            </div>
                            {bgUrl && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} /> Background applied
                                </div>
                            )}
                        </div>
                    </FormGroup>
                </div>

                {/* Add field buttons */}
                <div className="glass" style={{ padding: 24, borderRadius: 'var(--r-lg)', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(255,0,128,0.2) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(124,58,237,0.3)' }}>
                            <LayoutTemplate size={16} color="#B983FF" />
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Fields</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {availableFieldTypes.map(ft => (
                            <button
                                key={ft.value}
                                onClick={() => addField(ft.value)}
                                className="glass-button"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '10px 12px',
                                    borderRadius: 'var(--r-md)',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                                    e.currentTarget.style.color = 'var(--text-primary)'
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                                    e.currentTarget.style.color = 'var(--text-secondary)'
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                                }}
                            >
                                <Plus size={14} style={{ opacity: 0.6 }} />
                                {ft.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selected field properties */}
                {selectedField && (
                    <div className="glass" style={{
                        padding: 24,
                        borderRadius: 'var(--r-lg)',
                        border: '1px solid var(--accent)',
                        boxShadow: '0 0 20px rgba(0, 201, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Glow effect */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.5 }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'rgba(0, 201, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 201, 255, 0.2)' }}>
                                    <Paintbrush size={16} color="var(--accent)" />
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Design Field</h3>
                            </div>
                            <button
                                onClick={() => removeField(selectedField.id)}
                                style={{
                                    background: 'rgba(255, 68, 68, 0.1)',
                                    border: '1px solid rgba(255, 68, 68, 0.2)',
                                    borderRadius: 'var(--r-sm)',
                                    width: 32,
                                    height: 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'var(--error)',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)' }}
                                title="Remove Field"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {selectedField.field_type === 'custom' && (
                            <FormGroup label="Text">
                                <input className="form-input" value={selectedField.customText ?? ''} onChange={e => updateField(selectedField.id, { customText: e.target.value })} />
                            </FormGroup>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <FormGroup label="Font Size">
                                <input type="number" className="form-input" value={selectedField.fontSize} onChange={e => updateField(selectedField.id, { fontSize: Number(e.target.value) })} min={8} max={72} />
                            </FormGroup>
                            <FormGroup label="Color">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-input)', border: '1px solid var(--border-input)', borderRadius: 'var(--r-md)', padding: '4px 8px' }}>
                                    <input type="color" value={selectedField.color} onChange={e => updateField(selectedField.id, { color: e.target.value })} style={{ width: 28, height: 28, border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0, background: 'none' }} />
                                    <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{selectedField.color}</span>
                                </div>
                            </FormGroup>
                        </div>

                        <FormGroup label="Alignment">
                            <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                                {(['left', 'center', 'right'] as const).map(align => (
                                    <button
                                        key={align}
                                        onClick={() => updateField(selectedField.id, { align })}
                                        style={{
                                            flex: 1,
                                            height: 36,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 'var(--r-sm)',
                                            background: selectedField.align === align ? 'var(--focus-ring)' : 'transparent',
                                            color: selectedField.align === align ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: selectedField.align === align ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                                        }}
                                    >
                                    {align === 'left' && <AlignLeft size={16} />}
                                    {align === 'center' && <AlignCenter size={16} />}
                                    {align === 'right' && <AlignRight size={16} />}
                                </button>
                            ))}
                        </div>
                    </FormGroup>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <button
                            onClick={() => updateField(selectedField.id, { bold: !selectedField.bold })}
                            className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-md border transition-all ${selectedField.bold ? 'bg-accent/15 border-accent text-primary font-semibold' : 'bg-black/20 border-border text-secondary'}`}
                        >
                            <Bold size={14} /> Bold
                        </button>
                        <button
                            onClick={() => updateField(selectedField.id, { italic: !selectedField.italic })}
                            className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-md border transition-all ${selectedField.italic ? 'bg-accent/15 border-accent text-primary italic' : 'bg-black/20 border-border text-secondary'}`}
                        >
                            <Italic size={14} /> Italic
                        </button>
                    </div>

                        <div style={{ position: 'relative', padding: '16px 0 8px', marginTop: 8 }}>
                            <div style={{ position: 'absolute', top: 0, left: -24, right: -24, height: 1, background: 'var(--border-glass)' }} />
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 12 }}>Position & Size</div>
                            <div className="grid grid-cols-3 gap-3">
                                <FormGroup label="X %">
                                    <input type="number" className="form-input text-center px-2" value={selectedField.x} onChange={e => updateField(selectedField.id, { x: Number(e.target.value) })} min={0} max={100} />
                                </FormGroup>
                                <FormGroup label="Y %">
                                    <input type="number" className="form-input text-center px-2" value={selectedField.y} onChange={e => updateField(selectedField.id, { y: Number(e.target.value) })} min={0} max={100} />
                                </FormGroup>
                                <FormGroup label="Width %">
                                    <input type="number" className="form-input text-center px-2" value={selectedField.width} onChange={e => updateField(selectedField.id, { width: Number(e.target.value) })} min={5} max={100} />
                                </FormGroup>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-auto pt-4 sticky bottom-4 z-10">
                    <Button onClick={save} loading={pending} disabled={!eventId || !templateName.trim()} className="w-full h-12 text-[0.9375rem] font-semibold shadow-[0_8px_16px_rgba(0,201,255,0.2)]">
                        {template ? 'Update Template' : 'Create Template'}
                    </Button>
                </div>
            </div>

            {/* Right panel — A4 landscape canvas */}
            <div className="flex flex-col gap-4 w-full overflow-hidden">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }} />
                        Live Preview (A4 Landscape)
                    </div>
                    {bgUrl && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            Drag elements to reposition
                        </div>
                    )}
                </div>

                <div
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="w-full max-w-[900px] relative overflow-hidden transition-all duration-300 rounded-md"
                    style={{
                        aspectRatio: '297 / 210',
                        backgroundColor: 'var(--bg-void)',
                        backgroundImage: bgUrl ? `url(${bgUrl})` : 'linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                        backgroundSize: bgUrl ? 'cover' : '20px 20px',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        border: selectedFieldId ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.08)',
                        cursor: dragging ? 'grabbing' : 'default',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02), inset 0 0 0 1px rgba(255,255,255,0.05)',
                    }}
                >
                    {!bgUrl && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                            <ImageIcon size={48} style={{ opacity: 0.2 }} />
                            <p style={{ fontSize: '1rem', fontWeight: 500 }}>Upload a background image to start designing</p>
                            <p style={{ fontSize: '0.8125rem', maxWidth: 300, textAlign: 'center', opacity: 0.7 }}>We recommend a 297mm × 210mm (A4 Landscape) image for optimal results.</p>
                        </div>
                    )}

                    {fields.map(f => {
                        const isSelected = selectedFieldId === f.id
                        return (
                            <div
                                key={f.id}
                                onMouseDown={(e) => handleMouseDown(f.id, e)}
                                onClick={() => setSelectedFieldId(f.id)}
                                style={{
                                    position: 'absolute',
                                    left: `${f.x - f.width / 2}%`,
                                    top: `${f.y}%`,
                                    width: `${f.width}%`,
                                    transform: 'translateY(-50%)',
                                    fontSize: f.fontSize * 0.6,
                                    fontFamily: f.fontFamily,
                                    fontWeight: f.bold ? 700 : 400,
                                    fontStyle: f.italic ? 'italic' : 'normal',
                                    color: f.color,
                                    textAlign: f.align,
                                    cursor: dragging === f.id ? 'grabbing' : 'grab',
                                    padding: '8px',
                                    border: isSelected ? '2px solid var(--accent)' : '1px dashed transparent',
                                    background: isSelected ? 'rgba(0, 201, 255, 0.08)' : 'transparent',
                                    backdropFilter: isSelected ? 'blur(2px)' : 'none',
                                    borderRadius: 'var(--r-sm)',
                                    userSelect: 'none',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    transition: isSelected ? 'none' : 'border-color 0.2s ease, background-color 0.2s ease',
                                    boxShadow: isSelected ? '0 0 15px rgba(0, 201, 255, 0.3)' : 'none',
                                    zIndex: isSelected ? 10 : 1,
                                }}
                                onMouseEnter={e => {
                                    if (!isSelected && dragging !== f.id) {
                                        e.currentTarget.style.border = '1px dashed rgba(255,255,255,0.3)'
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSelected && dragging !== f.id) {
                                        e.currentTarget.style.border = '1px dashed transparent'
                                        e.currentTarget.style.background = 'transparent'
                                    }
                                }}
                            >
                                {/* Drag Indicator Context */}
                                {isSelected && (
                                    <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', background: 'var(--accent)', color: 'var(--bg-void)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.2)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                                        {getFieldLabel(f)}
                                    </div>
                                )}

                                {/* Resize dots (visual only) */}
                                {isSelected && (
                                    <>
                                        <div style={{ position: 'absolute', top: -3, left: -3, width: 6, height: 6, background: '#fff', border: '1px solid var(--accent)', borderRadius: '50%' }} />
                                        <div style={{ position: 'absolute', top: -3, right: -3, width: 6, height: 6, background: '#fff', border: '1px solid var(--accent)', borderRadius: '50%' }} />
                                        <div style={{ position: 'absolute', bottom: -3, left: -3, width: 6, height: 6, background: '#fff', border: '1px solid var(--accent)', borderRadius: '50%' }} />
                                        <div style={{ position: 'absolute', bottom: -3, right: -3, width: 6, height: 6, background: '#fff', border: '1px solid var(--accent)', borderRadius: '50%' }} />
                                    </>
                                )}

                                {getFieldLabel(f)}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
