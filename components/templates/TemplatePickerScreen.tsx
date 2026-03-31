'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, LayoutTemplate, Globe, Star, FileText } from 'lucide-react'
import { cloneTemplateAction } from '@/lib/actions/certificateActions'
import { FormGroup } from '@/components/forms/FormGroup'
import type { CertificateTemplate, Event } from '@/lib/types/db'

interface TemplatePickerScreenProps {
    events: Event[]
    existingTemplates: CertificateTemplate[]
    basePath: string // '/admin/templates' or '/teacher/templates'
    initialEventId?: string
    initialType?: 'participation' | 'winner'
}

export function TemplatePickerScreen({ events, existingTemplates, basePath, initialEventId = '', initialType = 'participation' }: TemplatePickerScreenProps) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [selectedEventId, setSelectedEventId] = useState(initialEventId)
    const [selectedType, setSelectedType] = useState<'participation' | 'winner'>(initialType)
    const [cloneError, setCloneError] = useState('')

    // Filter events to only show those that DON'T have a template of the selected type yet
    const availableEvents = events.filter(ev => {
        const hasExisting = existingTemplates.some(t => t.event_id === ev.id && t.certificate_type === selectedType)
        return !hasExisting
    })

    // If initialEventId is missing a template, it should be in availableEvents. 
    // If it *has* one, we might want to warn or just allow it if it's the current one being edited, 
    // but here we are in the "Create" flow.


    function handleStartScratch() {
        if (selectedEventId) {
            router.push(`${basePath}/create?eventId=${selectedEventId}&type=${selectedType}&mode=scratch`)
        } else {
            router.push(`${basePath}/create?mode=scratch&type=${selectedType}`)
        }
    }

    function handleCloneTemplate(templateId: string) {
        if (!selectedEventId) {
            setCloneError('Please select an event first')
            return
        }
        setCloneError('')
        startTransition(async () => {
            const result = await cloneTemplateAction(templateId, selectedEventId, selectedType)
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
                <p>Build a certificate from scratch or clone an existing template</p>
            </div>

            <div style={{ maxWidth: 500, margin: '0 auto 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* 1. Select Template Type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        1. Select Certificate Type
                    </label>
                    <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 12, padding: 4, border: '1px solid var(--border)' }}>
                        <button
                            onClick={() => { setSelectedType('participation'); setCloneError('') }}
                            style={{
                                flex: 1, padding: '10px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                                background: selectedType === 'participation' ? 'var(--accent)' : 'transparent',
                                color: selectedType === 'participation' ? '#fff' : 'var(--text-secondary)',
                                border: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}
                        >
                            <FileText size={16} /> Participation
                        </button>
                        <button
                            onClick={() => { setSelectedType('winner'); setCloneError('') }}
                            style={{
                                flex: 1, padding: '10px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600,
                                background: selectedType === 'winner' ? 'var(--accent)' : 'transparent',
                                color: selectedType === 'winner' ? '#fff' : 'var(--text-secondary)',
                                border: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}
                        >
                            <Star size={16} /> Winner
                        </button>
                    </div>
                </div>

                {/* 2. Select Event selector */}
                <FormGroup label={`2. Select Event (Missing ${selectedType} template)`}>
                    <select
                        value={selectedEventId}
                        onChange={e => { setSelectedEventId(e.target.value); setCloneError('') }}
                        className="form-input"
                    >
                        <option value="">Select Event...</option>
                        {availableEvents.map(ev => (
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

                {/* Existing templates */}
                {existingTemplates.map(t => (
                    <button
                        key={t.id}
                        onClick={() => handleCloneTemplate(t.id)}
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
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            {t.event?.title && (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                                    border: '1px solid var(--border)'
                                }}>
                                    {t.event.title}
                                </span>
                            )}
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

                {existingTemplates.length === 0 && (
                    <div className="tp-card" style={{ cursor: 'default', opacity: 0.5 }}>
                        <div className="tp-card__icon" style={{ opacity: 0.4 }}>
                            <LayoutTemplate size={24} />
                        </div>
                        <div className="tp-card__name" style={{ opacity: 0.6 }}>No reusable templates yet</div>
                        <div className="tp-card__meta">Templates created for other events will appear here</div>
                    </div>
                )}
            </div>
        </div>
    )
}
