'use server'

import { createAdminClient, createSSRClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function declareWinnerAction(data: {
    event_id: string
    category_id?: string
    winner_type: 'student' | 'team'
    winner_id: string
    position_label: string
    tags?: string[]
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const insertData: Record<string, unknown> = {
            event_id: data.event_id,
            category_id: data.category_id || null,
            winner_type: data.winner_type,
            position_label: data.position_label,
            tags: data.tags ?? [],
        }

        if (data.winner_type === 'student') {
            insertData.student_id = data.winner_id
        } else {
            insertData.team_id = data.winner_id
        }

        const { error } = await admin.from('winners').insert(insertData)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${data.event_id}`)
        revalidatePath(`/teacher/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function removeWinnerAction(winnerId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { error } = await admin.from('winners').delete().eq('id', winnerId)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}
