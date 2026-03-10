'use server'

import { createAdminClient, createSSRClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function declareWinnerAction(data: {
    event_id: string
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

        // Check if results are already published
        const { data: event } = await admin.from('events').select('results_published').eq('id', data.event_id).single()
        if (event?.results_published) return { success: false, error: 'Cannot change winners after results are published' }

        const insertData: Record<string, unknown> = {
            event_id: data.event_id,
            winner_type: data.winner_type,
            position_label: data.position_label,
            tags: data.tags ?? [],
            created_by: user.id,
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
        revalidatePath(`/student/events/${data.event_id}`)
        revalidatePath('/admin')
        revalidatePath('/teacher')
        revalidatePath('/student')
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

        // Check if results are already published
        const { data: event } = await admin.from('events').select('results_published').eq('id', eventId).single()
        if (event?.results_published) return { success: false, error: 'Cannot change winners after results are published' }

        const { error } = await admin.from('winners').delete().eq('id', winnerId)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        revalidatePath(`/student/events/${eventId}`)
        revalidatePath('/admin')
        revalidatePath('/teacher')
        revalidatePath('/student')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}
