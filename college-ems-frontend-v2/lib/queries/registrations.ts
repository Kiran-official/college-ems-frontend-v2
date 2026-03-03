import { createSSRClient } from '@/lib/supabase/server'
import type { IndividualRegistration, Team } from '@/lib/types/db'

export async function getRegistrationsByEvent(eventId: string): Promise<IndividualRegistration[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('individual_registrations')
        .select(`
            *,
            student:users!individual_registrations_student_id_fkey(id, name, email, department_id, department:departments(name)),
            category:event_categories(*),
            team:teams(*, members:team_members(*, student:users!team_members_student_id_fkey(id, name, email, department_id, department:departments(name))))
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
            event:events(*, department:departments(*)),
            category:event_categories(*)
        `)
        .eq('student_id', studentId)
        .order('registered_at', { ascending: false })
    return data ?? []
}

export async function getStudentRegistrationForEvent(
    studentId: string,
    eventId: string,
    categoryId?: string
): Promise<IndividualRegistration | null> {
    const supabase = await createSSRClient()
    let query = supabase
        .from('individual_registrations')
        .select('*, team:teams(*, members:team_members(*, student:users!team_members_student_id_fkey(id, name, email)))')
        .eq('student_id', studentId)
        .eq('event_id', eventId)

    if (categoryId) {
        query = query.eq('category_id', categoryId)
    } else {
        query = query.is('category_id', null)
    }

    const { data } = await query.maybeSingle()
    return data
}

export async function getTeamsByEvent(eventId: string, categoryId?: string): Promise<Team[]> {
    const supabase = await createSSRClient()
    let query = supabase
        .from('teams')
        .select('*, members:team_members(*, student:users!team_members_student_id_fkey(id, name, email)), creator:users!teams_created_by_fkey(id, name)')
        .eq('event_id', eventId)

    if (categoryId) {
        query = query.eq('category_id', categoryId)
    } else {
        query = query.is('category_id', null)
    }

    const { data } = await query.order('created_at')
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

export async function getStudentUpcomingCount(studentId: string): Promise<number> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('individual_registrations')
        .select('event:events!inner(status)')
        .eq('student_id', studentId)
    return data?.filter((r: any) => {
        const event = r.event as unknown as { status: string }
        return event?.status === 'open'
    }).length ?? 0
}
