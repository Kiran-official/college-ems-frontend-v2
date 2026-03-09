import { createSSRClient } from '@/lib/supabase/server'
import type { EventCategory } from '@/lib/types/db'

export async function getCategoriesByEvent(eventId: string): Promise<EventCategory[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('event_categories')
        .select(`
            *,
            faculty_in_charge:faculty_in_charge!faculty_in_charge_category_id_fkey(
                *,
                teacher:users!fic_teacher_fkey(id, name, email)
            )
        `)
        .eq('event_id', eventId)
        .order('created_at')
    return data ?? []
}

export async function getCategoryById(id: string): Promise<EventCategory | null> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('event_categories')
        .select(`
            *,
            faculty_in_charge:faculty_in_charge!faculty_in_charge_category_id_fkey(
                *,
                teacher:users!fic_teacher_fkey(id, name, email)
            )
        `)
        .eq('id', id)
        .single()
    return data
}
