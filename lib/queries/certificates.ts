import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import type { Certificate } from '@/lib/types/db'

export async function getCertificatesByEvent(eventId: string): Promise<Certificate[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('certificates')
        .select(`
            id, student_id, event_id, certificate_type, status, retry_count, generated_at, created_at,
            student:users!certificates_student_id_fkey(id, name, email),
            event:events(id, title),
            winner:winners(id, position_label, tags)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
    return (data as unknown as Certificate[]) ?? []
}

export const getCertificatesByStudent = unstable_cache(
    async (studentId: string): Promise<Certificate[]> => {
        const supabase = await createSSRClient()
        const { data } = await supabase
            .from('certificates')
            .select(`
                id, student_id, event_id, certificate_type, status, retry_count, generated_at, created_at, certificate_url,
                event:events(id, title),
                winner:winners(id, position_label)
            `)
            .eq('student_id', studentId)
            .eq('status', 'generated')
            .order('generated_at', { ascending: false })
        return (data as unknown as Certificate[]) ?? []
    },
    ['student-certificates'],
    { revalidate: 60, tags: ['certificates'] }
)

export const getAllCertificates = unstable_cache(
    async (): Promise<Certificate[]> => {
        const supabase = await createSSRClient()
        const { data } = await supabase
            .from('certificates')
            .select(`
                id, student_id, event_id, certificate_type, status, retry_count, created_at,
                student:users!certificates_student_id_fkey(id, name, email),
                event:events(id, title)
            `)
            .order('created_at', { ascending: false })
        return (data as unknown as Certificate[]) ?? []
    },
    ['all-certificates'],
    { revalidate: 60, tags: ['certificates'] }
)

export const getCertificateStats = unstable_cache(
    async () => {
        const supabase = createAdminClient()
        
        // Instead of fetching all rows and filtering in JS (O(N) data transfer),
        // use parallel COUNT aggregate queries (O(1) data transfer).
        const [pending, processing, generated, failed, total] = await Promise.all([
            supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
            supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('status', 'generated'),
            supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
            supabase.from('certificates').select('*', { count: 'exact', head: true }),
        ])

        return {
            pending: pending.count ?? 0,
            processing: processing.count ?? 0,
            generated: generated.count ?? 0,
            failed: failed.count ?? 0,
            total: total.count ?? 0,
        }
    },
    ['certificate-stats'],
    { revalidate: 60, tags: ['certificates'] }
)

export async function getCertificateStatsByEvent(eventId: string) {
    const supabase = await createSSRClient()
    
    const [pending, processing, generated, failed, total] = await Promise.all([
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'pending'),
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'processing'),
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'generated'),
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('status', 'failed'),
        supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
    ])

    return {
        pending: pending.count ?? 0,
        processing: processing.count ?? 0,
        generated: generated.count ?? 0,
        failed: failed.count ?? 0,
        total: total.count ?? 0,
    }
}

export async function getStudentCertificateCount(studentId: string): Promise<number> {
    const supabase = await createSSRClient()
    const { count } = await supabase
        .from('certificates')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'generated')
    return count ?? 0
}

export async function getTemplatesByEvent(eventId: string): Promise<any[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_active', true)
    return data ?? []
}
