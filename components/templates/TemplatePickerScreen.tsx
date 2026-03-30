'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, LayoutTemplate, Globe, Star, FileText } from 'lucide-react'
import { cloneTemplateAction } from '@/lib/actions/certificateActions'
import { FormGroup } from '@/components/forms/FormGroup'
import type { CertificateTemplate, Event } from '@/lib/types/db'

interface TemplatePickerScreenProps {
    events: Event[]
    globalTemplates: CertificateTemplate[]
    basePath: string // '/admin/templates' or '/teacher/templates'
}

export function TemplatePickerScreen({ events, globalTemplates, basePath }: TemplatePickerScreenProps) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [selectedEventId, setSelectedEventId] = useState('')
    const [cloneError, setCloneError] = useState('')

    function handleStartScratch() {
        if (selectedEventId) {
            router.push(`${basePath}/create?eventId=${selectedEventId}&mode=scratch`)
        } else {
            router.push(`${basePath}/create?mode=scratch`)
        }
    }

    function handleCloneGlobal(templateId: string) {
        if (!selectedEventId) {
            setCloneError('Please select an event first')
            return
        }
        setCloneError('')
        startTransition(async () => {
            const result = await cloneTemplateAction(templateId, selectedEventId)
            if (result.success && result.template_id) {
                router.push(`${basePath}/${result.template_id}`)
            } else {
                setCloneError(result.error || 'Failed to clone template')
            }
        })
    }

    return (
        <div className="tp-screen">
            <div className="tp-header">
                <h2>Choose how to start</h2>
                <p>Build a certificate from scratch or use a pre-designed global template</p>
            </div>

            {/* Event selector */}
            <div style={{ maxWidth: 400, margin: '0 auto 32px' }}>
                <FormGroup label="Select Event (required for cloning)">
                    <select
                        value={selectedEventId}
                        onChange={e => { setSelectedEventId(e.target.value); setCloneError('') }}
                        className="form-input"
                    >
                        <option value="">Select Event...</option>
                        {events.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                    </select>
                </FormGroup>
                {cloneError && (
                    <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: 8, fontWeight: 600 }}>{cloneError}</p>
                )}
            </div>

            {/* Cards grid */}
            <div className="tp-grid">
                {/* Start from scratch */}
                <button onClick={handleStartScratch} className="tp-card tp-card--scratch" disabled={pending}>
                    <div className="tp-card__icon">
                        <Plus size={24} />
                    </div>
                    <div className="tp-card__name">Start from Scratch</div>
                    <div className="tp-card__meta">Create a blank certificate template</div>
                </button>

                {/* Global templates */}
                {globalTemplates.map(t => (
                    <button
                        key={t.id}
                        onClick={() => handleCloneGlobal(t.id)}
                        className="tp-card"
                        disabled={pending}
                    >
                        <div className="tp-card__thumb">
                            {t.background_image_url ? (
                                <img src={t.background_image_url} alt={t.template_name} />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                                    <LayoutTemplate size={32} />
                                </div>
                            )}
                        </div>
                        <div className="tp-card__name">{t.template_name}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span className="template-global-badge">
                                <Globe size={10} /> Global
                            </span>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.5px',
                                background: t.certificate_type === 'winner' ? 'rgba(245,166,35,0.1)' : 'rgba(0,201,255,0.1)',
                                color: t.certificate_type === 'winner' ? '#F5A623' : '#00C9FF',
                                border: `1px solid ${t.certificate_type === 'winner' ? 'rgba(245,166,35,0.2)' : 'rgba(0,201,255,0.2)'}`,
                            }}>
                                {t.certificate_type === 'winner' ? <Star size={10} /> : <FileText size={10} />}
                                {t.certificate_type}
                            </span>
                        </div>
                    </button>
                ))}

                {globalTemplates.length === 0 && (
                    <div className="tp-card" style={{ cursor: 'default', opacity: 0.5 }}>
                        <div className="tp-card__icon" style={{ opacity: 0.4 }}>
                            <Globe size={24} />
                        </div>
                        <div className="tp-card__name" style={{ opacity: 0.6 }}>No global templates yet</div>
                        <div className="tp-card__meta">Global templates will appear here once created</div>
                    </div>
                )}
            </div>
        </div>
    )
}
