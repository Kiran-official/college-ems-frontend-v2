'use server'

import { createAdminClient, createSSRClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ParticipantType } from '@/lib/types/db'

export async function addCategoryAction(data: {
    event_id: string
    category_name: string
    description?: string
    event_date?: string
    participant_type: ParticipantType
    team_size?: number
    faculty_ids?: string[]
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // Insert category
        const { data: cat, error: catError } = await admin.from('event_categories').insert({
            event_id: data.event_id,
            category_name: data.category_name,
            description: data.description || null,
            event_date: data.event_date || null,
            participant_type: data.participant_type,
            team_size: data.participant_type === 'multiple' ? data.team_size : null,
        }).select('id').single()

        if (catError || !cat) return { success: false, error: catError?.message ?? 'Failed to add category' }

        // Add faculty
        if (data.faculty_ids && data.faculty_ids.length > 0) {
            const ficRows = data.faculty_ids.map(tid => ({
                event_id: data.event_id,
                teacher_id: tid,
                category_id: cat.id,
            }))
            await admin.from('faculty_in_charge').insert(ficRows)
        }

        revalidatePath(`/admin/events/${data.event_id}`)
        revalidatePath(`/teacher/events/${data.event_id}`)
        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch (e) {
        console.error('[addCategoryAction]', e)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function updateCategoryAction(
    categoryId: string,
    eventId: string,
    data: {
        category_name?: string
        description?: string
        event_date?: string
        participant_type?: ParticipantType
        team_size?: number
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const admin = createAdminClient()
        const { error } = await admin.from('event_categories').update({
            ...data,
            team_size: data.participant_type === 'single' ? null : data.team_size
        }).eq('id', categoryId)

        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        revalidatePath(`/student/events/${eventId}`)
        return { success: true }
    } catch (e) {
        console.error('[updateCategoryAction]', e)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function deleteCategoryAction(categoryId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const admin = createAdminClient()

        // Check for registrations
        const { count } = await admin.from('individual_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', categoryId)

        if (count && count > 0) {
            return { success: false, error: 'Cannot delete category with existing registrations' }
        }

        const { error } = await admin.from('event_categories').delete().eq('id', categoryId)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        revalidatePath(`/student/events/${eventId}`)
        return { success: true }
    } catch (e) {
        console.error('[deleteCategoryAction]', e)
        return { success: false, error: 'An unexpected error occurred' }
    }
}
