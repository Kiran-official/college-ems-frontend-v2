import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import type { Winner } from '@/lib/types/db'

export async function getWinnersByEvent(eventId: string): Promise<Winner[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('winners')
        .select(`
            *,
            student:users!winners_student_id_fkey(id, name, email, programme, semester),
            team:teams(*, members:team_members(*, student:users!team_members_student_id_fkey(id, name, email, programme, semester)))
        `)
        .eq('event_id', eventId)
        .order('created_at')
    return data ?? []
}

export const getStudentPendingResults = unstable_cache(
    async (studentId: string): Promise<number> => {
        const supabase = createAdminClient()
        const { count, error } = await supabase
            .from('individual_registrations')
            .select('event:events!inner(status, results_published)', { count: 'exact', head: true })
            .eq('student_id', studentId)
            .eq('events.status', 'completed')
            .eq('events.results_published', false)

        if (error) {
            console.error("Error fetching pending results count:", error);
            return 0;
        }
        
        return count ?? 0
    },
    ['student-pending-results'],
    { revalidate: 60, tags: ['events', 'registrations'] }
)
