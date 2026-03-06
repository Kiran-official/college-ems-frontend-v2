'use server'

import { createAdminClient, createSSRClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function registerForEventAction(data: {
    event_id: string
    category_id?: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        // Verify event is open and deadline hasn't passed
        const { data: event } = await ssr.from('events').select('status, registration_deadline').eq('id', data.event_id).single()
        if (!event) return { success: false, error: 'Event not found' }
        if (event.status !== 'open') return { success: false, error: 'Registration is closed' }
        if (new Date() >= new Date(event.registration_deadline)) {
            return { success: false, error: 'Registration deadline has passed' }
        }

        // Check if already registered
        let existCheck = ssr.from('individual_registrations')
            .select('id')
            .eq('student_id', user.id)
            .eq('event_id', data.event_id)
        if (data.category_id) {
            existCheck = existCheck.eq('category_id', data.category_id)
        } else {
            existCheck = existCheck.is('category_id', null)
        }
        const { data: existing } = await existCheck.maybeSingle()
        if (existing) return { success: false, error: 'Already registered' }

        const admin = createAdminClient()
        const { error } = await admin.from('individual_registrations').insert({
            student_id: user.id,
            event_id: data.event_id,
            category_id: data.category_id || null,
            attendance_status: 'not_marked',
        })
        if (error) return { success: false, error: error.message }

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function cancelRegistrationAction(
    registrationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        // Get registration and verify ownership + event conditions
        const { data: reg } = await ssr
            .from('individual_registrations')
            .select('*, event:events!inner(status, registration_deadline)')
            .eq('id', registrationId)
            .single()
        if (!reg) return { success: false, error: 'Registration not found' }
        if (reg.student_id !== user.id) return { success: false, error: 'Not authorised' }

        const event = reg.event as unknown as { status: string; registration_deadline: string }
        if (event.status !== 'open') return { success: false, error: 'Cannot cancel — event is no longer open' }
        if (new Date() >= new Date(event.registration_deadline)) {
            return { success: false, error: 'Cannot cancel — deadline has passed' }
        }

        const admin = createAdminClient()

        // If team member, remove from team
        if (reg.team_id) {
            await admin.from('team_members').delete().eq('team_id', reg.team_id).eq('student_id', user.id)
        }

        // Delete registration
        const { error } = await admin.from('individual_registrations').delete().eq('id', registrationId)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/student/events/${reg.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function createTeamAction(data: {
    event_id: string
    category_id?: string
    team_name: string
    member_ids: string[]
}): Promise<{ success: boolean; team_id?: string; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // 1. Check if student is already in a team for this event/category
        let existTeamCheck = admin.from('individual_registrations')
            .select('id, team_id')
            .eq('student_id', user.id)
            .eq('event_id', data.event_id)

        if (data.category_id) {
            existTeamCheck = existTeamCheck.eq('category_id', data.category_id)
        } else {
            existTeamCheck = existTeamCheck.is('category_id', null)
        }

        const { data: existingReg } = await existTeamCheck.maybeSingle()
        if (existingReg?.team_id) return { success: false, error: 'You are already in a team for this event' }

        // 2. Create the team
        const { data: team, error: teamError } = await admin.from('teams').insert({
            event_id: data.event_id,
            category_id: data.category_id || null,
            team_name: data.team_name.trim(),
            created_by: user.id,
        }).select('id').single()

        if (teamError || !team) return { success: false, error: teamError?.message ?? 'Failed to create team' }

        // 3. Auto-enrol the creator
        // Add to team_members
        await admin.from('team_members').insert({
            team_id: team.id,
            student_id: user.id
        })

        // Handle creator's individual registration (Update if exists, Insert if not)
        if (existingReg) {
            await admin.from('individual_registrations')
                .update({ team_id: team.id })
                .eq('id', existingReg.id)
        } else {
            await admin.from('individual_registrations').insert({
                student_id: user.id,
                event_id: data.event_id,
                category_id: data.category_id || null,
                team_id: team.id,
                attendance_status: 'not_marked',
            })
        }

        // 4. Add other members if provided (optional at creation)
        if (data.member_ids && data.member_ids.length > 0) {
            const otherMembers = data.member_ids.filter(id => id !== user.id)
            for (const memberId of otherMembers) {
                // Add to team_members
                await admin.from('team_members').insert({
                    team_id: team.id,
                    student_id: memberId,
                })

                // Upsert individual registration for the member
                const { data: mReg } = await admin.from('individual_registrations')
                    .select('id')
                    .eq('student_id', memberId)
                    .eq('event_id', data.event_id)
                    .eq('category_id', data.category_id || null)
                    .maybeSingle()

                if (mReg) {
                    await admin.from('individual_registrations').update({ team_id: team.id }).eq('id', mReg.id)
                } else {
                    await admin.from('individual_registrations').insert({
                        student_id: memberId,
                        event_id: data.event_id,
                        category_id: data.category_id || null,
                        team_id: team.id,
                        attendance_status: 'not_marked',
                    })
                }
            }
        }

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true, team_id: team.id }
    } catch (e) {
        console.error('Error in createTeamAction:', e)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function joinTeamAction(data: {
    team_id: string
    event_id: string
    category_id?: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // Check if student is already in a team for this event/category
        let existTeamCheck = admin.from('individual_registrations')
            .select('id, team_id')
            .eq('student_id', user.id)
            .eq('event_id', data.event_id)

        if (data.category_id) {
            existTeamCheck = existTeamCheck.eq('category_id', data.category_id)
        } else {
            existTeamCheck = existTeamCheck.is('category_id', null)
        }

        const { data: existingReg } = await existTeamCheck.maybeSingle()
        if (existingReg?.team_id) return { success: false, error: 'You are already in a team for this event' }

        // Add to team members
        const { error: tmError } = await admin.from('team_members').insert({
            team_id: data.team_id,
            student_id: user.id,
        })
        if (tmError) return { success: false, error: tmError.message }

        // Create individual registration
        const { error: regError } = await admin.from('individual_registrations').insert({
            student_id: user.id,
            event_id: data.event_id,
            category_id: data.category_id || null,
            team_id: data.team_id,
            attendance_status: 'not_marked',
        })
        if (regError) return { success: false, error: regError.message }

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function leaveTeamAction(data: {
    team_id: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // Remove from team members
        await admin.from('team_members').delete().eq('team_id', data.team_id).eq('student_id', user.id)

        // Remove registration
        await admin.from('individual_registrations').delete()
            .eq('team_id', data.team_id)
            .eq('student_id', user.id)
            .eq('event_id', data.event_id)

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}
