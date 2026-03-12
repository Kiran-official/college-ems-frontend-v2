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
            if (Notification.permission === 'default' && !localStorage.getItem('push_prompt_dismissed')) {
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
        localStorage.setItem('push_prompt_dismissed', 'true')
    }

    if (!showPrompt) return null

    return (
        <div className="fixed top-6 right-6 z-[100] w-80 max-w-[calc(100vw-3rem)]">
            <div className="bg-card border-border border shadow-lg rounded-xl p-4 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-300 relative">
                <button 
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 hover:bg-muted rounded-md transition-colors"
                >
                    <X size={14} className="text-muted-foreground" />
                </button>
                
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bell className="w-5 h-5 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-heading font-semibold text-sm text-foreground mb-1">Enable Notifications</h3>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        Get instantly notified when new events are open for registration.
                    </p>
                    <button 
                        onClick={handleSubscribe}
                        disabled={subscribing}
                        className="w-full px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {subscribing ? 'Enabling...' : 'Enable Now'}
                    </button>
                </div>
            </div>
        </div>
    )
}
