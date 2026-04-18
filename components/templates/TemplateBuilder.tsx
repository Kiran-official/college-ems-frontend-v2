'use client'

import { useState, useRef, useCallback, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'
import { createTemplateAction, updateTemplateAction, deleteTemplateAction, uploadTemplateBackgroundAction } from '@/lib/actions/certificateActions'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Plus, Trash2, Upload, AlignLeft, AlignCenter, AlignRight,
    Type, Bold, Italic, LayoutTemplate, Image as ImageIcon,
    ChevronLeft, X, Copy, Check, Save, Settings,
    ZoomIn, ZoomOut, Maximize,
    Sun, Moon, MoreVertical, MoveVertical, Space, Minus
} from 'lucide-react'
import type { TemplateField, TemplateLayout, CertificateTemplate, Event } from '@/lib/types/db'

// ─── Constants ──────────────────────────────────────────────────
const DEFAULT_TEMPLATE_FIELDS: TemplateField[] = [
    { id: 'default-1', field_type: 'student_name', x: 50, y: 30, width: 60, fontSize: 32, fontFamily: 'Helvetica', color: '#000000', bold: true, italic: false, align: 'center' },
    { id: 'default-2', field_type: 'event_name', x: 50, y: 42, width: 70, fontSize: 32, fontFamily: 'Helvetica', color: '#000000', bold: true, italic: false, align: 'center' },
    { id: 'default-4', field_type: 'position', x: 50, y: 54, width: 50, fontSize: 32, fontFamily: 'Helvetica', color: '#000000', bold: true, italic: false, align: 'center' },
    { id: 'default-5', field_type: 'date', x: 50, y: 66, width: 40, fontSize: 32, fontFamily: 'Helvetica', color: '#000000', bold: true, italic: false, align: 'center' },
    { id: 'default-6', field_type: 'certificate_type', x: 50, y: 78, width: 30, fontSize: 32, fontFamily: 'Helvetica', color: '#000000', bold: true, italic: false, align: 'center' },
]

const FIELD_TYPES = [
    { value: 'student_name', label: 'Student Name', placeholder: '{{student_name}}', mock: 'John Doe' },
    { value: 'event_name', label: 'Event Name', placeholder: '{{event_name}}', mock: 'Annual Sports Meet 2024' },
    { value: 'position', label: 'Position / Award', placeholder: '{{position}}', mock: 'First Place' },
    { value: 'date', label: 'Date', placeholder: '{{date}}', mock: 'March 31, 2026' },
    { value: 'certificate_type', label: 'Type', placeholder: '{{certificate_type}}', mock: 'Participation Certificate' },
    { value: 'custom', label: 'Custom Text', placeholder: 'Custom Text', mock: 'Custom Text' },
]

