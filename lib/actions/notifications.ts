'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createSSRClient } from '@/lib/supabase/server'
import webpush from 'web-push'

// Configure web-push
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
    webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL}`,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    )
}

export async function sendEventNotification(eventId: string) {
    // Only proceed if VAPID keys are configured
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.warn('VAPID keys not configured. Skipping push notification.')
        return
    }

    try {
        const admin = createAdminClient()

        // 1. Fetch event (title, description, visibility, status)
        const { data: event, error: eventError } = await admin
            .from('events')
            .select('id, title, description, visibility, status')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            console.error('Failed to fetch event for notification:', eventError)
            return
        }

        // Only send if the event is actually open
        if (event.status !== 'open') return

        // 2. Fetch eligible user_ids based on event.visibility
        let userQuery = admin.from('users').select('id')
        
        if (event.visibility === 'internal_only') {
            userQuery = userQuery.eq('student_type', 'internal')
        } else if (event.visibility === 'external_only') {
            userQuery = userQuery.eq('student_type', 'external')
        }
        // If visibility === 'public_all', we don't apply an eq filter, selecting all active users
        userQuery = userQuery.eq('is_active', true)

        const { data: eligibleUsers, error: usersError } = await userQuery

        if (usersError || !eligibleUsers || eligibleUsers.length === 0) {
            console.log('No eligible users found for notification.')
            return
        }

        const eligibleUserIds = eligibleUsers.map(u => u.id)

        // 3. Fetch push_subscriptions for those user_ids
        const { data: subscriptions, error: subsError } = await admin
            .from('push_subscriptions')
            .select('id, user_id, subscription')
            .in('user_id', eligibleUserIds)

        if (subsError || !subscriptions || subscriptions.length === 0) {
            console.log('No push subscriptions found for eligible users.')
            return
        }

        // 4. For each subscription: send web push
        const payload = JSON.stringify({
            title: `New Event: ${event.title}`,
            body: event.description || 'Registration is now open. Click to view details.',
            url: `/events/${eventId}`
        })

        const deleteIds: string[] = []

        await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload)
                } catch (error: any) {
                    // 5. On 410 Gone (or 404): mark subscription for deletion
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        deleteIds.push(sub.id)
                    } else {
                        console.error('Push send error:', error)
                    }
                }
            })
        )

        // Cleanup stale subscriptions
        if (deleteIds.length > 0) {
            const { error: deleteError } = await admin
                .from('push_subscriptions')
                .delete()
                .in('id', deleteIds)
            
            if (deleteError) {
                console.error('Failed to clean up stale push subscriptions:', deleteError)
            } else {
                console.log(`Cleaned up ${deleteIds.length} stale push subscriptions.`)
            }
        }

        console.log(`Successfully processed push notifications for event ${eventId}.`)

    } catch (error) {
        console.error('Error in sendEventNotification:', error)
    }
}

export async function sendManualEventNotification(
    eventId: string,
    title: string,
    body: string
): Promise<{ success: boolean; error?: string; recipientCount?: number }> {
    // Validation
    if (!title || title.trim().length < 3) return { success: false, error: 'Title must be at least 3 characters' }
    if (!body || body.trim().length < 5) return { success: false, error: 'Message must be at least 5 characters' }
    if (title.length > 100) return { success: false, error: 'Title too long (max 100)' }
    if (body.length > 500) return { success: false, error: 'Message too long (max 500)' }

    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        const userId = user?.id
        if (!userId) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // 1. Authorisation: Admin or Faculty In Charge
        const { data: userProfile, error: profileError } = await admin.from('users').select('role').eq('id', userId).single()
        if (profileError) return { success: false, error: 'Could not verify authorization: ' + profileError.message }

        const isAdmin = userProfile?.role === 'admin'

        if (!isAdmin) {
            const { data: fic } = await admin
                .from('faculty_in_charge')
                .select('id')
                .eq('event_id', eventId)
                .eq('teacher_id', userId)
                .maybeSingle()
            
            const { data: ev } = await admin.from('events').select('created_by').eq('id', eventId).single()
            const isCreator = ev?.created_by === userId

            if (!fic && !isCreator) {
                return { success: false, error: 'Not authorised to send notifications for this event' }
            }
        }

        // 2. Fetch all unique student user_ids for this event from individual_registrations
        const { data: participants, error: partError } = await admin
            .from('individual_registrations')
            .select('student_id')
            .eq('event_id', eventId)
        
        if (partError) return { success: false, error: 'Failed to fetch participants' }

        const studentIds = new Set<string>()
        participants?.forEach(p => studentIds.add(p.student_id))

        if (studentIds.size === 0) {
            return { success: false, error: 'No participants registered for this event yet' }
        }

        const uniqueStudentIds = Array.from(studentIds)

        // 3. Fetch push subscriptions
        const { data: subscriptions, error: subsError } = await admin
            .from('push_subscriptions')
            .select('id, user_id, subscription')
            .in('user_id', uniqueStudentIds)

        if (subsError) return { success: false, error: 'Failed to fetch push tokens' }
        
        if (!subscriptions || subscriptions.length === 0) {
            return { success: false, error: 'No participants have enabled push notifications on their devices yet.' }
        }

        // 4. Send notifications
        const payload = JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            url: `/events/${eventId}`
        })

        const deleteIds: string[] = []
        await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload)
                } catch (error: any) {
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        deleteIds.push(sub.id)
                    }
                }
            })
        )

        // Stale cleanup
        if (deleteIds.length > 0) {
            await admin.from('push_subscriptions').delete().in('id', deleteIds)
        }

        return { success: true, recipientCount: subscriptions.length }

    } catch (err: any) {
        console.error('sendManualEventNotification error:', err)
        return { success: false, error: err.message || 'Failed to send notifications' }
    }
}

export async function sendTestNotification(): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { data: subscriptions, error: subsError } = await admin
            .from('push_subscriptions')
            .select('id, subscription')
            .eq('user_id', user.id)

        if (subsError) return { success: false, error: 'DB Error: ' + subsError.message }
        if (!subscriptions || subscriptions.length === 0) {
            return { success: false, error: 'No active push tokens found for your account. Please enable notifications first.' }
        }

        const payload = JSON.stringify({
            title: 'Test Notification',
            body: 'It works! You are correctly subscribed to push notifications.',
            url: '/'
        })

        const deleteIds: string[] = []
        await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(sub.subscription as webpush.PushSubscription, payload)
                } catch (error: any) {
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        deleteIds.push(sub.id)
                    }
                }
            })
        )

        if (deleteIds.length > 0) {
            await admin.from('push_subscriptions').delete().in('id', deleteIds)
        }

        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Failed to send test notification' }
    }
}
