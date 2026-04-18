'use server'

import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { validateTeamCapacity } from './teams'
import { rateLimit } from '@/lib/rate-limit'

export async function registerForEventAction(data: {
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        // Rate limit: 15 registrations per minute per user
        const { success: rateSuccess } = rateLimit(`register:${user.id}`, { limit: 15, window: 60000 })
        if (!rateSuccess) return { success: false, error: 'Too many requests. Please try again later.' }

        const { data: event } = await ssr.from('events').select('status, registration_deadline').eq('id', data.event_id).single()
        if (!event) return { success: false, error: 'Event not found' }
        if (event.status !== 'open') return { success: false, error: 'Registration is closed' }
        if (new Date() >= new Date(event.registration_deadline)) return { success: false, error: 'Registration deadline has passed' }

        const { data: existing } = await ssr.from('individual_registrations')
            .select('id')
            .eq('student_id', user.id)
            .eq('event_id', data.event_id)
            .maybeSingle()
        if (existing) return { success: false, error: 'Already registered' }

        const admin = createAdminClient()
        const { error } = await admin.from('individual_registrations').insert({
            student_id: user.id,
            event_id: data.event_id,
            attendance_status: 'registered',
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

        const { data: reg } = await ssr
            .from('individual_registrations')
            .select('*, event:events!inner(status, registration_deadline)')
            .eq('id', registrationId)
            .single()
        if (!reg) return { success: false, error: 'Registration not found' }
        if (reg.student_id !== user.id) return { success: false, error: 'Not authorised' }

        const event = reg.event as unknown as { status: string; registration_deadline: string }
        if (event.status !== 'open') return { success: false, error: 'Cannot cancel — event is no longer open' }
        if (new Date() >= new Date(event.registration_deadline)) return { success: false, error: 'Cannot cancel — deadline has passed' }

        const admin = createAdminClient()
        if (reg.team_id) {
            await admin.from('team_members').delete().eq('team_id', reg.team_id).eq('student_id', user.id)
        }

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
    team_name: string
    member_ids: string[]
}): Promise<{ success: boolean; team_id?: string; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { success: rateSuccess } = rateLimit(`create_team:${user.id}`, { limit: 5, window: 60000 })
        if (!rateSuccess) return { success: false, error: 'Too many team creations. Please try again later.' }

        const admin = createAdminClient()

        // 1. Check if student already created a team for this event
        const { data: existingCreatedTeam } = await admin.from('teams')
            .select('id')
            .eq('created_by', user.id)
            .eq('event_id', data.event_id)
            .maybeSingle()
        if (existingCreatedTeam) return { success: false, error: 'You have already created a team for this event' }

        // 2. Check if student is already an approved member of another team
        const { data: existingReg } = await admin.from('individual_registrations')
            .select('id, team_id')
            .eq('student_id', user.id)
            .eq('event_id', data.event_id)
            .maybeSingle()
        if (existingReg?.team_id) return { success: false, error: 'You are already in a team for this event' }

        // 3. Auto-cancel any pending join requests the student sent
        await admin.from('team_members')
            .delete()
            .eq('student_id', user.id)
            .eq('status', 'pending')
            .is('invited_by', null)
            .in('team_id',
                (await admin.from('teams').select('id').eq('event_id', data.event_id)).data?.map(t => t.id) ?? []
            )

        // 4. Create the team
        const { data: team, error: teamError } = await admin.from('teams').insert({
            event_id: data.event_id,
            team_name: data.team_name.trim(),
            created_by: user.id,
        }).select('id').single()
        if (teamError || !team) return { success: false, error: teamError?.message ?? 'Failed to create team' }

        // 5. Auto-enrol the creator as an approved member
        const { error: memberError } = await admin.from('team_members').insert({
            team_id: team.id,
            student_id: user.id,
            status: 'approved',
        })
        if (memberError) {
            await admin.from('teams').delete().eq('id', team.id)
            return { success: false, error: 'Failed to enrol you in the team: ' + memberError.message }
        }

        // 6. Create or update individual_registration for the creator
        if (existingReg) {
            const { error: regError } = await admin.from('individual_registrations').update({ team_id: team.id }).eq('id', existingReg.id)
            if (regError) {
                await admin.from('team_members').delete().eq('team_id', team.id)
                await admin.from('teams').delete().eq('id', team.id)
                return { success: false, error: 'Team creation failed: ' + regError.message }
            }
        } else {
            const { error: regError } = await admin.from('individual_registrations').insert({
                student_id: user.id,
                event_id: data.event_id,
                team_id: team.id,
                attendance_status: 'registered',
            })
            if (regError) {
                await admin.from('team_members').delete().eq('team_id', team.id)
                await admin.from('teams').delete().eq('id', team.id)
                return { success: false, error: 'Team creation failed: ' + regError.message }
            }
        }

        // 7. Auto-invite selected members
        const otherMembers = (data.member_ids ?? []).filter(id => id !== user.id)
        if (otherMembers.length > 0) {
            await admin.from('team_members').insert(
                otherMembers.map(memberId => ({
                    team_id: team.id,
                    student_id: memberId,
                    status: 'pending',
                    invited_by: user.id,
                }))
            )
        }

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true, team_id: team.id }
    } catch (e) {
        console.error('createTeamAction error:', e)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function joinTeamAction(data: {
    team_id: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { success: rateSuccess } = rateLimit(`join_team:${user.id}`, { limit: 10, window: 60000 })
        if (!rateSuccess) return { success: false, error: 'Too many requests. Please try again later.' }

        const admin = createAdminClient()

        const { data: existingMember } = await admin.from('team_members').select('id, status').eq('student_id', user.id).eq('team_id', data.team_id).maybeSingle()
        if (existingMember) {
            if (existingMember.status === 'pending') return { success: false, error: 'You already have a pending request for this team' }
            return { success: false, error: 'You are already a member of this team' }
        }

        const { data: existingReg } = await admin.from('individual_registrations')
            .select('id, team_id')
            .eq('student_id', user.id)
            .eq('event_id', data.event_id)
            .maybeSingle()
        if (existingReg?.team_id) return { success: false, error: 'You are already in a team for this event' }

        // Insert as student-initiated request (invited_by = null)
        const { error: tmError } = await admin.from('team_members').insert({
            team_id: data.team_id,
            student_id: user.id,
            status: 'pending',
            invited_by: null,
        })
        if (tmError) return { success: false, error: tmError.message }

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

// Creator sends an invite to a student (creator-initiated)
export async function sendInviteAction(data: {
    team_id: string
    student_id: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // Verify caller is the team creator
        const { data: team } = await admin.from('teams').select('id, created_by, event_id').eq('id', data.team_id).single()
        if (!team) return { success: false, error: 'Team not found' }
        if (team.created_by !== user.id) return { success: false, error: 'Only the team creator can send invites' }

        // Check team size
        const { data: event } = await admin.from('events').select('team_size').eq('id', data.event_id).single()
        const maxSize = event?.team_size ?? null

        if (maxSize) {
            const { count } = await admin.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', data.team_id).eq('status', 'approved')
            if ((count ?? 0) >= maxSize) return { success: false, error: 'Team is already full' }
        }

        // Check student not already in team or already invited
        const { data: existing } = await admin.from('team_members').select('id, status').eq('team_id', data.team_id).eq('student_id', data.student_id).maybeSingle()
        if (existing) {
            if (existing.status === 'approved') return { success: false, error: 'Student is already a member of this team' }
            if (existing.status === 'pending') return { success: false, error: 'Student already has a pending request/invite for this team' }
        }

        // Check student not already in another team for this event
        const { data: existingReg } = await admin.from('individual_registrations')
            .select('id, team_id')
            .eq('student_id', data.student_id)
            .eq('event_id', data.event_id)
            .maybeSingle()
        if (existingReg?.team_id) return { success: false, error: 'Student is already in a team for this event' }

        // Insert invite (invited_by = creator)
        const { error } = await admin.from('team_members').insert({
            team_id: data.team_id,
            student_id: data.student_id,
            status: 'pending',
            invited_by: user.id,
        })
        if (error) return { success: false, error: error.message }

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

// Invited student accepts an invite (creator-initiated)
export async function acceptInviteAction(data: {
    team_member_id: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        const { data: tm } = await admin.from('team_members')
            .select('*, team:teams!inner(created_by, event_id)')
            .eq('id', data.team_member_id)
            .single()
        if (!tm) return { success: false, error: 'Invite not found' }
        if (tm.student_id !== user.id) return { success: false, error: 'Not authorised' }
        if (!tm.invited_by) return { success: false, error: 'This is a join request, not an invite' }

        const team = tm.team as any
        const eventId: string = team.event_id

        // Check team still has space
        const { data: event } = await admin.from('events').select('team_size').eq('id', eventId).single()
        const maxSize = event?.team_size ?? null

        if (maxSize) {
            const { count } = await admin.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', tm.team_id).eq('status', 'approved')
            if ((count ?? 0) >= maxSize) return { success: false, error: 'Team is now full' }
        }

        // Cancel any pending join requests the student sent to other teams
        await admin.from('team_members')
            .delete()
            .eq('student_id', user.id)
            .eq('status', 'pending')
            .is('invited_by', null)
            .neq('id', data.team_member_id)
            .in('team_id',
                (await admin.from('teams').select('id').eq('event_id', eventId)).data?.map(t => t.id) ?? []
            )

        // Approve the invite
        await admin.from('team_members').update({ status: 'approved' }).eq('id', data.team_member_id)

        // Create or update individual_registration
        const { data: existingReg } = await admin.from('individual_registrations')
            .select('id')
            .eq('student_id', user.id)
            .eq('event_id', eventId)
            .maybeSingle()

        if (existingReg) {
            await admin.from('individual_registrations').update({ team_id: tm.team_id }).eq('id', existingReg.id)
        } else {
            await admin.from('individual_registrations').insert({
                student_id: user.id,
                event_id: eventId,
                team_id: tm.team_id,
                attendance_status: 'registered',
            })
        }

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

// Invited student declines an invite
export async function declineInviteAction(data: {
    team_member_id: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        const { data: tm } = await admin.from('team_members').select('id, student_id, invited_by').eq('id', data.team_member_id).single()
        if (!tm) return { success: false, error: 'Invite not found' }
        if (tm.student_id !== user.id) return { success: false, error: 'Not authorised' }

        await admin.from('team_members').delete().eq('id', data.team_member_id)

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function approveJoinRequestAction(data: {
    team_member_id: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        const { data: tm } = await admin.from('team_members')
            .select('*, team:teams!inner(created_by, event_id)')
            .eq('id', data.team_member_id)
            .single()
        if (!tm) return { success: false, error: 'Request not found' }

        const team = tm.team as any
        if (team.created_by !== user.id) return { success: false, error: 'Only the team creator can approve requests' }

        const eventId: string = team.event_id

        const { data: event } = await admin.from('events').select('team_size').eq('id', eventId).single()
        const maxSize = event?.team_size ?? null

        if (maxSize) {
            const { count } = await admin.from('team_members').select('id', { count: 'exact', head: true }).eq('team_id', tm.team_id).eq('status', 'approved')
            if ((count ?? 0) >= maxSize) return { success: false, error: 'Team is already full' }
        }

        await admin.from('team_members').update({ status: 'approved' }).eq('id', data.team_member_id)

        const { data: existingReg } = await admin.from('individual_registrations')
            .select('id')
            .eq('student_id', tm.student_id)
            .eq('event_id', eventId)
            .maybeSingle()

        if (existingReg) {
            await admin.from('individual_registrations').update({ team_id: tm.team_id }).eq('id', existingReg.id)
        } else {
            await admin.from('individual_registrations').insert({
                student_id: tm.student_id,
                event_id: eventId,
                team_id: tm.team_id,
                attendance_status: 'registered',
            })
        }

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function rejectJoinRequestAction(data: {
    team_member_id: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        const { data: tm } = await admin.from('team_members').select('*, team:teams!inner(created_by)').eq('id', data.team_member_id).single()
        if (!tm) return { success: false, error: 'Request not found' }

        const team = tm.team as any
        if (team.created_by !== user.id) return { success: false, error: 'Only the team creator can reject requests' }

        await admin.from('team_members').delete().eq('id', data.team_member_id)

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function removeMemberAction(data: {
    team_member_id: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        const { data: tm } = await admin.from('team_members').select('*, team:teams!inner(created_by, event_id)').eq('id', data.team_member_id).single()
        if (!tm) return { success: false, error: 'Member not found' }

        const team = tm.team as any
        if (team.created_by !== user.id) return { success: false, error: 'Only the team creator can remove members' }
        if (tm.student_id === user.id) return { success: false, error: 'You cannot remove yourself — delete the team instead' }

        await admin.from('team_members').delete().eq('id', data.team_member_id)
        await admin.from('individual_registrations').update({ team_id: null }).eq('student_id', tm.student_id).eq('team_id', tm.team_id)

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function deleteTeamAction(data: {
    team_id: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // Check event status
        const { data: event } = await admin.from('events').select('status').eq('id', data.event_id).single()
        if (!event) return { success: false, error: 'Event not found' }
        if (event.status !== 'open') return { success: false, error: 'Cannot delete team — event is no longer open' }

        const { data: team } = await admin.from('teams').select('id, created_by').eq('id', data.team_id).single()
        if (!team) return { success: false, error: 'Team not found' }
        if (team.created_by !== user.id) return { success: false, error: 'Only the team creator can delete the team' }

        await admin.from('individual_registrations').update({ team_id: null }).eq('team_id', data.team_id)
        await admin.from('team_members').delete().eq('team_id', data.team_id)
        const { error } = await admin.from('teams').delete().eq('id', data.team_id)
        if (error) return { success: false, error: error.message }

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

        // Check event status
        const { data: event } = await admin.from('events').select('status').eq('id', data.event_id).single()
        if (!event) return { success: false, error: 'Event not found' }
        if (event.status !== 'open') return { success: false, error: 'Cannot leave team — event is no longer open' }

        await admin.from('team_members').delete().eq('team_id', data.team_id).eq('student_id', user.id)
        await admin.from('individual_registrations').delete().eq('team_id', data.team_id).eq('student_id', user.id).eq('event_id', data.event_id)

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export type RegisterInput = {
    eventId: string
    userId: string
    teamId?: string
    teamName?: string
    isManual: boolean
}

export async function registerParticipantAction(
    input: RegisterInput
): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // Verify caller is admin or teacher if it's a manual registration
        if (input.isManual) {
            const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
            if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
                return { success: false, error: 'Not authorised to manually register participants' }
            }
        } else if (user.id !== input.userId) {
            return { success: false, error: 'Can only self-register unless using manual admin mode' }
        }

        // 1. Fetch event
        const { data: event } = await admin.from('events')
            .select('status, registration_deadline, type, team_size')
            .eq('id', input.eventId)
            .single()

        if (!event) return { success: false, error: 'Event not found' }
        if (event.status === 'draft' || event.status === 'cancelled') {
            return { success: false, error: `Cannot register for a ${event.status} event` }
        }

        // If not manual, enforce open status and deadline
        if (!input.isManual) {
            if (event.status !== 'open') return { success: false, error: 'Registration is closed' }
            if (new Date() >= new Date(event.registration_deadline)) return { success: false, error: 'Registration deadline has passed' }
        }

        // 2. Fetch target user to check eligibility and existence
        const { data: targetUser } = await admin.from('users').select('student_type, is_active').eq('id', input.userId).single()
        if (!targetUser) return { success: false, error: 'Target user not found' }
        if (!targetUser.is_active) return { success: false, error: 'User is not active' }

        // Eligibility check
        if (event.type === 'internal' && targetUser.student_type !== 'internal') {
            return { success: false, error: 'This event is for internal students only' }
        }
        if (event.type === 'external' && targetUser.student_type !== 'external') {
            return { success: false, error: 'This event is for external students only' }
        }

        // 3. Check for exact duplicate in registrations
        const { data: existingReg } = await admin.from('individual_registrations')
            .select('id, team_id')
            .eq('student_id', input.userId)
            .eq('event_id', input.eventId)
            .maybeSingle()

        if (existingReg) {
            return { success: false, error: 'User is already registered for this event' }
        }

        let finalTeamId: string | null = null

        // Team Logic
        if (event.type === 'team') {
            if (!input.teamId && !input.teamName) {
                return { success: false, error: 'Team event requires either a existing team ID or a new team name' }
            }

            if (input.teamId) {
                // Joining existing team
                const { data: existingTeam } = await admin.from('teams').select('id').eq('id', input.teamId).maybeSingle()
                if (!existingTeam) return { success: false, error: 'Specified team does not exist' }

                // Check team size limit
                const capacity = await validateTeamCapacity(input.teamId, input.eventId)
                if (!capacity.canAdd) {
                    return { success: false, error: capacity.error || 'Team is already full' }
                }

                finalTeamId = input.teamId

                // Insert into team_members (approved status because it's manual/admin or direct)
                const { error: tmError } = await admin.from('team_members').insert({
                    team_id: finalTeamId,
                    student_id: input.userId,
                    status: 'approved',
                    invited_by: input.isManual ? user.id : null
                })
                if (tmError) return { success: false, error: 'Failed to add to team: ' + tmError.message }

            } else if (input.teamName) {
                // Creating a new team
                const { data: newTeam, error: teamError } = await admin.from('teams').insert({
                    event_id: input.eventId,
                    team_name: input.teamName.trim(),
                    created_by: input.userId // The target user "owns" this team
                }).select('id').single()

                if (teamError || !newTeam) return { success: false, error: 'Failed to create new team' }
                finalTeamId = newTeam.id

                // Insert creator into team_members
                const { error: tmError } = await admin.from('team_members').insert({
                    team_id: finalTeamId,
                    student_id: input.userId,
                    status: 'approved'
                })
                if (tmError) {
                    // Rollback
                    await admin.from('teams').delete().eq('id', finalTeamId)
                    return { success: false, error: 'Failed to add owner to new team' }
                }
            }
        }

        // Final step: insert individual registration
        const { error: regError } = await admin.from('individual_registrations').insert({
            student_id: input.userId,
            event_id: input.eventId,
            team_id: finalTeamId,
            attendance_status: 'registered'
        })

        if (regError) {
            // Rollback team member if we just added it
            if (finalTeamId) {
                 await admin.from('team_members').delete().eq('team_id', finalTeamId).eq('student_id', input.userId)
                 // If we created a brand new team just for this user, delete it too
                 if (input.teamName && !input.teamId) {
                     await admin.from('teams').delete().eq('id', finalTeamId)
                 }
            }
            return { success: false, error: regError.message }
        }

        revalidatePath(`/admin/events/${input.eventId}`)
        revalidatePath(`/teacher/events/${input.eventId}`)
        revalidatePath(`/events/${input.eventId}`)

        return { success: true }
    } catch (error) {
        console.error('registerParticipantAction error:', error)
        return { success: false, error: 'An unexpected error occurred' }
    }
}