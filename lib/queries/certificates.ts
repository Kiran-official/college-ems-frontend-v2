import { createSSRClient } from '@/lib/supabase/server'
import type { Certificate } from '@/lib/types/db'

export async function getCertificatesByEvent(eventId: string): Promise<Certificate[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('certificates')
        .select(`
            *,
            student:users!certificates_student_id_fkey(id, name, email),
            event:events(id, title),
            category:event_categories(id, category_name),
            winner:winners(id, position_label, tags)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
    return data ?? []
}

export async function getCertificatesByStudent(studentId: string): Promise<Certificate[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('certificates')
        .select(`
            *,
            event:events(id, title),
            category:event_categories(id, category_name),
            winner:winners(id, position_label)
        `)
        .eq('student_id', studentId)
        .eq('status', 'generated')
        .order('generated_at', { ascending: false })
    return data ?? []
}

export async function getAllCertificates(): Promise<Certificate[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('certificates')
        .select(`
            *,
            student:users!certificates_student_id_fkey(id, name, email),
            event:events(id, title),
            category:event_categories(id, category_name)
        `)
        .order('created_at', { ascending: false })
    return data ?? []
}

export async function getCertificateStats() {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('certificates')
        .select('status')

<<<<<<< HEAD
    const rows = data ?? []
=======
    const rows = data as Array<{ status: 'pending' | 'processing' | 'generated' | 'failed' }> ?? []
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
    return {
        pending: rows.filter(r => r.status === 'pending').length,
        processing: rows.filter(r => r.status === 'processing').length,
        generated: rows.filter(r => r.status === 'generated').length,
        failed: rows.filter(r => r.status === 'failed').length,
        total: rows.length,
    }
}

export async function getCertificateStatsByEvent(eventId: string) {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('certificates')
        .select('status')
        .eq('event_id', eventId)

<<<<<<< HEAD
    const rows = data ?? []
=======
    const rows = data as Array<{ status: 'pending' | 'processing' | 'generated' | 'failed' }> ?? []
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
    return {
        pending: rows.filter(r => r.status === 'pending').length,
        processing: rows.filter(r => r.status === 'processing').length,
        generated: rows.filter(r => r.status === 'generated').length,
        failed: rows.filter(r => r.status === 'failed').length,
        total: rows.length,
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
