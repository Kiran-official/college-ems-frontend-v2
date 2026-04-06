import { createAdminClient } from './lib/supabase/admin'

async function debugTransition() {
    const supabase = createAdminClient()
    
    // Find an event
    const { data: event } = await supabase.from('events').select('id, status, is_active').limit(1).single()
    if (!event) return console.log('No event found')
    
    console.log(`Current: ID=${event.id}, Status=${event.status}, IsActive=${event.is_active}`)
    
    // Try to update ONLY is_active
    const { error } = await supabase
        .from('events')
        .update({ is_active: !event.is_active })
        .eq('id', event.id)
    
    if (error) {
        console.error('Update is_active failed:', error.message)
    } else {
        console.log('Update is_active success')
    }
}

debugTransition()
