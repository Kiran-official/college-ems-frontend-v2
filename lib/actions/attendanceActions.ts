'use server'

import { createAdminClient, createSSRClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateAttendanceAction(data: {
    registration_id: string
    status: 'present' | 'absent' | 'not_marked'
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        // Get registration to find event
        const { data: reg } = await ssr
            .from('individual_registrations')
            .select('event_id')
            .eq('id', data.registration_id)
            .single()
        if (!reg) return { success: false, error: 'Registration not found' }

        // Check event status — ONLY closed is allowed
        const { data: event } = await ssr
            .from('events')
            .select('status')
            .eq('id', reg.event_id)
            .single()
        if (!event) return { success: false, error: 'Event not found' }

        if (event.status === 'open') {
            return { success: false, error: 'Attendance can only be marked after the event is closed.' }
        }
        if (event.status === 'completed') {
            return { success: false, error: 'This event is completed. Attendance records are final.' }
        }

        const admin = createAdminClient()
        const { error } = await admin
            .from('individual_registrations')
            .update({ attendance_status: data.status })
            .eq('id', data.registration_id)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${reg.event_id}`)
        revalidatePath(`/teacher/events/${reg.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function bulkUpdateAttendanceAction(data: {
    event_id: string
    status: 'present' | 'not_marked'
    category_id?: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: event } = await ssr.from('events').select('status').eq('id', data.event_id).single()
        if (!event) return { success: false, error: 'Event not found' }
        if (event.status !== 'closed') {
            return { success: false, error: 'Attendance can only be modified when event is closed.' }
        }

        const admin = createAdminClient()
        let query = admin
            .from('individual_registrations')
            .update({ attendance_status: data.status })
            .eq('event_id', data.event_id)

        if (data.category_id) {
            query = query.eq('category_id', data.category_id)
        }

        const { error } = await query
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${data.event_id}`)
        revalidatePath(`/teacher/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}
