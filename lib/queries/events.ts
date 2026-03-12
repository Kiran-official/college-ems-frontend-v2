import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { autoClosePastEventsAction } from '@/lib/actions/eventActions';
import type { Event } from '@/lib/types/db'

const EVENT_SELECT = `
    *,
    department:departments(*),
    creator:users!events_created_by_fkey(id, name, email, role),
    faculty_in_charge:faculty_in_charge!faculty_in_charge_event_id_fkey(*, teacher:users!fic_teacher_fkey(id, name, email))
`

export async function getAllEvents(): Promise<Event[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('events')
        .select(EVENT_SELECT)
        .order('created_at', { ascending: false })
    return data ?? []
}

export async function getActiveEvents(): Promise<Event[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('events')
        .select(EVENT_SELECT)
        .eq('is_active', true)
        .order('event_date', { ascending: true })
    return data ?? []
}

export async function getEventById(id: string): Promise<Event | null> {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('events')
        .select(EVENT_SELECT)
        .eq('id', id)
        .single()
    return data
}

export async function getEventsByCreator(userId: string): Promise<Event[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('events')
        .select(EVENT_SELECT)
        .eq('created_by', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    return data ?? []
}

export async function getTeacherEvents(teacherId: string): Promise<Event[]> {
    const supabase = await createSSRClient()
    // Get event IDs where teacher is faculty in charge
    const { data: ficRows } = await supabase
        .from('faculty_in_charge')
        .select('event_id')
        .eq('teacher_id', teacherId)

    const eventIds = [...new Set(ficRows?.map(r => r.event_id) ?? [])]
    if (eventIds.length === 0) return []

    const { data } = await supabase
        .from('events')
        .select(EVENT_SELECT)
        .in('id', eventIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    return data ?? []
}

// Student-facing queries
export async function getUpcomingEvents(): Promise<Event[]> {
    // Auto-close events whose registration deadline has passed
    await autoClosePastEventsAction();
    const supabase = await createSSRClient();
    const { data } = await supabase
        .from('events')
        .select(EVENT_SELECT)
        .eq('status', 'open')
        .eq('is_active', true)
        .order('event_date', { ascending: true });
    return data ?? [];
}

export async function getCompletedEvents(): Promise<Event[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('events')
        .select(EVENT_SELECT)
        .eq('status', 'completed')
        .eq('is_active', true)
        .order('event_date', { ascending: false })
    return data ?? []
}

export async function getClosedEvents(): Promise<Event[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('events')
        .select(EVENT_SELECT)
        .eq('status', 'closed')
        .eq('is_active', true)
        .order('event_date', { ascending: false })
    return data ?? []
}

export async function getEventStats() {
    const supabase = await createSSRClient()
    const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
    const { count: activeEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'closed'])
        .eq('is_active', true)

    return {
        totalEvents: totalEvents ?? 0,
        activeEvents: activeEvents ?? 0,
    }
}

export async function getTeacherEventStats(teacherId: string) {
    const supabase = await createSSRClient()
    const { data: ficRows } = await supabase
        .from('faculty_in_charge')
        .select('event_id')
        .eq('teacher_id', teacherId)
    const eventIds = [...new Set(ficRows?.map(r => r.event_id) ?? [])]
    if (eventIds.length === 0) return { myEvents: 0, activeEvents: 0, completedEvents: 0 }

    const { count: myEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('id', eventIds)
        .eq('is_active', true)
    const { count: activeEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('id', eventIds)
        .in('status', ['open', 'closed'])
        .eq('is_active', true)
    const { count: completedEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('id', eventIds)
        .eq('status', 'completed')
        .eq('is_active', true)

    return {
        myEvents: myEvents ?? 0,
        activeEvents: activeEvents ?? 0,
        completedEvents: completedEvents ?? 0,
    }
}

export async function getUpcomingEventsCount(): Promise<number> {
    const supabase = await createSSRClient()
    const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .eq('is_active', true)
    return count ?? 0
}
