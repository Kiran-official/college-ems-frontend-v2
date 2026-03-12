import { NextRequest, NextResponse } from 'next/server'
import { createSSRClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createSSRClient()
        
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const subscription = await req.json()

        // Validate subscription object loosely 
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })
        }

        // Insert or update subscription in DB
        // Using upsert isn't directly matching on subscription, so we just insert.
        // We could also delete old ones for the user or handle deduplication depending on requirements.
        // For simplicity, we just add it.
        const { error } = await supabase.from('push_subscriptions').insert({
            user_id: user.id,
            subscription: subscription,
        })

        if (error) {
            console.error('Error saving subscription:', error)
            return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Subscription saved' })

    } catch (error) {
        console.error('Subscription Endpoint Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
