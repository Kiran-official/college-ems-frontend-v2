'use server'

import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
const revalidate = { path: revalidatePath as any }

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

        // Check if results are already published or event is not closed
        const { data: event } = await admin.from('events').select('results_published, status').eq('id', data.event_id).single()
        if ((event as any)?.results_published) return { success: false, error: 'Cannot change winners after results are published' }
        if ((event as any)?.status !== 'closed') return { success: false, error: 'Winners can only be declared after the event is closed' }

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

        const { error } = await admin.from('winners').insert(insertData as any)
        if (error) return { success: false, error: error.message }

        revalidate.path(`/admin/events/${data.event_id}`)
        revalidate.path(`/teacher/events/${data.event_id}`)
        revalidate.path(`/student/events/${data.event_id}`)
        revalidate.path('/admin')
        revalidate.path('/teacher')
        revalidate.path('/student')
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

        // Check if results are already published or event is not closed
        const { data: event } = await admin.from('events').select('results_published, status').eq('id', eventId).single()
        if ((event as any)?.results_published) return { success: false, error: 'Cannot change winners after results are published' }
        if ((event as any)?.status !== 'closed') return { success: false, error: 'Winners can only be declared after the event is closed' }

        const { error } = await admin.from('winners').delete().eq('id', winnerId)
        if (error) return { success: false, error: error.message }

        revalidate.path(`/admin/events/${eventId}`)
        revalidate.path(`/teacher/events/${eventId}`)
        revalidate.path(`/student/events/${eventId}`)
        revalidate.path('/admin')
        revalidate.path('/teacher')
        revalidate.path('/student')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}
