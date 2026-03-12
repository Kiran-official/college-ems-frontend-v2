'use server'

import { createAdminClient } from '@/lib/supabase/admin'
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

        // 1. Fetch event (title, description, type, status)
        const { data: event, error: eventError } = await admin
            .from('events')
            .select('id, title, description, type, status')
            .eq('id', eventId)
            .single()

        if (eventError || !event) {
            console.error('Failed to fetch event for notification:', eventError)
            return
        }

        // Only send if the event is actually open
        if (event.status !== 'open') return

        // 2. Fetch eligible user_ids based on event.type
        let userQuery = admin.from('users').select('id')
        
        if (event.type === 'internal') {
            userQuery = userQuery.eq('student_type', 'internal')
        } else if (event.type === 'external') {
            userQuery = userQuery.eq('student_type', 'external')
        }
        // If type === 'public', we don't apply an eq filter, selecting all active users
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
