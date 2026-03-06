'use server'

import { createAdminClient, createSSRClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createEventAction(data: {
    title: string
    description?: string
    event_date: string
    registration_deadline: string
    department_id?: string
    visibility: 'public_all' | 'internal_only' | 'external_only'
    participant_type: 'single' | 'multiple'
    team_size?: number
    faculty_ids: string[]
    categories?: Array<{
        category_name: string
        participant_type: 'single' | 'multiple'
        team_size?: number
        faculty_ids?: string[]
    }>
}): Promise<{ success: boolean; event_id?: string; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            return { success: false, error: 'Not authorised' }
        }

        const admin = createAdminClient()

        // Create event
        const { data: event, error: eventError } = await admin.from('events').insert({
            title: data.title,
            description: data.description || null,
            event_date: data.event_date,
            registration_deadline: data.registration_deadline,
            department_id: data.department_id || null,
            visibility: data.visibility,
            participant_type: data.participant_type,
            team_size: data.participant_type === 'multiple' ? data.team_size : null,
            status: 'open',
            is_active: true,
            results_published: false,
            created_by: user.id,
        }).select('id').single()

        if (eventError || !event) return { success: false, error: eventError?.message ?? 'Failed to create event' }

        // Add faculty in charge at event level
        const facultyIds = data.faculty_ids.length > 0
            ? data.faculty_ids
            : (profile.role === 'teacher' ? [user.id] : [])

        if (facultyIds.length > 0) {
            const ficRows = facultyIds.map(tid => ({
                event_id: event.id,
                teacher_id: tid,
                category_id: null as string | null,
            }))
            await admin.from('faculty_in_charge').insert(ficRows)
        }

        // Create categories if provided
        if (data.categories && data.categories.length > 0) {
            for (const cat of data.categories) {
                const { data: catRow, error: catError } = await admin.from('event_categories').insert({
                    event_id: event.id,
                    category_name: cat.category_name,
                    participant_type: cat.participant_type,
                    team_size: cat.participant_type === 'multiple' ? cat.team_size : null,
                }).select('id').single()

                if (catError || !catRow) continue

                // Category-level faculty
                if (cat.faculty_ids && cat.faculty_ids.length > 0) {
                    const catFicRows = cat.faculty_ids.map(tid => ({
                        event_id: event.id,
                        teacher_id: tid,
                        category_id: catRow.id,
                    }))
                    await admin.from('faculty_in_charge').insert(catFicRows)
                }
            }
        }

        revalidatePath('/admin/events')
        revalidatePath('/teacher/events')
        return { success: true, event_id: event.id }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function updateEventAction(
    eventId: string,
    data: {
        title?: string
        description?: string
        event_date?: string
        registration_deadline?: string
        department_id?: string
        visibility?: 'public_all' | 'internal_only' | 'external_only'
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { error } = await admin.from('events').update(data).eq('id', eventId)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function closeEventAction(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { error } = await admin.from('events').update({ status: 'closed' }).eq('id', eventId)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        revalidatePath('/student/events')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function publishResultsAction(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { error } = await admin.from('events').update({ results_published: true }).eq('id', eventId)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        revalidatePath('/student/events')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function completeEventAction(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { error } = await admin.from('events').update({ status: 'completed' }).eq('id', eventId)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        revalidatePath('/student/events')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function archiveEventAction(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }
        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') return { success: false, error: 'Not authorised' }

        const admin = createAdminClient()
        const { error } = await admin.from('events').update({ is_active: false }).eq('id', eventId)
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/events')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function restoreEventAction(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }
        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') return { success: false, error: 'Not authorised' }

        const admin = createAdminClient()
        const { error } = await admin.from('events').update({ is_active: true }).eq('id', eventId)
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/events')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function hardDeleteEventAction(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') {
            return { success: false, error: 'Not authorised' }
        }

        const admin = createAdminClient()
        const { error } = await admin.from('events').delete().eq('id', eventId)
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/events')
        revalidatePath('/teacher/events')
        revalidatePath('/student/events')
        return { success: true }
    } catch (e) {
        console.error('Error in hardDeleteEventAction:', e)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function addParticipantAfterCloseAction(data: {
    event_id: string
    student_id: string
    category_id?: string
    team_id?: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        // Check event status
        const { data: event } = await ssr.from('events').select('status, results_published').eq('id', data.event_id).single()
        if (!event) return { success: false, error: 'Event not found' }
        if (event.status !== 'closed') return { success: false, error: 'Event must be closed to add participants' }
        if (event.results_published) return { success: false, error: 'Cannot add participants after results are published' }

        // Check faculty authorization
        const { data: fic } = await ssr.from('faculty_in_charge').select('id').eq('event_id', data.event_id).eq('teacher_id', user.id).maybeSingle()
        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!fic && profile?.role !== 'admin') return { success: false, error: 'Not authorised' }

        const admin = createAdminClient()
        const { error } = await admin.from('individual_registrations').insert({
            student_id: data.student_id,
            event_id: data.event_id,
            category_id: data.category_id || null,
            team_id: data.team_id || null,
            attendance_status: 'not_marked',
        })
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${data.event_id}`)
        revalidatePath(`/teacher/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function autoClosePastEventsAction(): Promise<{ success: boolean; closedCount?: number; error?: string }> {
    try {
        const admin = createAdminClient();
        const now = new Date().toISOString();
        // Update events where registration_deadline is before now and status is 'open'
        const { data: updated, error } = await admin
            .from('events')
            .update({ status: 'closed' })
            .lt('registration_deadline', now)
            .eq('status', 'open')
            .eq('is_active', true)
            .select('id');
        if (error) return { success: false, error: error.message };
        // Revalidate paths for affected events list pages
        revalidatePath('/student/events');
        revalidatePath('/admin/events');
        revalidatePath('/teacher/events');
        return { success: true, closedCount: updated?.length };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}
