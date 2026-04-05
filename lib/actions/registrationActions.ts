'use server'

import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { validateTeamCapacity } from './teams'

export async function registerForEventAction(data: {
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: event } = await ssr.from('events').select('status, registration_deadline, is_paid').eq('id', data.event_id).single()
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
            payment_status: event.is_paid ? 'pending' : 'not_required',
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
        revalidatePath(`/admin/events/${reg.event_id}`)
        revalidatePath(`/teacher/events/${reg.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function deleteRegistrationAction(
    registrationId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            return { success: false, error: 'Not authorised to delete registrations' }
        }

        const admin = createAdminClient()
        const { data: reg } = await admin.from('individual_registrations').select('event_id, team_id, student_id').eq('id', registrationId).single()
        if (!reg) return { success: false, error: 'Registration not found' }

        // If in a team, remove from team_members too
        if (reg.team_id) {
            await admin.from('team_members').delete().eq('team_id', reg.team_id).eq('student_id', reg.student_id)
        }

        const { error } = await admin.from('individual_registrations').delete().eq('id', registrationId)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/admin/events/${reg.event_id}`)
        revalidatePath(`/teacher/events/${reg.event_id}`)
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

        // 3. Check for unique team name in this event
        const { data: nameConflict } = await admin.from('teams')
            .select('id')
            .eq('event_id', data.event_id)
            .ilike('team_name', data.team_name.trim())
            .maybeSingle()
        if (nameConflict) return { success: false, error: 'A team with this name already exists for this event' }

        // 4. Auto-cancel any pending join requests the student sent
        await admin.from('team_members')
            .delete()
            .eq('student_id', user.id)
            .eq('status', 'pending')
            .is('invited_by', null)
            .in('team_id',
                (await admin.from('teams').select('id').eq('event_id', data.event_id)).data?.map((t: { id: string }) => t.id) ?? []
            )

        // 5. Create the team
        const { data: event } = await admin.from('events').select('is_paid').eq('id', data.event_id).single()
        const isPaid = event?.is_paid ?? false

        const { data: team, error: teamError } = await admin.from('teams').insert({
            event_id: data.event_id,
            team_name: data.team_name.trim(),
            created_by: user.id,
            leader_id: user.id,
            payment_status: isPaid ? 'pending' : 'not_required',
        }).select('id').single()
        if (teamError || !team) return { success: false, error: teamError?.message ?? 'Failed to create team' }

        // 6. Auto-enrol the creator as an approved member
        const { error: memberError } = await admin.from('team_members').insert({
            team_id: team.id,
            student_id: user.id,
            status: 'approved',
        })
        if (memberError) {
            await admin.from('teams').delete().eq('id', team.id)
            return { success: false, error: 'Failed to enrol you in the team: ' + memberError.message }
        }

        // 7. Create or update individual_registration for the creator
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

        // 8. Auto-invite selected members
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

export async function editTeamAction(data: {
    team_id: string
    event_id: string
    new_name: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // 1. Verify caller is the creator
        const { data: team } = await admin.from('teams').select('id, created_by').eq('id', data.team_id).single()
        if (!team) return { success: false, error: 'Team not found' }
        if (team.created_by !== user.id) return { success: false, error: 'Only the team creator can rename the team' }

        // 2. Check for unique team name in this event (excluding itself)
        const { data: nameConflict } = await admin.from('teams')
            .select('id')
            .eq('event_id', data.event_id)
            .ilike('team_name', data.new_name.trim())
            .neq('id', data.team_id)
            .maybeSingle()
        if (nameConflict) return { success: false, error: 'A team with this name already exists for this event' }

        // 3. Update name
        const { error } = await admin.from('teams').update({ team_name: data.new_name.trim() }).eq('id', data.team_id)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
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
            .select('*, team:teams!inner(event_id, created_by)')
            .eq('id', data.team_member_id)
            .single()
        if (!tm) return { success: false, error: 'Invite not found' }
        if (tm.student_id !== user.id) return { success: false, error: 'Not authorised' }
        if (!tm.invited_by) return { success: false, error: 'This is a join request, not an invite' }

        const eventId = (tm.team as any).event_id

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
                (await admin.from('teams').select('id').eq('event_id', eventId)).data?.map((t: { id: string }) => t.id) ?? []
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
            .select('*, team:teams!inner(event_id, created_by, leader_id)')
            .eq('id', data.team_member_id)
            .single()
        if (!tm) return { success: false, error: 'Request not found' }

        if ((tm.team as any).created_by !== user.id && (tm.team as any).leader_id !== user.id) {
            return { success: false, error: 'Only the team creator or leader can approve requests' }
        }

        const eventId = (tm.team as any).event_id

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

        const { data: tm } = await admin.from('team_members').select('*, team:teams!inner(created_by, leader_id)').eq('id', data.team_member_id).single()
        if (!tm) return { success: false, error: 'Request not found' }

        if ((tm.team as any).created_by !== user.id && (tm.team as any).leader_id !== user.id) {
            return { success: false, error: 'Only the team creator or leader can reject requests' }
        }

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

        const { data: tm } = await admin.from('team_members').select('*, team:teams!inner(event_id, created_by)').eq('id', data.team_member_id).single()
        if (!tm) return { success: false, error: 'Member not found' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        const isAuthorized = (tm.team as any).created_by === user.id || profile?.role === 'admin' || profile?.role === 'teacher'
        
        if (!isAuthorized) return { success: false, error: 'Not authorised to remove members' }
        if (tm.student_id === user.id && (tm.team as any).created_by === user.id) return { success: false, error: 'You cannot remove yourself if you are the creator — delete the team instead' }

        await admin.from('team_members').delete().eq('id', data.team_member_id)
        await admin.from('individual_registrations').update({ team_id: null }).eq('student_id', tm.student_id).eq('team_id', tm.team_id)

        revalidatePath(`/student/events/${data.event_id}`)
        revalidatePath(`/admin/events/${data.event_id}`)
        revalidatePath(`/teacher/events/${data.event_id}`)
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
    paymentStatus?: 'pending' | 'verified'
    leaderId?: string
}

export async function registerParticipantAction(
    input: RegisterInput
): Promise<{ success: boolean; teamId?: string | null; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        if (input.isManual) {
            const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
            if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
                return { success: false, error: 'Not authorised to manually register participants' }
            }
        } else if (user.id !== input.userId) {
            return { success: false, error: 'Can only self-register unless using manual admin mode' }
        }

        const { data: event } = await admin.from('events')
            .select('status, registration_deadline, visibility, participant_type, team_size')
            .eq('id', input.eventId)
            .single()

        if (!event) return { success: false, error: 'Event not found' }
        if (event.status === 'draft' || event.status === 'cancelled') {
            return { success: false, error: `Cannot register for a ${event.status} event` }
        }

        if (!input.isManual) {
            if (event.status !== 'open') return { success: false, error: 'Registration is closed' }
            if (new Date() >= new Date(event.registration_deadline)) return { success: false, error: 'Registration deadline has passed' }
        }

        const { data: targetUser } = await admin.from('users').select('student_type, is_active').eq('id', input.userId).single()
        if (!targetUser) return { success: false, error: 'Target user not found' }
        if (!targetUser.is_active) return { success: false, error: 'User is not active' }

        if (event.visibility === 'internal_only' && targetUser.student_type !== 'internal') {
            return { success: false, error: 'This event is for internal students only' }
        }
        if (event.visibility === 'external_only' && targetUser.student_type !== 'external') {
            return { success: false, error: 'This event is for external students only' }
        }

        const { data: existingReg } = await admin.from('individual_registrations')
            .select('id, team_id')
            .eq('student_id', input.userId)
            .eq('event_id', input.eventId)
            .maybeSingle()

        if (existingReg) {
            // If already in a team, block
            if (existingReg.team_id) {
                return { success: false, error: 'User is already registered for this event and is assigned to a team' }
            }
            // If individual event, block
            if (event.participant_type === 'single') {
                return { success: false, error: 'User is already registered for this event' }
            }
            // If team event but no team provided, block (prevent duplicate ungrouped)
            if (!input.teamId && !input.teamName) {
                return { success: false, error: 'User is already registered for this event' }
            }
        }

        const { data: evData } = await admin.from('events').select('is_paid').eq('id', input.eventId).single()
        const isPaid = evData?.is_paid ?? false

        let finalTeamId: string | null = null
        let isVerified = false
        let existingTeamData: any = null

        if (event.participant_type === 'multiple') {
            if (!input.teamId && !input.teamName) {
                return { success: false, error: 'Team event requires either a existing team ID or a new team name' }
            }

            if (input.teamId) {
                const { data: existingTeam } = await admin.from('teams').select('id, leader_id, payment_status, verified_by').eq('id', input.teamId).maybeSingle()
                if (!existingTeam) return { success: false, error: 'Specified team does not exist' }

                existingTeamData = existingTeam
                // Auto-verify if team is already verified
                const isTeamVerified = existingTeam.payment_status === 'verified'
                const finalPaymentStatus = isTeamVerified ? 'verified' : (input.isManual && input.paymentStatus ? input.paymentStatus : (isPaid ? 'pending' : 'not_required'))
                isVerified = finalPaymentStatus === 'verified'

                if (existingTeam.leader_id) {
                    const { data: leaderProfile } = await admin.from('users').select('role').eq('id', existingTeam.leader_id).single()
                    if (leaderProfile?.role !== 'student') {
                        await admin.from('teams').update({ leader_id: input.userId }).eq('id', input.teamId)
                    }
                }

                const capacity = await validateTeamCapacity(input.teamId, input.eventId)
                if (!capacity.canAdd) {
                    return { success: false, error: capacity.error || 'Team is already full' }
                }

                finalTeamId = input.teamId

                const { error: tmError } = await admin.from('team_members').insert({
                    team_id: finalTeamId,
                    student_id: input.userId,
                    status: 'approved',
                    invited_by: input.isManual ? user.id : null
                })
                if (tmError) return { success: false, error: 'Failed to add to team: ' + tmError.message }
                
                // Inherit verification or apply manual status
                if (isVerified || (input.isManual && input.paymentStatus)) {
                    await admin.from('teams').update({
                        payment_status: isVerified ? 'verified' : input.paymentStatus,
                        verified_at: isVerified ? new Date().toISOString() : (input.paymentStatus === 'verified' ? new Date().toISOString() : null),
                        verified_by: isVerified ? (existingTeamData?.verified_by || user.id) : (input.paymentStatus === 'verified' ? user.id : null),
                    }).eq('id', finalTeamId)
                    
                    // Note: We'll apply this to the individual registration below
                }

            } else if (input.teamName) {
                const { data: nameConflict } = await admin.from('teams')
                    .select('id')
                    .eq('event_id', input.eventId)
                    .ilike('team_name', input.teamName.trim())
                    .maybeSingle()
                if (nameConflict) return { success: false, error: 'A team with this name already exists for this event' }


                const { data: newTeam, error: teamError } = await admin.from('teams').insert({
                    event_id: input.eventId,
                    team_name: input.teamName.trim(),
                    created_by: input.userId,
                    leader_id: input.leaderId || input.userId,
                    payment_status: input.isManual && input.paymentStatus ? input.paymentStatus : (isPaid ? 'pending' : 'not_required'),
                    verified_at: input.isManual && input.paymentStatus === 'verified' ? new Date().toISOString() : null,
                    verified_by: input.isManual && input.paymentStatus === 'verified' ? user.id : null,
                }).select('id').single()

                if (teamError || !newTeam) return { success: false, error: 'Failed to create new team' }
                finalTeamId = newTeam.id

                const { error: tmError } = await admin.from('team_members').insert({
                    team_id: finalTeamId,
                    student_id: input.userId,
                    status: 'approved'
                })
                if (tmError) {
                    await admin.from('teams').delete().eq('id', finalTeamId)
                    return { success: false, error: 'Failed to add owner to new team' }
                }
            }
        }


        const registrationData = {
            student_id: input.userId,
            event_id: input.eventId,
            team_id: finalTeamId,
            attendance_status: 'registered',
            payment_status: isVerified ? 'verified' : (input.isManual && input.paymentStatus ? input.paymentStatus : (isPaid ? 'pending' : 'not_required')),
            verified_at: isVerified || (input.isManual && input.paymentStatus === 'verified') ? new Date().toISOString() : null,
            verified_by: isVerified ? (existingTeamData?.verified_by || user.id) : (input.isManual && input.paymentStatus === 'verified' ? user.id : null),
        }

        const { error: regError } = existingReg 
            ? await admin.from('individual_registrations').update(registrationData).eq('id', existingReg.id)
            : await admin.from('individual_registrations').insert(registrationData)

        if (regError) {
            if (finalTeamId) {
                 await admin.from('team_members').delete().eq('team_id', finalTeamId).eq('student_id', input.userId)
                 if (input.teamName && !input.teamId) {
                     await admin.from('teams').delete().eq('id', finalTeamId)
                 }
            }
            return { success: false, error: regError.message }
        }

        revalidatePath(`/admin/events/${input.eventId}`)
        revalidatePath(`/teacher/events/${input.eventId}`)
        revalidatePath(`/events/${input.eventId}`)

        return { success: true, teamId: finalTeamId }
    } catch (error) {
        console.error('registerParticipantAction error:', error)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function uploadPaymentProofAction(data: {
    registration_id: string
    event_id: string
    file_base64: string
    file_type: string
    file_ext: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: reg } = await ssr.from('individual_registrations')
            .select('id, student_id, payment_status, team_id')
            .eq('id', data.registration_id)
            .eq('student_id', user.id)
            .maybeSingle()
        if (!reg) return { success: false, error: 'Registration not found or not authorised' }
        if (reg.payment_status === 'verified') return { success: false, error: 'Payment is already verified' }

        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowed.includes(data.file_type)) return { success: false, error: 'Only image files are allowed (JPEG, PNG, WebP)' }

        const admin = createAdminClient()
        const filePath = `${user.id}/${data.registration_id}.${data.file_ext}`
        const base64Data = data.file_base64.split(',')[1] ?? data.file_base64
        const buffer = Buffer.from(base64Data, 'base64')

        const { error: uploadError } = await admin.storage
            .from('payment-proofs')
            .upload(filePath, buffer, {
                contentType: data.file_type,
                upsert: true,
            })
        if (uploadError) return { success: false, error: 'Upload failed: ' + uploadError.message }

        if (reg.team_id) {
            const { error: teamUpdateError } = await admin.from('teams').update({
                payment_status: 'submitted',
                payment_proof_url: filePath,
                payment_submitted_at: new Date().toISOString(),
                rejection_reason: null,
            }).eq('id', reg.team_id)
            if (teamUpdateError) return { success: false, error: teamUpdateError.message }

            // Sync with all team members
            await admin.from('individual_registrations').update({
                payment_status: 'submitted',
                payment_proof_url: filePath,
                payment_submitted_at: new Date().toISOString(),
                rejection_reason: null,
            }).eq('team_id', reg.team_id)
        } else {
            const { error: updateError } = await admin.from('individual_registrations').update({
                payment_status: 'submitted',
                payment_proof_url: filePath,
                payment_submitted_at: new Date().toISOString(),
                rejection_reason: null,
            }).eq('id', data.registration_id)
            if (updateError) return { success: false, error: updateError.message }
        }

        revalidatePath(`/student/events/${data.event_id}`)
        revalidatePath(`/admin/events/${data.event_id}`)
        revalidatePath(`/teacher/events/${data.event_id}`)
        return { success: true }
    } catch (e) {
        console.error('uploadPaymentProofAction error:', e)
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function verifyPaymentAction(data: {
    registration_id?: string
    team_id?: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            return { success: false, error: 'Not authorised to verify payments' }
        }

        const admin = createAdminClient()
        const payload = {
            payment_status: 'verified' as const,
            verified_at: new Date().toISOString(),
            verified_by: user.id,
            rejection_reason: null,
        }

        if (data.team_id) {
            const { error } = await admin.from('teams').update(payload).eq('id', data.team_id)
            if (error) return { success: false, error: error.message }

            // Sync with team members
            await admin.from('individual_registrations').update(payload).eq('team_id', data.team_id)
        } else if (data.registration_id) {
            const { error } = await admin.from('individual_registrations').update(payload).eq('id', data.registration_id)
            if (error) return { success: false, error: error.message }
        } else {
             return { success: false, error: 'No target specified' }
        }

        revalidatePath(`/admin/events/${data.event_id}`)
        revalidatePath(`/teacher/events/${data.event_id}`)
        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function rejectPaymentAction(data: {
    registration_id?: string
    team_id?: string
    event_id: string
    rejection_reason: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            return { success: false, error: 'Not authorised to reject payments' }
        }

        if (!data.rejection_reason.trim()) return { success: false, error: 'Rejection reason is required' }

        const admin = createAdminClient()
        const payload = {
            payment_status: 'rejected' as const,
            rejection_reason: data.rejection_reason.trim(),
            verified_at: null,
            verified_by: null,
        }

        if (data.team_id) {
            const { error } = await admin.from('teams').update(payload).eq('id', data.team_id)
            if (error) return { success: false, error: error.message }

            // Sync with team members
            await admin.from('individual_registrations').update(payload).eq('team_id', data.team_id)
        } else if (data.registration_id) {
            const { error } = await admin.from('individual_registrations').update(payload).eq('id', data.registration_id)
            if (error) return { success: false, error: error.message }
        }

        revalidatePath(`/admin/events/${data.event_id}`)
        revalidatePath(`/teacher/events/${data.event_id}`)
        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function requestRefundAction(data: {
    registration_id?: string
    team_id?: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const payload = { payment_status: 'refund_requested' as const }

        if (data.team_id) {
            const { data: team } = await admin.from('teams').select('created_by').eq('id', data.team_id).single()
            if (team?.created_by !== user.id) return { success: false, error: 'Only the team creator can request a refund' }
            
            const { error } = await admin.from('teams').update(payload).eq('id', data.team_id)
            if (error) return { success: false, error: error.message }
        } else if (data.registration_id) {
            const { data: reg } = await admin.from('individual_registrations').select('student_id').eq('id', data.registration_id).single()
            if (reg?.student_id !== user.id) return { success: false, error: 'Not authorised' }

            const { error } = await admin.from('individual_registrations').update(payload).eq('id', data.registration_id)
            if (error) return { success: false, error: error.message }
        }

        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function processRefundAction(data: {
    registration_id?: string
    team_id?: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile || !['admin', 'teacher'].includes(profile.role)) {
            return { success: false, error: 'Not authorised' }
        }

        const admin = createAdminClient()
        const payload = { payment_status: 'refunded' as const }

        if (data.team_id) {
            const { error } = await admin.from('teams').update(payload).eq('id', data.team_id)
            if (error) return { success: false, error: error.message }

            // Sync with team members
            await admin.from('individual_registrations').update(payload).eq('team_id', data.team_id)
        } else if (data.registration_id) {
            const { error } = await admin.from('individual_registrations').update(payload).eq('id', data.registration_id)
            if (error) return { success: false, error: error.message }
        }

        revalidatePath(`/admin/events/${data.event_id}`)
        revalidatePath(`/teacher/events/${data.event_id}`)
        revalidatePath(`/student/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function getPaymentProofSignedUrlAction(
    filePath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { data, error } = await admin.storage
            .from('payment-proofs')
            .createSignedUrl(filePath, 3600) // 1 hour

        if (error || !data) return { success: false, error: error?.message ?? 'Failed to generate URL' }
        return { success: true, url: data.signedUrl }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function transferLeadershipAction(data: {
    team_id: string
    new_leader_id: string
    event_id: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // Verify authorization: current leader, admin, or teacher
        const { data: team } = await admin.from('teams').select('leader_id').eq('id', data.team_id).single()
        if (!team) return { success: false, error: 'Team not found' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        const isAuthorized = team.leader_id === user.id || profile?.role === 'admin' || profile?.role === 'teacher'
        if (!isAuthorized) return { success: false, error: 'Not authorised to transfer leadership' }

        // Verify new leader is a member of the team
        const { data: member } = await admin.from('team_members')
            .select('id')
            .eq('team_id', data.team_id)
            .eq('student_id', data.new_leader_id)
            .eq('status', 'approved')
            .maybeSingle()
        if (!member) return { success: false, error: 'New leader must be an approved member of the team' }

        const { error } = await admin.from('teams').update({ leader_id: data.new_leader_id }).eq('id', data.team_id)
        if (error) return { success: false, error: error.message }

        revalidatePath(`/student/events/${data.event_id}`)
        revalidatePath(`/admin/events/${data.event_id}`)
        revalidatePath(`/teacher/events/${data.event_id}`)
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}