'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'
import { createTemplateAction, updateTemplateAction } from '@/lib/actions/certificateActions'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Move, GripVertical } from 'lucide-react'
import type { TemplateField, TemplateLayout, CertificateTemplate, Event, EventCategory } from '@/lib/types/db'

const DEFAULT_TEMPLATE_FIELDS: TemplateField[] = [
    { id: 'default-1', field_type: 'student_name', x: 50, y: 35, width: 60, fontSize: 32, fontFamily: 'Space Grotesk', color: '#FFFFFF', bold: true, italic: false, align: 'center' },
    { id: 'default-2', field_type: 'event_name', x: 50, y: 50, width: 70, fontSize: 18, fontFamily: 'Space Grotesk', color: '#A0AECB', bold: false, italic: false, align: 'center' },
    { id: 'default-3', field_type: 'category_name', x: 50, y: 57, width: 50, fontSize: 16, fontFamily: 'Space Grotesk', color: '#00C9FF', bold: false, italic: false, align: 'center' },
    { id: 'default-4', field_type: 'position', x: 50, y: 63, width: 50, fontSize: 16, fontFamily: 'Space Grotesk', color: '#F5A623', bold: true, italic: false, align: 'center' },
    { id: 'default-5', field_type: 'date', x: 50, y: 72, width: 40, fontSize: 14, fontFamily: 'Space Grotesk', color: '#5B6B8A', bold: false, italic: false, align: 'center' },
    { id: 'default-6', field_type: 'certificate_type', x: 85, y: 85, width: 20, fontSize: 12, fontFamily: 'Space Grotesk', color: '#5B6B8A', bold: false, italic: false, align: 'right' },
]

function initFields(hasCategories: boolean): TemplateField[] {
    return DEFAULT_TEMPLATE_FIELDS.filter(f =>
        f.field_type !== 'category_name' || hasCategories
    )
}

