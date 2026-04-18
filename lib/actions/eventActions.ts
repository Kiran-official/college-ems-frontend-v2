'use server'

import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import { sendEventNotification } from '@/lib/actions/notifications'
import { triggerCertificateProcessingAction } from './certificateActions'
import { issueEventCertificates } from '@/lib/certificates'

export async function createEventAction(data: {
    title: string
    description?: string
    event_date: string
    registration_deadline: string
    department_id?: string
    forum?: string
    visibility: 'public_all' | 'internal_only' | 'external_only'
    participant_type: 'single' | 'multiple'
    team_size?: number
    faculty_ids: string[]
    is_paid?: boolean
    registration_fee?: number
    upi_qr_url?: string
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
            forum: data.forum || null,
            visibility: data.visibility,
            participant_type: data.participant_type,
            team_size: data.participant_type === 'multiple' ? data.team_size : null,
            status: 'draft',
            is_active: true,
            results_published: false,
            created_by: user.id,
            is_paid: data.is_paid ?? false,
            registration_fee: data.is_paid ? (data.registration_fee ?? null) : null,
            upi_qr_url: data.is_paid ? (data.upi_qr_url ?? null) : null,
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
            }))
            const { error: ficError } = await admin.from('faculty_in_charge').insert(ficRows)
            if (ficError) {
                console.error('Faculty assignment error:', ficError)
                return { success: false, error: 'Event created but faculty assignment failed: ' + ficError.message }
            }
        }

        revalidatePath('/admin/events')
        revalidatePath('/teacher/events')
        // @ts-ignore
        revalidateTag('events')
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
        forum?: string | null
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
        revalidatePath(`/student/events/${eventId}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function openEventAction(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { error } = await admin.from('events').update({ status: 'open' }).eq('id', eventId)
        if (error) return { success: false, error: error.message }

        // Trigger PWA Push Notifications
        sendEventNotification(eventId).catch(e => console.error('Push trigger failed:', e))

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        revalidatePath('/student/events')
        revalidatePath('/admin/events')
        revalidatePath('/teacher/events')
        // @ts-ignore
        revalidateTag('events') // Cache invalidation
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
        // @ts-ignore
        revalidateTag('events') // Clears unstable_cache for event lists
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
        
        // --- 1. Validation Phase ---

        // Check for unmarked attendance
        const { count: unmarkedCount, error: countError } = await admin
            .from('individual_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('attendance_status', 'registered')
        
        if (countError) return { success: false, error: countError.message }
        if (unmarkedCount && unmarkedCount > 0) {
            return { success: false, error: `Incomplete Attendance: ${unmarkedCount} students have not been marked.` }
        }

        // Fetch templates
        const { data: templates, error: templateError } = await admin
            .from('certificate_templates')
            .select('certificate_type')
            .eq('event_id', eventId)
            .eq('is_active', true)
        
        if (templateError) return { success: false, error: templateError.message }
        
        const hasParticipationTemplate = templates?.some(t => t.certificate_type === 'participation')
        const hasWinnerTemplate = templates?.some(t => t.certificate_type === 'winner')

        // Fetch winners
        const { data: winners, error: winnersError } = await admin
            .from('winners')
            .select('student_id, team_id, winner_type')
            .eq('event_id', eventId)

        if (winnersError) return { success: false, error: winnersError.message }

        // Sanity check for winner templates
        if (winners && winners.length > 0 && !hasWinnerTemplate) {
            return { success: false, error: 'Mandatory Template Missing: Winners are declared but no Winner Certificate Template is active for this event.' }
        }

        // --- 2. Preparation & Execution Phase ---
        
        const certResult = await issueEventCertificates(admin, eventId)
        if (!certResult.success) {
            return { success: false, error: certResult.error }
        }

        if (certResult.queued > 0) {
            // Trigger background processing
            await triggerCertificateProcessingAction()
        }

        // Update Event Status (Only after certs are safely in the DB)
        const { error: updateError } = await admin.from('events').update({
            results_published: true,
            status: 'completed'
        }).eq('id', eventId)
        
        if (updateError) {
            console.error('[publishResultsAction] Update error:', updateError)
            return { success: false, error: `Failed to update event status: ${updateError.message}. Certificates were queued.` }
        }

        // Revalidate everywhere
        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        revalidatePath(`/student/events/${eventId}`)
        revalidatePath('/admin/events')
        revalidatePath('/teacher/events')
        revalidatePath('/student/events')
        revalidatePath('/admin')
        revalidatePath('/teacher')
        revalidatePath('/student')

        return { success: true }
    } catch (e) {
        console.error('[publishResultsAction] Crash:', e)
        return { success: false, error: 'An unexpected system error occurred while publishing results.' }
    }
}

export async function completeEventAction(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // 0. Check if all attendance is marked
        const { count: unmarkedCount, error: countError } = await admin
            .from('individual_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('attendance_status', 'registered')
        
        if (countError) return { success: false, error: countError.message }
        if (unmarkedCount && unmarkedCount > 0) {
            return { success: false, error: 'Cannot complete event: Attendance marking is incomplete for all registered students.' }
        }

        const { error } = await admin.from('events').update({ status: 'completed' }).eq('id', eventId)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        revalidatePath('/student/events')
        // @ts-ignore
        revalidateTag('events')
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
        
        // 1. Get current status to save it
        const { data: event } = await admin.from('events').select('status').eq('id', eventId).single()
        if (!event) return { success: false, error: 'Event not found' }

        // 2. Perform archiving
        const { error } = await admin
            .from('events')
            .update({ 
                is_active: false, 
                status: 'archived', 
                previous_status: event.status 
            })
            .eq('id', eventId)
        
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/events')
        revalidatePath('/teacher/events')
        revalidatePath('/student/events')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'An unexpected error occurred' }
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

        // 1. Get previous status
        const { data: event } = await admin.from('events').select('previous_status').eq('id', eventId).single()
        if (!event) return { success: false, error: 'Event not found' }
        
        const targetStatus = event.previous_status || 'draft'

        // 2. Perform restoration
        const { error } = await admin
            .from('events')
            .update({ 
                is_active: true, 
                status: targetStatus 
            })
            .eq('id', eventId)
        
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/events')
        revalidatePath('/teacher/events')
        revalidatePath('/student/events')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'An unexpected error occurred' }
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

        // 1. Delete certificates
        await admin.from('certificates').delete().eq('event_id', eventId)

        // 2. Delete winners
        await admin.from('winners').delete().eq('event_id', eventId)

        // 3. Delete individual registrations
        await admin.from('individual_registrations').delete().eq('event_id', eventId)

        // 4. Delete teams (cascades to team_members)
        await admin.from('teams').delete().eq('event_id', eventId)

        // 5. Delete faculty in charge
        await admin.from('faculty_in_charge').delete().eq('event_id', eventId)

        // 6. Delete certificate templates
        await admin.from('certificate_templates').delete().eq('event_id', eventId)

        // 7. Finally delete the event itself
        const { error } = await admin.from('events').delete().eq('id', eventId)
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/events')
        revalidatePath('/teacher/events')
        revalidatePath('/student/events')
        // @ts-ignore
        revalidateTag('events')
        return { success: true }
    } catch (e) {
        console.error('Error in hardDeleteEventAction:', e)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function addParticipantAfterCloseAction(data: {
    event_id: string
    student_id: string
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
            team_id: data.team_id || null,
            attendance_status: 'registered',
        })
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${data.event_id}`)
        revalidatePath(`/teacher/events/${data.event_id}`)
        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function addFacultyInChargeAction(eventId: string, teacherId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile) return { success: false, error: 'User profile not found' }

        const admin = createAdminClient()

        let isManageable = false
        if (profile.role === 'admin') {
            isManageable = true
        } else if (profile.role === 'teacher') {
            const { data: fic } = await admin.from('faculty_in_charge').select('id').eq('event_id', eventId).eq('teacher_id', user.id).maybeSingle()
            if (fic) isManageable = true
        }

        if (!isManageable) return { success: false, error: 'Not authorised to assign faculty to this event' }
        
        // Prevent duplicate insertion constraint error
        const { data: existing } = await admin.from('faculty_in_charge')
            .select('id')
            .eq('event_id', eventId)
            .eq('teacher_id', teacherId)
            .maybeSingle()

        if (existing) {
             return { success: false, error: 'Teacher is already assigned to this event' }
        }

        const { error } = await admin.from('faculty_in_charge').insert({
            event_id: eventId,
            teacher_id: teacherId
        })
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message || 'An unexpected error occurred' }
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
