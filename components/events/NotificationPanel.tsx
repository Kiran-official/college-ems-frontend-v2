'use client'

import { useState, useTransition } from 'react'
import { Bell, Send, Clock, AlertCircle, CheckCircle2, Megaphone } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { FormGroup } from '@/components/forms/FormGroup'
import { sendManualEventNotification } from '@/lib/actions/notifications'
import type { Event } from '@/lib/types/db'

interface NotificationPanelProps {
    event: Event
    isFIC?: boolean
    userRole?: 'admin' | 'teacher' | 'student'
}

export function NotificationPanel({ event, isFIC = false, userRole }: NotificationPanelProps) {
    const canManage = userRole === 'admin' || isFIC
    const [isPending, startTransition] = useTransition()
    const [title, setTitle] = useState('')
    const [body, setBody] = useState('')
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [validationErrors, setValidationErrors] = useState<{ title?: string; body?: string }>({})

    function validate() {
        const errors: { title?: string; body?: string } = {}
        if (!title.trim()) errors.title = 'Title is required'
        else if (title.trim().length < 3) errors.title = 'Title must be at least 3 characters'
        
        if (!body.trim()) errors.body = 'Message is required'
        else if (body.trim().length < 5) errors.body = 'Message must be at least 5 characters'

        setValidationErrors(errors)
        return Object.keys(errors).length === 0
    }

    async function handleSend() {
        if (!validate()) return

        setStatus(null)
        startTransition(async () => {
            const result = await sendManualEventNotification(event.id, title, body)
            if (result.success) {
                setStatus({ type: 'success', message: `Notification sent successfully to ${result.recipientCount} active device(s)!` })
                setTitle('')
                setBody('')
            } else {
                setStatus({ type: 'error', message: result.error || 'Failed to send notification' })
            }
        })
    }

    function handleQuickReminder() {
        const dateStr = format(new Date(event.event_date), 'EEEE, MMMM do')
        const timeStr = format(new Date(event.event_date), 'p')
        
        setTitle(`Reminder: ${event.title}`)
        setBody(`Don't forget! ${event.title} is starting on ${dateStr} at ${timeStr}. We look forward to seeing you there!`)
        setValidationErrors({})
        setStatus(null)
    }

    if (!canManage) {
        return (
            <div className="glass" style={{ padding: 24, borderRadius: 'var(--r-xl)', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255, 77, 106, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff4d6a', margin: '0 auto 16px' }}>
                    <AlertCircle size={24} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 8px 0' }}>Access Restricted</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Only the designated Faculty in Charge or Admins can broadcast announcements to participants.
                </p>
            </div>
        )
    }

    return (
        <div className="glass" style={{ padding: 24, borderRadius: 'var(--r-xl)', maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0, 201, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                    <Megaphone size={20} />
                </div>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Event Announcements</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Send push notifications to all registered participants</p>
                </div>
            </div>

            {status && (
                <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: 12, 
                    marginBottom: 24, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12,
                    background: status.type === 'success' ? 'rgba(16, 224, 154, 0.1)' : 'rgba(255, 77, 106, 0.1)',
                    border: `1px solid ${status.type === 'success' ? 'rgba(16, 224, 154, 0.2)' : 'rgba(255, 77, 106, 0.2)'}`,
                    color: status.type === 'success' ? '#10e09a' : '#ff4d6a'
                }}>
                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{status.message}</span>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Auto-tempalte button */}
                <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Clock size={16} color="var(--text-tertiary)" />
                            <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Smart Reminder</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleQuickReminder} disabled={isPending}>
                            Use Template
                        </Button>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: '8px 0 0 0' }}>
                        Autofills date, time, and event name for a quick "starting soon" reminder.
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <FormGroup label="Notification Title" error={validationErrors.title}>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. Venue Change / Event Starting Soon"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={100}
                            disabled={isPending}
                        />
                    </FormGroup>

                    <FormGroup label="Announcement Message" error={validationErrors.body}>
                        <textarea 
                            className="form-input" 
                            placeholder="Type your message here... participants will see this as a push notification."
                            style={{ minHeight: 120, resize: 'vertical' }}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            maxLength={500}
                            disabled={isPending}
                        />
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                            {body.length} / 500 characters
                        </div>
                    </FormGroup>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <Button 
                        onClick={handleSend} 
                        loading={isPending}
                        className="w-full sm:w-auto"
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <Send size={18} />
                        Send to Participants
                    </Button>
                </div>
            </div>

            <div style={{ marginTop: 32, padding: '12px 16px', borderRadius: 8, background: 'rgba(245, 166, 35, 0.05)', border: '1px solid rgba(245, 166, 35, 0.1)', display: 'flex', gap: 12 }}>
                <AlertCircle size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    <strong>Note:</strong> Notifications are sent via Web Push. Only participants who have enabled notifications on their browser/phone for this site will receive the broadcast.
                </p>
            </div>
        </div>
    )
}
