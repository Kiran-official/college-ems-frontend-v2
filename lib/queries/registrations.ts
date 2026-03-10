import { createSSRClient } from '@/lib/supabase/server'
import type { IndividualRegistration, Team } from '@/lib/types/db'

export async function getRegistrationsByEvent(eventId: string): Promise<IndividualRegistration[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('individual_registrations')
        .select(`
            *,
            student:users!individual_registrations_student_id_fkey(id, name, email, phone_number, department_id, department:departments(name)),
            team:teams(*, members:team_members(*, student:users!team_members_student_id_fkey(id, name, email, phone_number, department_id, department:departments(name))))
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false })
    return data ?? []
}

export async function getRegistrationsByStudent(studentId: string): Promise<IndividualRegistration[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('individual_registrations')
        .select(`
            *,
            event:events(*, department:departments(*))
        `)
        .eq('student_id', studentId)
        .order('registered_at', { ascending: false })
    return data ?? []
}

export async function getStudentRegistrationForEvent(
    studentId: string,
    eventId: string
): Promise<IndividualRegistration | null> {
    const supabase = await createSSRClient()
    const { data, error } = await supabase
        .from('individual_registrations')
        .select(`
            *,
            team:teams!individual_registrations_team_id_fkey(
                id,
                team_name,
                created_by,
                event_id
            )
        `)
        .eq('student_id', studentId)
        .eq('event_id', eventId)
        .maybeSingle()

    if (error) {
        console.error('[getStudentRegistrationForEvent] query error:', error)
    }

    return data
}

export async function getTeamsByEvent(eventId: string): Promise<Team[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('teams')
        .select(`
            *,
            members:team_members(
                *,
                student:users!team_members_student_id_fkey(id, name, email)
            ),
            creator:users!teams_created_by_fkey(id, name)
        `)
        .eq('event_id', eventId)
        .order('created_at')
    return data ?? []
}

export async function getRegistrationCount(eventId: string): Promise<number> {
    const supabase = await createSSRClient()
    const { count } = await supabase
        .from('individual_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
    return count ?? 0
}

export async function getStudentRegistrationCount(studentId: string): Promise<number> {
    const supabase = await createSSRClient()
    const { count } = await supabase
        .from('individual_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
    return count ?? 0
}