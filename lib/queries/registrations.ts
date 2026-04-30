import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import type { IndividualRegistration, Team } from '@/lib/types/db'

export async function getRegistrationsByEvent(eventId: string): Promise<IndividualRegistration[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('individual_registrations')
        .select(`
            id, student_id, event_id, team_id, registered_at, attendance_status, payment_status,
            student:users!individual_registrations_student_id_fkey(id, name, email, phone_number, programme, semester, department:departments(name)),
            team:teams(id, team_name, members:team_members(status, student:users!team_members_student_id_fkey(id, name, programme, semester)))
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false })
    return (data as unknown as IndividualRegistration[]) ?? []
}
export async function getRegistrationsByStudent(studentId: string): Promise<IndividualRegistration[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('individual_registrations')
        .select(`
            id, student_id, event_id, team_id, registered_at, attendance_status, payment_status,
            event:events(id, title, department:departments(name))
        `)
        .eq('student_id', studentId)
        .order('registered_at', { ascending: false })
    return (data as unknown as IndividualRegistration[]) ?? []
}

export async function getStudentRegistrationForEvent(
    studentId: string,
    eventId: string
): Promise<IndividualRegistration | null> {
    const supabase = await createSSRClient()
    const { data, error } = await supabase
        .from('individual_registrations')
        .select(`
            id, student_id, event_id, team_id, registered_at, attendance_status, payment_status,
            team:teams!individual_registrations_team_id_fkey(
                id,
                team_name,
                created_by,
                leader_id,
                event_id,
                created_at
            )
        `)
        .eq('student_id', studentId)
        .eq('event_id', eventId)
        .maybeSingle()

    if (error) {
        console.error('[getStudentRegistrationForEvent] query error:', error)
    }

    return data as unknown as IndividualRegistration
}

export async function getTeamsByEvent(eventId: string): Promise<Team[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('teams')
        .select(`
            id, team_name, created_by, leader_id, event_id, payment_status, created_at,
            members:team_members(
                id,
                status,
                student:users!team_members_student_id_fkey(id, name, email, phone_number, programme, semester)
            ),
            creator:users!teams_created_by_fkey(id, name)
        `)
        .eq('event_id', eventId)
        .order('created_at')
    return (data as unknown as Team[]) ?? []
}

export async function getRegistrationCount(eventId: string): Promise<number> {
    const supabase = await createSSRClient()
    const { count } = await supabase
        .from('individual_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
    return count ?? 0
}

export const getStudentRegistrationCount = unstable_cache(
    async (studentId: string): Promise<number> => {
        const supabase = createAdminClient()
        const { count } = await supabase
            .from('individual_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', studentId)
        return count ?? 0
    },
    ['student-reg-count'],
    { revalidate: 60, tags: ['registrations'] }
)