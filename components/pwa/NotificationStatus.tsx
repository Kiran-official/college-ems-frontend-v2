'use client'

import { useEffect, useState, useTransition } from 'react'
import { Bell, CheckCircle2, AlertCircle, RefreshCw, Send, ShieldOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { sendTestNotification, clearUserSubscriptions } from '@/lib/actions/notifications'

// Convert base64 URL safe VAPID key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string) {
    // Strip any potential quotes or whitespace from env loading
    const cleanedKey = base64String.replace(/['"]/g, '').trim();
    const padding = '='.repeat((4 - cleanedKey.length % 4) % 4)
    const base64 = (cleanedKey + padding).replace(/\-/g, '+').replace(/_/g, '/')
    
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

// Helper to wait for a service worker to reach 'activated' state
async function ensureActiveServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
        throw new Error('Service workers are not supported in this browser.');
    }

    let registration = await navigator.serviceWorker.getRegistration();
    
    if (!registration) {
        console.log('No registration found, registering now...');
        registration = await navigator.serviceWorker.register('/sw.js');
    }

    // Wait for it to be ready
    await navigator.serviceWorker.ready;

    if (registration.active?.state === 'activated') {
        return registration;
    }

    // If not activated, wait for it
    return new Promise((resolve, reject) => {
        const worker = registration!.installing || registration!.waiting || registration!.active;
        
        if (!worker) {
            reject(new Error('No worker found in registration. Try refreshing the page.'));
            return;
        }

        if (worker.state === 'activated') {
            resolve(registration!);
            return;
        }

        const stateChangeHandler = () => {
            if (worker.state === 'activated') {
                worker.removeEventListener('statechange', stateChangeHandler);
                resolve(registration!);
            }
        };

        worker.addEventListener('statechange', stateChangeHandler);
        
        // Timeout after 8 seconds
        setTimeout(() => {
            worker.removeEventListener('statechange', stateChangeHandler);
            reject(new Error('Service worker activation timed out. Please hard refresh (Ctrl+Shift+R).'));
        }, 8000);
    });
}

export function NotificationStatus() {
    const [isPending, startTransition] = useTransition()
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [subscribing, setSubscribing] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

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
            const registration = await navigator.serviceWorker.getRegistration()
            if (!registration) {
                setIsSubscribed(false)
                return
            }
            
            const subscription = await registration.pushManager.getSubscription()
            setIsSubscribed(!!subscription)
        } catch (error) {
            console.error('Error checking subscription:', error)
        }
    }

    async function handleSubscribe() {
        setSubscribing(true)
        setStatus({ type: 'info', message: 'Connecting to notification service...' })
        try {
            // 1. Get permission if needed
            let currentPermission = Notification.permission
            if (currentPermission === 'default') {
                setStatus({ type: 'info', message: 'Waiting for browser permission...' })
                currentPermission = await Notification.requestPermission()
                setPermission(currentPermission)
            }
            
            if (currentPermission !== 'granted') {
                throw new Error('Notification permission was denied. Please enable it in browser settings (click the lock icon).')
            }

            // 2. Ensure active service worker
            setStatus({ type: 'info', message: 'Preparing background service...' })
            const registration = await ensureActiveServiceWorker()
            
            // 3. FORCE UNSUBSCRIBE to get a fresh token
            setStatus({ type: 'info', message: 'Syncing credentials...' })
            const existingSub = await registration.pushManager.getSubscription()
            if (existingSub) {
                await existingSub.unsubscribe()
            }

            // 4. Subscribe with current VAPID keys
            const vapidKeyRaw = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKeyRaw) throw new Error('VAPID public key not found (check your .env)')
            
            // SANITIZE: Strip quotes
            const vapidKey = vapidKeyRaw.replace(/['"]/g, '').trim();

            setStatus({ type: 'info', message: 'Generating fresh subscription...' })
            
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            })

            // 5. Save to server
            setStatus({ type: 'info', message: 'Saving to your account...' })
            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription)
            })

            let data;
            try {
                data = await response.json()
            } catch (e) {
                throw new Error(`Connection error (Status: ${response.status}). Please try logging in again.`)
            }

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save subscription on server')
            }

            setIsSubscribed(true)
            await checkSubscription()
            setStatus({ type: 'success', message: 'Successfully connected! You will now receive event alerts.' })
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
                setStatus({ type: 'success', message: 'Test notification sent! Check your device.' })
            } else {
                setStatus({ type: 'error', message: result.error || 'Failed to send test notification' })
            }
        })
    }

    if (permission === 'unsupported') {
        return (
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-red-400 p-4 rounded-xl bg-red-400/5 border border-red-400/10">
                    <AlertCircle size={20} />
                    <span className="text-sm font-medium">Push notifications are not supported in this browser.</span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
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
                        status.type === 'info' ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20' :
                        'bg-red-400/10 text-red-400 border border-red-400/20'
                    }`}>
                        {status.type === 'info' ? <Loader2 size={14} className="animate-spin" /> : 
                         status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {status.message}
                    </div>
                )}

                <div className="flex flex-wrap gap-3 mt-1">
                    {(!isSubscribed) && (
                        <Button 
                            size="sm" 
                            onClick={handleSubscribe} 
                            loading={subscribing}
                            className="bg-accent hover:bg-accent-hover text-white flex items-center gap-2"
                        >
                            {!subscribing && <RefreshCw size={14} />}
                            {permission === 'denied' ? 'Try Again' : 'Enable Notifications'}
                        </Button>
                    ) || (
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