// ─── Types ──────────────────────────────────────────────────────
interface TemplateBuilderProps {
    events: Event[]
    template?: CertificateTemplate
    basePath: string
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null

// ─── Component ──────────────────────────────────────────────────
export function TemplateBuilder({ events, template, basePath }: TemplateBuilderProps) {
    const [isBarExpanded, setIsBarExpanded] = useState(true);
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [uploading, setUploading] = useState(false)
    const canvasRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const searchParams = useSearchParams()
    const queryEventId = searchParams.get('eventId')
    const queryType = searchParams.get('type') as 'participation' | 'winner' | null

    // ─── State ────────────────────────────────────────────────
    const [eventId, setEventId] = useState(template?.event_id ?? queryEventId ?? '')
    const [templateName, setTemplateName] = useState(template?.template_name ?? '')
    const [certType, setCertType] = useState<'participation' | 'winner'>(
        template?.certificate_type ?? queryType ?? 'participation'
    )
    const [bgUrl, setBgUrl] = useState(template?.background_image_url ?? '')
    const selectedEvent = events.find(e => e.id === eventId)

    const [fields, setFields] = useState<TemplateField[]>(
        template?.layout_json?.fields ?? [...DEFAULT_TEMPLATE_FIELDS]
    )
    const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set())
    const [draggingFields, setDraggingFields] = useState<boolean>(false)
    const [resizing, setResizing] = useState<{ fieldId: string; handle: ResizeHandle; startX: number; startWidth: number } | null>(null)
    const [viewMode, setViewMode] = useState<'design' | 'preview'>('design')
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [activeTool, setActiveTool] = useState<string | null>(null)
    const [zoom, setZoom] = useState(100)
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)

    const initialPinchDistRef = useRef<number | null>(null)
    const initialZoomRef = useRef<number>(100)

    const dragStartRef = useRef<{ clientX: number; clientY: number } | null>(null)
    const dragSnapshotRef = useRef<{ id: string; x: number; y: number }[]>([])
    const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null)

    const selectedFields = fields.filter(f => selectedFieldIds.has(f.id))
    const primarySelectedField = selectedFields[0] ?? null

    // ─── Auto-zoom on resize ──────────────────────────────────
    useEffect(() => {
        function handleResize() {
            if (window.innerWidth < 1024) {
                // Auto-scale to fit precisely within mobile viewport width
                // 900 is base canvas width. 32px accounts for side padding wrapper.
                setZoom(Math.max(20, Math.floor(((window.innerWidth - 32) / 900) * 100)))
            } else {
                setZoom(100)
            }
        }
        handleResize() // Initially
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // ─── Toast auto-dismiss ───────────────────────────────────
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 4000)
        return () => clearTimeout(t)
    }, [toast])

    // ─── Keyboard shortcuts ───────────────────────────────────
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (isSettingsOpen) return
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFieldIds.size > 0) {
                e.preventDefault()
                removeFields(Array.from(selectedFieldIds))
            }
            if (e.key === 'Escape') {
                setSelectedFieldIds(new Set())
                setActiveTool(null)
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedFieldIds.size > 0) {
                e.preventDefault()
                duplicateFields(Array.from(selectedFieldIds))
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [selectedFieldIds, isSettingsOpen, fields])

    // ─── Field operations ─────────────────────────────────────
    function addField(fieldType: string) {
        const newField: TemplateField = {
            id: `field_${Date.now()}`,
            field_type: fieldType,
            x: 50, y: 50, width: 40,
            fontSize: 16, fontFamily: 'Helvetica',
            color: '#000000', bold: false, italic: false,
            align: 'center',
            ...(fieldType === 'custom' ? { customText: 'Custom Text' } : {}),
        }
        setFields(prev => [...prev, newField])
        setSelectedFieldIds(new Set([newField.id]))
    }

    function updateFields(ids: string[], updates: Partial<TemplateField>) {
        setFields(prev => prev.map(f => ids.includes(f.id) ? { ...f, ...updates } : f))
    }

    function removeFields(ids: string[]) {
        setFields(prev => prev.filter(f => !ids.includes(f.id)))
        setSelectedFieldIds(prev => {
            const next = new Set(prev)
            ids.forEach(id => next.delete(id))
            return next
        })
    }

    function duplicateFields(ids: string[]) {
        const toCopy = fields.filter(f => ids.includes(f.id))
        const newFields = toCopy.map((field, i) => ({
            ...field,
            id: `field_${Date.now()}_${i}`,
            x: Math.min(95, field.x + 3),
            y: Math.min(95, field.y + 3)
        }))
        setFields(prev => [...prev, ...newFields])
        setSelectedFieldIds(new Set([...Array.from(selectedFieldIds), ...newFields.map(f => f.id)]))
    }

    // ─── Drag handling (mouse) ────────────────────────────────
    const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
        if (!canvasRef.current) return { x: 0, y: 0 }
        const rect = canvasRef.current.getBoundingClientRect()
        const x = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100))
        const y = Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100))
        return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
    }, [])

    const handleFieldPointerDown = useCallback((fieldId: string, e: React.MouseEvent | React.TouchEvent) => {
        if (viewMode !== 'design') return
        e.stopPropagation()
        const isMulti = e.shiftKey || e.metaKey || e.ctrlKey // e might not have these for touch, but we check if present

        let nextSelected = new Set(selectedFieldIds)
        if (isMulti) {
            if (nextSelected.has(fieldId)) nextSelected.delete(fieldId)
            else nextSelected.add(fieldId)
            setSelectedFieldIds(nextSelected)
        } else {
            if (!nextSelected.has(fieldId)) {
                nextSelected = new Set([fieldId])
                setSelectedFieldIds(nextSelected)
            }
        }

        // Init dragging
        setDraggingFields(true)
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
        dragStartRef.current = { clientX, clientY }
        dragSnapshotRef.current = fields.filter(f => nextSelected.has(f.id)).map(f => ({ id: f.id, x: f.x, y: f.y }))
    }, [viewMode, selectedFieldIds, fields])

    const handlePointerMove = useCallback((clientX: number, clientY: number) => {
        if (resizing && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect()
            const deltaXPct = ((clientX - resizing.startX) / rect.width) * 100
            let newWidth = resizing.startWidth
            if (resizing.handle === 'e' || resizing.handle === 'ne' || resizing.handle === 'se') {
                newWidth = resizing.startWidth + deltaXPct * 2
            } else if (resizing.handle === 'w' || resizing.handle === 'nw' || resizing.handle === 'sw') {
                newWidth = resizing.startWidth - deltaXPct * 2
            }
            newWidth = Math.max(10, Math.min(100, Math.round(newWidth)))
            updateFields([resizing.fieldId], { width: newWidth })
            return
        }
        
        if (draggingFields && canvasRef.current && dragStartRef.current) {
            const rect = canvasRef.current.getBoundingClientRect()
            const deltaX = ((clientX - dragStartRef.current.clientX) / rect.width) * 100
            const deltaY = ((clientY - dragStartRef.current.clientY) / rect.height) * 100

            setFields(prev => prev.map(f => {
                const snapshot = dragSnapshotRef.current.find(s => s.id === f.id)
                if (snapshot) {
                    return { 
                        ...f, 
                        x: Math.max(2, Math.min(98, Math.round((snapshot.x + deltaX) * 10) / 10)),
                        y: Math.max(2, Math.min(98, Math.round((snapshot.y + deltaY) * 10) / 10))
                    }
                }
                return f
            }))
            return
        }

        if (marquee && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect()
            const currX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
            const currY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
            setMarquee(prev => prev ? { ...prev, currentX: currX, currentY: currY } : null)
            
            // Auto-select objects in marquee
            const minX = Math.min(marquee.startX, currX)
            const maxX = Math.max(marquee.startX, currX)
            const minY = Math.min(marquee.startY, currY)
            const maxY = Math.max(marquee.startY, currY)

            const newlySelected = new Set<string>()
            fields.forEach(f => {
                const fMinX = f.x - f.width / 2
                const fMaxX = f.x + f.width / 2
                const fMinY = f.y - Math.max(2, (f.fontSize / rect.height) * 100) // approx
                const fMaxY = f.y + Math.max(2, (f.fontSize / rect.height) * 100)
                
                // Intersection logic
                if (fMinX < maxX && fMaxX > minX && fMinY < maxY && fMaxY > minY) {
                    newlySelected.add(f.id)
                }
            })
            setSelectedFieldIds(newlySelected)
        }
    }, [resizing, draggingFields, marquee, fields])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        handlePointerMove(e.clientX, e.clientY)
    }, [handlePointerMove])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
            e.preventDefault()
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const distance = Math.hypot(dx, dy)
            const scale = distance / initialPinchDistRef.current
            const newZoom = Math.min(200, Math.max(20, initialZoomRef.current * scale))
            setZoom(Math.round(newZoom))
            return
        }
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
    }, [handlePointerMove])

    const handlePointerUp = useCallback(() => {
        setDraggingFields(false)
        setResizing(null)
        setMarquee(null)
        dragStartRef.current = null
        dragSnapshotRef.current = []
        initialPinchDistRef.current = null
    }, [])

    const handleCanvasPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (e.target !== canvasRef.current) return
        
        let clientX = 0, clientY = 0
        if ('touches' in e) {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX
                const dy = e.touches[0].clientY - e.touches[1].clientY
                initialPinchDistRef.current = Math.hypot(dx, dy)
                initialZoomRef.current = zoom
                return
            }
            clientX = e.touches[0].clientX
            clientY = e.touches[0].clientY
        } else {
            clientX = (e as React.MouseEvent).clientX
            clientY = (e as React.MouseEvent).clientY
        }

        // Init marquee selection
        setSelectedFieldIds(new Set())
        const rect = canvasRef.current.getBoundingClientRect()
        const startX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
        const startY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
        setMarquee({ startX, startY, currentX: startX, currentY: startY })
    }, [zoom])

    // ─── Resize handle start ──────────────────────────────────
    const handleResizeStart = useCallback((fieldId: string, handle: ResizeHandle, e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const field = fields.find(f => f.id === fieldId)
        if (!field) return
        
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        setResizing({ fieldId, handle, startX: clientX, startWidth: field.width })
        setSelectedFieldIds(new Set([fieldId]))
    }, [fields])

    // ─── Display value ────────────────────────────────────────
    function getFieldDisplayValue(f: TemplateField) {
        if (f.field_type === 'custom') return f.customText || 'Custom Text'
        const ft = FIELD_TYPES.find(t => t.value === f.field_type)
        if (viewMode === 'preview') {
            if (f.field_type === 'certificate_type') {
                return certType === 'winner' ? 'Winner Certificate' : 'Participation Certificate'
            }
            return ft?.mock ?? f.field_type
        }
        return ft?.placeholder ?? f.field_type
    }

    // ─── File upload ──────────────────────────────────────────
    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            setToast({ message: 'File too large. Max size is 5MB.', type: 'error' })
            return
        }
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const result = await uploadTemplateBackgroundAction(formData)
            if (result.success && result.url) {
                setBgUrl(result.url)
                setToast({ message: 'Background uploaded!', type: 'success' })
            } else {
                setToast({ message: result.error || 'Upload failed', type: 'error' })
            }
        } catch (err: any) {
            setToast({ message: 'Upload failed: ' + (err?.message || 'Unknown error'), type: 'error' })
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // ─── Validation ───────────────────────────────────────────
    function validateTemplate(): { valid: boolean; errors: string[] } {
        const errors: string[] = []
        const fieldTypes = fields.map(f => f.field_type)

        if (!fieldTypes.includes('student_name')) {
            errors.push('{{student_name}} is required')
        }
        if (certType === 'winner' && !fieldTypes.includes('position')) {
            errors.push('Winner certificates require {{position}}')
        }
        if (!eventId) {
            errors.push('Please link an event in Settings')
        }
        if (!templateName.trim()) {
            errors.push('Please set a template name in Settings')
        }
        return { valid: errors.length === 0, errors }
    }

    // ─── Save ─────────────────────────────────────────────────
    function save() {
        const { valid, errors } = validateTemplate()
        if (!valid) {
            setToast({ message: errors.join(' • '), type: 'error' })
            return
        }
        const layout: TemplateLayout = { fields }

        startTransition(async () => {
            if (template) {
                const result = await updateTemplateAction(template.id, {
                    template_name: templateName,
                    layout_json: layout,
                    background_image_url: bgUrl || undefined,
                    certificate_type: certType,
                })
                if (result.success) {
                    setToast({ message: 'Template saved!', type: 'success' })
                    let nextPath = basePath;
                    if (eventId) {
                        nextPath = basePath.replace('/templates', `/events/${eventId}?tab=certificates`);
                    }
                    setTimeout(() => router.push(nextPath), 1000)
                } else {
                    setToast({ message: result.error || 'Failed to save', type: 'error' })
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
                    setToast({ message: result.error || 'Failed to create template', type: 'error' })
                }
            }
        })
    }

    // ─── Zoom helpers ─────────────────────────────────────────
    const zoomIn = () => setZoom(z => Math.min(200, z + 10))
    const zoomOut = () => setZoom(z => Math.max(40, z - 10))
    const zoomFit = () => setZoom(100)

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════
    return (
        <div className="cb-root">
            {/* ─── TOAST ─────────────────────────────────────── */}
            {toast && (
                <div className={`cb-toast ${toast.type === 'error' ? 'cb-toast--error' : 'cb-toast--success'}`}>
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="cb-toast__close">&times;</button>
                </div>
            )}

            {/* ─── TOP NAV ───────────────────────────────────── */}
            <header className="cb-topnav">
                <div className="cb-topnav__left">
                    <button onClick={() => router.push(basePath)} className="cb-topnav__btn" title="Back">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="cb-topnav__sep" />
                    <div className="cb-topnav__title-group">
                        <input
                            value={templateName}
                            onChange={e => setTemplateName(e.target.value)}
                            className="cb-topnav__name-input"
                            placeholder="Untitled Design"
                            title={templateName || 'Untitled Design'}
                        />
                        <span className="cb-topnav__meta">
                            {certType} • {selectedEvent?.title || 'No Event'}
                        </span>
                    </div>
                </div>

                <div className="cb-topnav__right">
                    {/* View mode toggle */}
                    <div className="cb-mode-toggle md-only">
                        <button
                            onClick={() => setViewMode('design')}
                            className={`cb-mode-toggle__btn ${viewMode === 'design' ? 'cb-mode-toggle__btn--active' : ''}`}
                        >Design</button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`cb-mode-toggle__btn ${viewMode === 'preview' ? 'cb-mode-toggle__btn--active' : ''}`}
                        >Preview</button>
                    </div>

                    <div className="cb-topnav__desktop-actions">
                        <button onClick={() => setIsSettingsOpen(true)} className="cb-topnav__btn" title="Settings">
                            <Settings size={20} />
                        </button>
                        <Button onClick={save} loading={pending} className="cb-topnav__save">
                            <Save size={16} />
                            <span className="cb-topnav__save-label">Save</span>
                        </Button>
                    </div>

                    <div className="cb-topnav__mobile-actions">
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="cb-topnav__btn">
                            <MoreVertical size={20} />
                        </button>
                        {isMobileMenuOpen && (
                            <div className="cb-mobile-menu">
                                <button onClick={() => { setViewMode(viewMode === 'design' ? 'preview' : 'design'); setIsMobileMenuOpen(false); }}>
                                    {viewMode === 'design' ? 'Preview Mode' : 'Design Mode'}
                                </button>
                                <button onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}>Settings</button>
                                <button onClick={() => { save(); setIsMobileMenuOpen(false); }}>Save</button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ─── BODY ──────────────────────────────────────── */}
            <div className="cb-body">
                {/* ─── SIDEBAR (desktop) ─────────────────────── */}
                <aside className="cb-sidebar">
                    <button
                        onClick={() => setActiveTool(activeTool === 'elements' ? null : 'elements')}
                        className={`cb-sidebar__btn ${activeTool === 'elements' ? 'cb-sidebar__btn--active' : ''}`}
                    >
                        <LayoutTemplate size={20} />
                        <span>Fields</span>
                    </button>
                    <button
                        onClick={() => setActiveTool(activeTool === 'bg' ? null : 'bg')}
                        className={`cb-sidebar__btn ${activeTool === 'bg' ? 'cb-sidebar__btn--active' : ''}`}
                    >
                        <ImageIcon size={20} />
                        <span>Uploads</span>
                    </button>
                </aside>

                {/* ─── DRAWER ────────────────────────────────── */}
                {activeTool && (
                    <>
                        <div className="cb-drawer-overlay" onClick={() => setActiveTool(null)} />
                        <div className="cb-drawer">
                            <div className="cb-drawer__header">
                                <h3>{activeTool === 'elements' ? 'Placeholders' : 'Background'}</h3>
                                <button onClick={() => setActiveTool(null)} className="cb-drawer__close"><X size={16} /></button>
                            </div>
                            <div className="cb-drawer__body">
                                {activeTool === 'elements' && (
                                    <div className="cb-drawer__grid">
                                        <div className="cb-drawer__section-label">Drag onto canvas</div>
                                        {FIELD_TYPES.map(ft => (
                                            <button
                                                key={ft.value}
                                                onClick={() => {
                                                    addField(ft.value)
                                                    if (window.innerWidth < 1024) setActiveTool(null)
                                                }}
                                                className="cb-field-card"
                                            >
                                                <div className="cb-field-card__add"><Plus size={14} /></div>
                                                <div className="cb-field-card__label">{ft.label}</div>
                                                <div className="cb-field-card__placeholder">{ft.placeholder}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeTool === 'bg' && (
                                    <div className="cb-drawer__uploads">
                                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="cb-hidden" />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="cb-upload-zone"
                                            disabled={uploading}
                                        >
                                            <Upload size={24} />
                                            <span>{uploading ? 'Uploading...' : 'Upload Background'}</span>
                                            <span className="cb-upload-zone__hint">PNG, JPG up to 5MB</span>
                                        </button>
                                        {bgUrl && (
                                            <div className="cb-upload-preview">
                                                <img src={bgUrl} alt="Background" />
                                                <button onClick={() => setBgUrl('')} className="cb-upload-preview__remove">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ─── CANVAS AREA ───────────────────────────── */}
                <main className="cb-canvas-area" onClick={() => setSelectedFieldIds(new Set())}>
                    {/* Zoom controls */}
                    <div className="cb-zoom-controls">
                        <button onClick={zoomOut} className="cb-zoom-btn" title="Zoom Out"><ZoomOut size={16} /></button>
                        <span className="cb-zoom-label">{zoom}%</span>
                        <button onClick={zoomIn} className="cb-zoom-btn" title="Zoom In"><ZoomIn size={16} /></button>
                        <button onClick={zoomFit} className="cb-zoom-btn" title="Fit"><Maximize size={16} /></button>
                    </div>

                    {/* Dot grid */}
                    <div className="cb-dot-grid" />

                    {/* Canvas */}
                    <div
                        ref={canvasRef}
                        className="cb-canvas"
                        style={{
                            transform: `scale(${zoom / 100})`,
                            backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
                            backgroundSize: bgUrl ? 'cover' : undefined,
                            backgroundPosition: 'center',
                        }}
                        onPointerDown={handleCanvasPointerDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handlePointerUp}
                        onMouseLeave={handlePointerUp}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handlePointerUp}
                        onClick={() => setSelectedFieldIds(new Set())}
                    >
                        {marquee && (
                            <div className="cb-marquee-box" style={{
                                "left": `${Math.min(marquee.startX, marquee.currentX)}%`,
                                "top": `${Math.min(marquee.startY, marquee.currentY)}%`,
                                "width": `${Math.abs(marquee.currentX - marquee.startX)}%`,
                                "height": `${Math.abs(marquee.currentY - marquee.startY)}%`,
                            } as React.CSSProperties} />
                        )}
                        {fields.map(f => {
                            const isSelected = selectedFieldIds.has(f.id)
                            return (
                                <div
                                    key={f.id}
                                    className={`cb-element ${isSelected && viewMode === 'design' ? 'cb-element--selected' : ''}`}
                                    style={{
                                        left: `${f.x - f.width / 2}%`,
                                        top: `${f.y}%`,
                                        width: `${f.width}%`,
                                        transform: 'translateY(-50%)',
                                        fontSize: `${f.fontSize * 0.8}px`,
                                        fontWeight: f.bold ? 700 : 400,
                                        fontStyle: f.italic ? 'italic' : 'normal',
                                        color: f.color,
                                        textAlign: f.align,
                                        cursor: viewMode === 'preview' ? 'default' : ((draggingFields && isSelected) ? 'grabbing' : 'grab'),
                                        zIndex: isSelected ? 50 : 10,
                                    }}
                                    onMouseDown={(e) => viewMode === 'design' && handleFieldPointerDown(f.id, e)}
                                    onTouchStart={(e) => viewMode === 'design' && handleFieldPointerDown(f.id, e)}
                                    onClick={(e) => { e.stopPropagation(); if (viewMode === 'design' && !e.shiftKey && !e.metaKey && !e.ctrlKey) setSelectedFieldIds(new Set([f.id])) }}
                                >
                                    {/* Resize handles */}
                                    {isSelected && viewMode === 'design' && (
                                        <>
                                            <div className="cb-handle cb-handle--nw" onMouseDown={e => handleResizeStart(f.id, 'nw', e)} />
                                            <div className="cb-handle cb-handle--ne" onMouseDown={e => handleResizeStart(f.id, 'ne', e)} />
                                            <div className="cb-handle cb-handle--sw" onMouseDown={e => handleResizeStart(f.id, 'sw', e)} />
                                            <div className="cb-handle cb-handle--se" onMouseDown={e => handleResizeStart(f.id, 'se', e)} />
                                            <div className="cb-handle cb-handle--e" onMouseDown={e => handleResizeStart(f.id, 'e', e)} />
                                            <div className="cb-handle cb-handle--w" onMouseDown={e => handleResizeStart(f.id, 'w', e)} />

                                            {/* Floating pill (Desktop only) */}
                                            <div className="cb-pill">
                                                <button onClick={(e) => { e.stopPropagation(); duplicateFields([f.id]) }} className="cb-pill__btn" title="Duplicate">
                                                    <Copy size={16} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); removeFields([f.id]) }} className="cb-pill__btn cb-pill__btn--danger" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                    {getFieldDisplayValue(f)}
                                </div>
                            )
                        })}
                    </div>
                </main>
            </div>

            {primarySelectedField && viewMode === 'design' && (
                <div className={`cb-contextbar ${isBarExpanded ? '' : 'cb-contextbar--collapsed'}`}>
                    {/* Secondary Fixed Mobile Action Bar for Duplicate/Delete */}
                    <div className="cb-mobile-secondary-bar">
                        <button onClick={(e) => { e.stopPropagation(); duplicateFields(Array.from(selectedFieldIds)) }} className="cb-mobile-secondary-btn" title="Duplicate">
                            <Copy size={16} /> <span>Duplicate</span>
                        </button>
                        <div className="cb-mobile-secondary-sep" />
                        <button onClick={(e) => { e.stopPropagation(); removeFields(Array.from(selectedFieldIds)) }} className="cb-mobile-secondary-btn cb-mobile-secondary-btn--danger" title="Delete">
                            <Trash2 size={16} /> <span>Delete</span>
                        </button>
                    </div>

                    {/* Drag handle for mobile */}
                    <div className="cb-drag-handle" onClick={() => setIsBarExpanded(!isBarExpanded)}>
                        <div className="cb-drag-handle__pill" />
                    </div>
                    {/* Custom text input row */}
                    {selectedFieldIds.size === 1 && primarySelectedField.field_type === 'custom' && (
                        <div className="cb-contextbar__custom-row">
                            <input
                                type="text"
                                value={primarySelectedField.customText || ''}
                                onChange={e => updateFields([primarySelectedField.id], { customText: e.target.value })}
                                className="cb-contextbar__text-input"
                                placeholder="Enter custom text..."
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    )}
                    <div className="cb-contextbar__controls">
                        <button onClick={() => setSelectedFieldIds(new Set())} className="cb-contextbar__done" aria-label="Done">
                            <Check size={16} />
                        </button>
                        <div className="cb-contextbar__sep" />
                        {/* Font size */}
                        <div className="cb-contextbar__group cb-contextbar__group--bordered">
                            <button
                                onClick={() => updateFields(Array.from(selectedFieldIds), { fontSize: Math.max(8, primarySelectedField.fontSize - 1) })}
                                className="cb-contextbar__step-btn" title="Decrease Font Size"  
                            ><Minus size={14} /></button>
                            <input
                                type="number" min={8} max={100}
                                value={primarySelectedField.fontSize}
                                onChange={e => updateFields(Array.from(selectedFieldIds), { fontSize: Math.max(8, Math.min(100, Number(e.target.value) || 8)) })}
                                className="cb-contextbar__num-input"
                                onClick={e => e.stopPropagation()}
                            />
                            <button
                                onClick={() => updateFields(Array.from(selectedFieldIds), { fontSize: Math.min(100, primarySelectedField.fontSize + 1) })}
                                className="cb-contextbar__step-btn" title="Increase Font Size"
                            ><Plus size={14} /></button>
                        </div>
                        <div className="cb-contextbar__sep" />
                        {/* Line height */}
                        <div className="cb-contextbar__group cb-contextbar__group--bordered" title="Line Height">
                            <MoveVertical size={16} className="cb-contextbar__icon" />
                            <input
                                type="number" step={0.1} min={0.5} max={3}
                                value={primarySelectedField.lineHeight ?? 1.2}
                                onChange={e => updateFields(Array.from(selectedFieldIds), { lineHeight: Number(e.target.value) })}
                                className="cb-contextbar__num-input"
                            />
                        </div>

                        {/* Letter spacing */}
                        <div className="cb-contextbar__group" title="Letter Spacing">
                            <Space size={16} className="cb-contextbar__icon" />
                            <input
                                type="number" step={0.5} min={-5} max={20}
                                value={primarySelectedField.letterSpacing ?? 0}
                                onChange={e => updateFields(Array.from(selectedFieldIds), { letterSpacing: Number(e.target.value) })}
                                className="cb-contextbar__num-input"
                            />
                        </div>
                        <div className="cb-contextbar__sep" />

                        {/* Typography Grouping (Bold, Italic, Align) */}
                        <div className="cb-contextbar__group cb-contextbar__group--bordered">
                            <button
                                onClick={() => updateFields(Array.from(selectedFieldIds), { bold: !primarySelectedField.bold })}
                                className={`cb-contextbar__toggle ${primarySelectedField.bold ? 'cb-contextbar__toggle--on' : ''}`} aria-label="Bold"
                                title="Bold"
                            ><Bold size={16} /></button>
                            <button
                                onClick={() => updateFields(Array.from(selectedFieldIds), { italic: !primarySelectedField.italic })}
                                className={`cb-contextbar__toggle ${primarySelectedField.italic ? 'cb-contextbar__toggle--on' : ''}`} aria-label="Italic"
                                title="Italic"
                            ><Italic size={16} /></button>

                            <div className="cb-contextbar__align">
                                {(['left', 'center', 'right'] as const).map(a => (
                                    <button
                                        key={a}
                                        onClick={() => updateFields(Array.from(selectedFieldIds), { align: a })}
                                        className={`cb-contextbar__align-btn ${primarySelectedField.align === a ? 'cb-contextbar__align-btn--on' : ''}`} aria-label={`Align ${a}`}
                                        title={`Align ${a}`}
                                    >
                                        {a === 'left' && <AlignLeft size={16} />}
                                        {a === 'center' && <AlignCenter size={16} />}
                                        {a === 'right' && <AlignRight size={16} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="cb-contextbar__sep" />

                        {/* Color */}
                        <div className="cb-contextbar__color-wrap" title="Text Color">
                            <input
                                type="color"
                                value={primarySelectedField.color}
                                onChange={e => updateFields(Array.from(selectedFieldIds), { color: e.target.value })}
                                className="cb-contextbar__color"
                                aria-label="Color"
                            />
                        </div>
                        <div className="cb-contextbar__sep" />
                        {/* Width */}
                        <div className="cb-contextbar__group cb-contextbar__width-group cb-contextbar__group--bordered">
                            <span className="cb-contextbar__label" style={{ fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginRight: '4px' }}>W</span>
                            <button
                                onClick={() => updateFields(Array.from(selectedFieldIds), { width: Math.max(10, primarySelectedField.width - 1) })}
                                className="cb-contextbar__step-btn" title="Decrease Width"
                            ><Minus size={14} /></button>
                            <input
                                type="number" min={10} max={100}
                                value={primarySelectedField.width}
                                onChange={e => updateFields(Array.from(selectedFieldIds), { width: Math.max(10, Math.min(100, Number(e.target.value) || 10)) })}
                                className="cb-contextbar__num-input"
                                onClick={e => e.stopPropagation()}
                            />
                            <button
                                onClick={() => updateFields(Array.from(selectedFieldIds), { width: Math.min(100, primarySelectedField.width + 1) })}
                                className="cb-contextbar__step-btn" title="Increase Width"
                            ><Plus size={14} /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── MOBILE FAB (no field selected) ────────────── */}
            {selectedFields.length === 0 && viewMode === 'design' && (
                <div className="cb-mobile-fab">
                    <button onClick={() => setActiveTool('elements')} className="cb-mobile-fab__btn">
                        <Plus size={18} /> Add
                    </button>
                    <button onClick={() => setActiveTool('bg')} className="cb-mobile-fab__btn">
                        <Upload size={18} /> Bg
                    </button>
                </div>
            )}

            {/* ─── SETTINGS MODAL ────────────────────────────── */}
            {isSettingsOpen && (
                <div className="cb-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
                    <div className="cb-modal" onClick={e => e.stopPropagation()}>
                        <div className="cb-modal__header">
                            <h2><Settings size={20} /> Settings</h2>
                            <button onClick={() => setIsSettingsOpen(false)} className="cb-modal__close"><X size={20} /></button>
                        </div>
                        <div className="cb-modal__body">
                            <FormGroup label="Template Name">
                                <input
                                    value={templateName}
                                    onChange={e => setTemplateName(e.target.value)}
                                    className="cb-modal__input"
                                    placeholder="Template Name"
                                />
                            </FormGroup>
                            <FormGroup label="Link to Event">
                                <select
                                    value={eventId}
                                    onChange={e => setEventId(e.target.value)}
                                    disabled={!!template}
                                    className="cb-modal__input"
                                >
                                    <option value="">Select Event</option>
                                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                                </select>
                            </FormGroup>
                            <FormGroup label="Certificate Type">
                                <div className="cb-modal__type-grid">
                                    {(['participation', 'winner'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setCertType(t)}
                                            className={`cb-modal__type-btn ${certType === t ? 'cb-modal__type-btn--active' : ''}`}
                                        >{t}</button>
                                    ))}
                                </div>
                            </FormGroup>
                            <Button onClick={() => setIsSettingsOpen(false)} className="cb-modal__save-btn">
                                Save Settings
                            </Button>
                            {template && (
                                <button
                                    onClick={() => {
                                        if (!confirm('Are you sure you want to delete this template? This cannot be undone.')) return
                                        startTransition(async () => {
                                            const result = await deleteTemplateAction(template.id)
                                            if (result.success) {
                                                router.push(basePath)
                                            } else {
                                                setToast({ message: result.error || 'Failed to delete', type: 'error' })
                                            }
                                        })
                                    }}
                                    className="cb-modal__delete-btn"
                                    disabled={pending}
                                >
                                    <Trash2 size={14} />
                                    {pending ? 'Deleting...' : 'Delete Template'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
