'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'

// Convert base64 URL safe VAPID key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
    
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export function NotificationPermission() {
    const [showPrompt, setShowPrompt] = useState(false)
    const [subscribing, setSubscribing] = useState(false)

    useEffect(() => {
        // Check if push notifications are supported and not already handled
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

        // Delay prompt slightly to not overwhelm on login
        const timer = setTimeout(() => {
            if (Notification.permission === 'default' && !sessionStorage.getItem('push_prompt_dismissed')) {
                setShowPrompt(true)
            }
        }, 3000)

        return () => clearTimeout(timer)
    }, [])

    async function handleSubscribe() {
        setSubscribing(true)
        try {
            const permission = await Notification.requestPermission()
            
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready
                
                // Get VAPID public key from env
                const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
                if (!vapidKey) throw new Error('VAPID public key not found')

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey)
                })

                // Send subscription to server
                const response = await fetch('/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subscription)
                })

                if (!response.ok) {
                    throw new Error('Failed to save subscription')
                }

                console.log('Push notification subscription successful')
            }
        } catch (error) {
            console.error('Error subscribing to push notifications:', error)
        } finally {
            setSubscribing(false)
            setShowPrompt(false)
        }
    }

    function handleDismiss() {
        setShowPrompt(false)
        sessionStorage.setItem('push_prompt_dismissed', 'true')
    }

    if (!showPrompt) return null

    return (
        <div className="notification-banner">
            <div
                style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--r-lg)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--border-glass)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--accent-dim)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Bell size={18} style={{ color: 'var(--accent)' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        Enable Notifications
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', lineHeight: 1.4, marginTop: 2 }}>
                        Get notified about new events
                    </div>
                </div>

                <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    style={{
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--r-sm)',
                        padding: '6px 14px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        transition: 'opacity 0.15s',
                    }}
                >
                    {subscribing ? 'Enabling...' : 'Enable'}
                </button>

                <button
                    onClick={handleDismiss}
                    aria-label="Dismiss"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: 4,
                        borderRadius: 'var(--r-sm)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.15s',
                    }}
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    )
}
