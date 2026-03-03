import { createSSRClient } from '@/lib/supabase/server'

export async function getAttendanceByEvent(eventId: string) {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('individual_registrations')
        .select(`
            id,
            student_id,
            event_id,
            category_id,
            team_id,
            attendance_status,
            registered_at,
            student:users!individual_registrations_student_id_fkey(id, name, email, department_id, department:departments(name)),
            category:event_categories(id, category_name),
            team:teams(id, team_name)
        `)
        .eq('event_id', eventId)
        .order('registered_at')
    return data ?? []
}

export async function getAttendanceStats(eventId: string) {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('individual_registrations')
        .select('attendance_status')
        .eq('event_id', eventId)

    const rows = data as Array<{ attendance_status: 'present' | 'absent' | 'not_marked' }> ?? []
    return {
        present: rows.filter(r => r.attendance_status === 'present').length,
        absent: rows.filter(r => r.attendance_status === 'absent').length,
        notMarked: rows.filter(r => r.attendance_status === 'not_marked').length,
        total: rows.length,
    }
}
