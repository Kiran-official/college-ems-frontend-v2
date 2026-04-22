'use server'

import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
const revalidate = { path: revalidatePath as any }

export async function createTeam(eventId: string, name: string): Promise<{ success: boolean; team?: any; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { data: team, error } = await admin.from('teams').insert({
            event_id: eventId,
            team_name: name.trim(),
            created_by: user.id,
            leader_id: user.id
        }).select().single()

        if (error) return { success: false, error: error.message }
        
        revalidate.path(`/admin/events/${eventId}`)
        revalidate.path(`/teacher/events/${eventId}`)
        revalidate.path(`/events/${eventId}`)
        
        return { success: true, team }
    } catch (err: any) {
        return { success: false, error: err.message || 'Error creating team' }
    }
}

export async function deleteTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        
        // Check if admin or teacher
        const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
        const isAdmin = profile?.role === 'admin' || profile?.role === 'teacher'

        // Check if team has participants
        const { count } = await admin.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', teamId).eq('status', 'approved')
        if (!isAdmin && count && count > 0) {
            return { success: false, error: 'Remove members first' }
        }

        const { data: team } = await admin.from('teams').select('event_id').eq('id', teamId).single()
        
        if (team) {
            await admin.from('individual_registrations').update({ team_id: null }).eq('team_id', teamId)
            await admin.from('team_members').delete().eq('team_id', teamId)
        }

        const { error } = await admin.from('teams').delete().eq('id', teamId)
        if (error) return { success: false, error: error.message }

        if (team) {
            revalidate.path(`/admin/events/${team.event_id}`)
            revalidate.path(`/teacher/events/${team.event_id}`)
            revalidate.path(`/events/${team.event_id}`)
        }

        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Error deleting team' }
    }
}

export async function validateTeamCapacity(teamId: string, eventId: string): Promise<{ canAdd: boolean; current?: number; limit?: number; error?: string }> {
    try {
        const admin = createAdminClient()

        const { data: event, error: eventError } = await admin.from('events').select('team_size').eq('id', eventId).single()
        if (eventError || !event) return { canAdd: false, error: 'Event not found' }

        const limit = event.team_size || 0
        if (!limit) return { canAdd: true } // No limit

        const { count, error: countError } = await admin.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', teamId).eq('status', 'approved')
        if (countError) return { canAdd: false, error: 'Failed to count team members' }

        const current = count ?? 0
        const canAdd = current < limit

        return { canAdd, current, limit }
    } catch (err: any) {
        return { canAdd: false, error: err.message || 'Error validating team capacity' }
    }
}
