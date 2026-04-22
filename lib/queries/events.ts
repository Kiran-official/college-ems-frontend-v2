import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import type { Event } from '@/lib/types/db'

const EVENT_LIST_SELECT = `
    id, title, event_date, registration_deadline, status, is_active, forum, visibility, participant_type, team_size,
    results_published, created_by, created_at, is_paid,
    department:departments(id, name)
`

const EVENT_DETAIL_SELECT = `
    *,
    department:departments(id, name),
    creator:users!events_created_by_fkey(id, name, email, role),
    faculty_in_charge:faculty_in_charge!faculty_in_charge_event_id_fkey(*, teacher:users!fic_teacher_fkey(id, name, email))
`

export const getAllEvents = unstable_cache(
    async (): Promise<Event[]> => {
        const supabase = createAdminClient()
        const { data } = await supabase
            .from('events')
            .select(EVENT_LIST_SELECT)
            .order('created_at', { ascending: false })
        return (data as unknown as Event[]) ?? []
    },
    ['all-events'],
    { revalidate: 60, tags: ['events'] }
)

export const getActiveEvents = unstable_cache(
    async (): Promise<Event[]> => {
        const supabase = createAdminClient()
        const { data } = await supabase
            .from('events')
            .select(EVENT_LIST_SELECT)
            .eq('is_active', true)
            .order('event_date', { ascending: true })
        return (data as unknown as Event[]) ?? []
    },
    ['active-events'],
    { revalidate: 60, tags: ['events'] }
)

export async function getEventById(id: string): Promise<Event | null> {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('events')
        .select(EVENT_DETAIL_SELECT)
        .eq('id', id)
        .single()
    return data as unknown as Event
}

export async function getEventsByCreator(userId: string): Promise<Event[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('events')
        .select(EVENT_LIST_SELECT)
        .eq('created_by', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    return (data as unknown as Event[]) ?? []
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
        .select(EVENT_LIST_SELECT)
        .in('id', eventIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    return (data as unknown as Event[]) ?? []
}

// Student-facing queries

// Cache for 60 seconds. Removed mutating autoClosePastEventsAction().
// Also dynamically filters out closed events based on registration_deadline in the query itself.
export const getUpcomingEvents = unstable_cache(
    async (): Promise<Event[]> => {
        const supabase = createAdminClient();
        const now = new Date().toISOString();
        const { data } = await supabase
            .from('events')
            .select(EVENT_LIST_SELECT)
            .eq('status', 'open')
            .eq('is_active', true)
            .gte('registration_deadline', now)
            .order('event_date', { ascending: true });
        return (data as unknown as Event[]) ?? [];
    },
    ['upcoming-events'],
    { revalidate: 60, tags: ['events'] }
);

export const getCompletedEvents = unstable_cache(
    async (): Promise<Event[]> => {
        const supabase = createAdminClient()
        const { data } = await supabase
            .from('events')
            .select(EVENT_LIST_SELECT)
            .eq('status', 'completed')
            .eq('is_active', true)
            .order('event_date', { ascending: false })
        return (data as unknown as Event[]) ?? []
    },
    ['completed-events'],
    { revalidate: 60, tags: ['events'] }
);

export const getClosedEvents = unstable_cache(
    async (): Promise<Event[]> => {
        const supabase = createAdminClient()
        const now = new Date().toISOString();
        const { data } = await supabase
            .from('events')
            .select(EVENT_LIST_SELECT)
            .eq('is_active', true)
            // Get events that are explicitly closed OR their deadline has passed
            .or(`status.eq.closed,and(status.eq.open,registration_deadline.lt.${now})`)
            .order('event_date', { ascending: false })
        return (data as unknown as Event[]) ?? []
    },
    ['closed-events'],
    { revalidate: 60, tags: ['events'] }
);

export const getUpcomingEventsCount = unstable_cache(
    async (): Promise<number> => {
        const supabase = createAdminClient()
        const now = new Date().toISOString();
        const { count } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'open')
            .eq('is_active', true)
            .gte('registration_deadline', now)
        return count ?? 0
    },
    ['upcoming-events-count'],
    { revalidate: 60, tags: ['events'] }
);

export const getEventStats = unstable_cache(
    async () => {
        const supabase = createAdminClient()
        const [{ count: totalEvents }, { count: activeEvents }] = await Promise.all([
            supabase
                .from('events')
                .select('*', { count: 'exact', head: true }),
            supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .in('status', ['open', 'closed'])
                .eq('is_active', true),
        ])

        return {
            totalEvents: totalEvents ?? 0,
            activeEvents: activeEvents ?? 0,
        }
    },
    ['event-stats'],
    { revalidate: 60, tags: ['events'] }
)

export async function getTeacherEventStats(teacherId: string) {
    const supabase = await createSSRClient()
    const { data: ficRows } = await supabase
        .from('faculty_in_charge')
        .select('event_id')
        .eq('teacher_id', teacherId)
    const eventIds = [...new Set(ficRows?.map(r => r.event_id) ?? [])]
    if (eventIds.length === 0) return { myEvents: 0, activeEvents: 0, completedEvents: 0 }

    const [{ count: myEvents }, { count: activeEvents }, { count: completedEvents }] = await Promise.all([
        supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .in('id', eventIds)
            .eq('is_active', true),
        supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .in('id', eventIds)
            .in('status', ['open', 'closed'])
            .eq('is_active', true),
        supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .in('id', eventIds)
            .eq('status', 'completed')
            .eq('is_active', true),
    ])

    return {
        myEvents: myEvents ?? 0,
        activeEvents: activeEvents ?? 0,
        completedEvents: completedEvents ?? 0,
    }
}
