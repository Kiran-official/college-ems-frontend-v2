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
        console.warn(`--- [PUSH SUBSCRIBE HANDSHAKE] ---`)
        console.warn(`User: ${user.email}`)
        console.warn(`Time: ${new Date().toLocaleTimeString()}`)

        // Check for existing subscription for this user with same endpoint
        const { data: existing } = await supabase
            .from('push_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .contains('subscription', { endpoint: subscription.endpoint })
            .maybeSingle()

        if (existing) {
            console.warn('--- [PUSH SUBSCRIBE] Subscription already exists for this endpoint. Skipping insert. ---')
            return NextResponse.json({ 
                success: true, 
                message: 'Subscription already active',
                timestamp: new Date().toLocaleTimeString() 
            })
        }

        const { error } = await supabase.from('push_subscriptions').insert({
            user_id: user.id,
            subscription: subscription,
        })
        
        if (error) {
            console.error('--- [PUSH SUBSCRIBE] Save Error:', error.message, error.details || '')
            return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
        }

        console.warn('--- [PUSH SUBSCRIBE] Save Successful! ---')
        return NextResponse.json({ 
            success: true, 
            message: 'Subscription saved',
            timestamp: new Date().toLocaleTimeString() 
        })

    } catch (error) {
        console.error('Subscription Endpoint Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