const FIELD_TYPES = [
    { value: 'student_name', label: 'Student Name' },
    { value: 'event_name', label: 'Event Name' },
    { value: 'category_name', label: 'Category Name' },
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
    const canvasRef = useRef<HTMLDivElement>(null)

    const [eventId, setEventId] = useState(template?.event_id ?? '')
    const [categoryId, setCategoryId] = useState(template?.category_id ?? '')
    const [templateName, setTemplateName] = useState(template?.template_name ?? '')
    const [certType, setCertType] = useState<'participation' | 'winner'>(template?.certificate_type ?? 'participation')
    const [bgUrl, setBgUrl] = useState(template?.background_image_url ?? '')

    const selectedEvent = events.find(e => e.id === eventId)
    const hasCategories = (selectedEvent?.categories?.length ?? 0) > 0

    const [fields, setFields] = useState<TemplateField[]>(
        template?.layout_json?.fields ?? initFields(hasCategories)
    )
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
    const [dragging, setDragging] = useState<string | null>(null)

    const selectedField = fields.find(f => f.id === selectedFieldId) ?? null

    const availableFieldTypes = FIELD_TYPES.filter(ft =>
        ft.value !== 'category_name' || hasCategories
    )

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

    function save() {
        if (!eventId || !templateName.trim()) return
        const layout: TemplateLayout = { fields }

        startTransition(async () => {
            if (template) {
                await updateTemplateAction(template.id, { template_name: templateName, layout_json: layout, background_image_url: bgUrl || undefined })
            } else {
                const result = await createTemplateAction({
                    event_id: eventId,
                    category_id: categoryId || undefined,
                    template_name: templateName.trim(),
                    certificate_type: certType,
                    layout_json: layout,
                    background_image_url: bgUrl || undefined,
                })
                if (result.success && result.template_id) {
                    router.push(`${basePath}/${result.template_id}`)
                }
            }
        })
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, minHeight: 500 }}>
            {/* Left panel — toolbar and field properties */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '80vh', overflowY: 'auto' }}>
                {/* Meta fields */}
                <div className="glass" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <FormGroup label="Template Name" required>
                        <input className="form-input" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Participation Certificate" />
                    </FormGroup>
                    <FormGroup label="Event" required>
                        <select className="form-select" value={eventId} onChange={e => { setEventId(e.target.value); setCategoryId('') }} disabled={!!template}>
                            <option value="">Select event…</option>
                            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                        </select>
                    </FormGroup>
                    {hasCategories && (
                        <FormGroup label="Category">
                            <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={!!template}>
                                <option value="">Whole Event</option>
                                {selectedEvent!.categories!.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                            </select>
                        </FormGroup>
                    )}
                    <FormGroup label="Certificate Type">
                        <select className="form-select" value={certType} onChange={e => setCertType(e.target.value as 'participation' | 'winner')} disabled={!!template}>
                            <option value="participation">Participation</option>
                            <option value="winner">Winner</option>
                        </select>
                    </FormGroup>
                    <FormGroup label="Background Image URL">
                        <input className="form-input" value={bgUrl} onChange={e => setBgUrl(e.target.value)} placeholder="https://…" />
                    </FormGroup>
                </div>

                {/* Add field buttons */}
                <div className="glass" style={{ padding: 16 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)', marginBottom: 10 }}>
                        Add Field
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {availableFieldTypes.map(ft => (
                            <Button key={ft.value} size="sm" variant="ghost" onClick={() => addField(ft.value)}>
                                <Plus size={12} /> {ft.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Selected field properties */}
                {selectedField && (
                    <div className="glass" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-tertiary)' }}>
                                Field Properties
                            </span>
                            <button onClick={() => removeField(selectedField.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {selectedField.field_type === 'custom' && (
                            <FormGroup label="Text">
                                <input className="form-input" value={selectedField.customText ?? ''} onChange={e => updateField(selectedField.id, { customText: e.target.value })} />
                            </FormGroup>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <FormGroup label="Font Size">
                                <input type="number" className="form-input" value={selectedField.fontSize} onChange={e => updateField(selectedField.id, { fontSize: Number(e.target.value) })} min={8} max={72} />
                            </FormGroup>
                            <FormGroup label="Color">
                                <input type="color" value={selectedField.color} onChange={e => updateField(selectedField.id, { color: e.target.value })} style={{ width: '100%', height: 40, border: 'none', cursor: 'pointer' }} />
                            </FormGroup>
                        </div>

                        <FormGroup label="Align">
                            <select className="form-select" value={selectedField.align} onChange={e => updateField(selectedField.id, { align: e.target.value as 'left' | 'center' | 'right' })}>
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                            </select>
                        </FormGroup>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={selectedField.bold} onChange={e => updateField(selectedField.id, { bold: e.target.checked })} style={{ accentColor: 'var(--accent)' }} />
                                Bold
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', cursor: 'pointer' }}>
                                <input type="checkbox" checked={selectedField.italic} onChange={e => updateField(selectedField.id, { italic: e.target.checked })} style={{ accentColor: 'var(--accent)' }} />
                                Italic
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                            <FormGroup label="X %">
                                <input type="number" className="form-input" value={selectedField.x} onChange={e => updateField(selectedField.id, { x: Number(e.target.value) })} min={0} max={100} />
                            </FormGroup>
                            <FormGroup label="Y %">
                                <input type="number" className="form-input" value={selectedField.y} onChange={e => updateField(selectedField.id, { y: Number(e.target.value) })} min={0} max={100} />
                            </FormGroup>
                            <FormGroup label="Width %">
                                <input type="number" className="form-input" value={selectedField.width} onChange={e => updateField(selectedField.id, { width: Number(e.target.value) })} min={5} max={100} />
                            </FormGroup>
                        </div>
                    </div>
                )}

                <Button onClick={save} loading={pending} disabled={!eventId || !templateName.trim()}>
                    {template ? 'Update Template' : 'Create Template'}
                </Button>
            </div>

            {/* Right panel — A4 landscape canvas */}
            <div
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    aspectRatio: '297 / 210',
                    width: '100%',
                    maxWidth: 800,
                    background: bgUrl ? `url(${bgUrl}) center/cover no-repeat` : 'var(--bg-void)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--r-lg)',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: dragging ? 'grabbing' : 'default',
                }}
            >
                {fields.map(f => (
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
                            cursor: 'grab',
                            padding: '2px 4px',
                            border: selectedFieldId === f.id ? '1px dashed var(--accent)' : '1px dashed transparent',
                            borderRadius: 2,
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {getFieldLabel(f)}
                    </div>
                ))}
            </div>
        </div>
    )
}
