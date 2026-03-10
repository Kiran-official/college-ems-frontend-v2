import { createSSRClient } from '@/lib/supabase/server'
import type { Winner } from '@/lib/types/db'

export async function getWinnersByEvent(eventId: string): Promise<Winner[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('winners')
        .select(`
            *,
            student:users!winners_student_id_fkey(id, name, email),
            team:teams(*, members:team_members(*, student:users!team_members_student_id_fkey(id, name, email)))
        `)
        .eq('event_id', eventId)
        .order('created_at')
    return data ?? []
}

export async function getStudentPendingResults(studentId: string): Promise<number> {
    const supabase = await createSSRClient()
    // Events where student is registered, event completed but results not published
    const { data } = await supabase
        .from('individual_registrations')
        .select('event:events!inner(status, results_published)')
        .eq('student_id', studentId)
    return data?.filter(r => {
        const event = r.event as unknown as { status: string; results_published: boolean }
        return event?.status === 'completed' && !event?.results_published
    }).length ?? 0
}
