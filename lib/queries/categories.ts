import { createSSRClient } from '@/lib/supabase/server'
import type { EventCategory } from '@/lib/types/db'

export async function getCategoriesByEvent(eventId: string): Promise<EventCategory[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('event_categories')
        .select('*, faculty_in_charge(*, teacher:users!faculty_in_charge_teacher_id_fkey(id, name, email))')
        .eq('event_id', eventId)
        .order('created_at')
    return data ?? []
}

export async function getCategoryById(id: string): Promise<EventCategory | null> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('event_categories')
        .select('*, faculty_in_charge(*, teacher:users!faculty_in_charge_teacher_id_fkey(id, name, email))')
        .eq('id', id)
        .single()
    return data
}
