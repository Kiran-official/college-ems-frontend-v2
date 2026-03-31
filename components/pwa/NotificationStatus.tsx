'use client'

import { useEffect, useState, useTransition } from 'react'
import { Bell, CheckCircle2, AlertCircle, RefreshCw, Send, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { sendTestNotification } from '@/lib/actions/notifications'

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

export function NotificationStatus() {
    const [isPending, startTransition] = useTransition()
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [subscribing, setSubscribing] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setPermission('unsupported')
            return
        }

        setPermission(Notification.permission)
        checkSubscription()
    }, [])

    async function checkSubscription() {
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            setIsSubscribed(!!subscription)
        } catch (error) {
            console.error('Error checking subscription:', error)
        }
    }

    async function handleSubscribe() {
        setSubscribing(true)
        setStatus(null)
        try {
            const result = await Notification.requestPermission()
            setPermission(result)
            
            if (result === 'granted') {
                const registration = await navigator.serviceWorker.ready
                
                const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
                if (!vapidKey) throw new Error('VAPID public key not found')

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey)
                })

                const response = await fetch('/api/push/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subscription)
                })

                if (!response.ok) throw new Error('Failed to save subscription on server')

                setIsSubscribed(true)
                setStatus({ type: 'success', message: 'Successfully subscribed to push notifications!' })
            } else if (result === 'denied') {
                setStatus({ type: 'error', message: 'Notification permission was denied. Please enable it in your browser settings.' })
            }
        } catch (error: any) {
            console.error('Subscription error:', error)
            setStatus({ type: 'error', message: error.message || 'Failed to subscribe' })
        } finally {
            setSubscribing(false)
        }
    }

    async function handleSendTest() {
        setStatus(null)
        startTransition(async () => {
            const result = await sendTestNotification()
            if (result.success) {
                setStatus({ type: 'success', message: 'Test notification sent! You should receive it shortly.' })
            } else {
                setStatus({ type: 'error', message: result.error || 'Failed to send test notification' })
            }
        })
    }

    if (permission === 'unsupported') {
        return (
            <div className="flex items-center gap-3 text-red-400 p-4 rounded-xl bg-red-400/5 border border-red-400/10">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">Push notifications are not supported in this browser.</span>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            permission === 'granted' && isSubscribed ? 'bg-emerald-400/10 text-emerald-400' : 
                            permission === 'denied' ? 'bg-red-400/10 text-red-400' : 'bg-orange-400/10 text-orange-400'
                        }`}>
                            {permission === 'granted' && isSubscribed ? <CheckCircle2 size={20} /> : 
                             permission === 'denied' ? <ShieldOff size={20} /> : <Bell size={20} />}
                        </div>
                        <div>
                            <div className="text-sm font-semibold">
                                {permission === 'granted' && isSubscribed ? 'Notifications Enabled' : 
                                 permission === 'denied' ? 'Notifications Blocked' : 'Notifications Not Set'}
                            </div>
                            <div className="text-xs text-secondary mt-0.5">
                                {permission === 'granted' && isSubscribed ? 'You will receive alerts about events' : 
                                 permission === 'denied' ? 'Please unblock in browser settings to receive alerts' : 
                                 'Stay updated with event and result alerts'}
                            </div>
                        </div>
                    </div>
                </div>

                {status && (
                    <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                        status.type === 'success' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' : 
                        'bg-red-400/10 text-red-400 border border-red-400/20'
                    }`}>
                        {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {status.message}
                    </div>
                )}

                <div className="flex flex-wrap gap-3 mt-1">
                    {(permission !== 'granted' || !isSubscribed) && (
                        <Button 
                            size="sm" 
                            onClick={handleSubscribe} 
                            loading={subscribing}
                            className="bg-accent hover:bg-accent-hover text-white flex items-center gap-2"
                        >
                            <RefreshCw size={14} className={subscribing ? 'animate-spin' : ''} />
                            {permission === 'denied' ? 'Try Again' : 'Enable Notifications'}
                        </Button>
                    )}
                    
                    {permission === 'granted' && isSubscribed && (
                        <>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={handleSendTest} 
                                loading={isPending}
                                className="flex items-center gap-2"
                            >
                                <Send size={14} />
                                Send Test Notification
                            </Button>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={handleSubscribe} 
                                loading={subscribing}
                                className="text-secondary hover:text-primary flex items-center gap-2"
                            >
                                <RefreshCw size={14} className={subscribing ? 'animate-spin' : ''} />
                                Refresh Subscription
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
