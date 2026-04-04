import { createAdminClient } from './lib/supabase/admin'

async function checkEvents() {
    const supabase = createAdminClient()
    const { data, count, error } = await supabase
        .from('events')
        .select('id, title, is_active', { count: 'exact' })
        .eq('is_active', true)
    
    if (error) {
        console.error('Error fetching events:', error)
        return
    }

    console.log(`Total Active Events (Admin): ${count}`)
    console.log('Events List:')
    data?.forEach(e => console.log(`- ${e.title} (${e.is_active ? 'Active' : 'Archived'})`))
}

checkEvents()
