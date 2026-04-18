import { createSSRClient } from '@/lib/supabase/server'
import type { CertificateTemplate } from '@/lib/types/db'

export async function getAllTemplates(): Promise<CertificateTemplate[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('certificate_templates')
        .select(`
            *,
            event:events(id, title),
            creator:users!certificate_templates_created_by_fkey(id, name, email)
        `)
        .order('created_at', { ascending: false })
    return data ?? []
}

export async function getTemplatesByCreator(userId: string): Promise<CertificateTemplate[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('certificate_templates')
        .select(`
            *,
            event:events(id, title),
            creator:users!certificate_templates_created_by_fkey(id, name, email)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
    return data ?? []
}

export async function getTemplateById(id: string): Promise<CertificateTemplate | null> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('certificate_templates')
        .select(`
            *,
            event:events(id, title),
            creator:users!certificate_templates_created_by_fkey(id, name, email)
        `)
        .eq('id', id)
        .single()
    return data
}

export async function getGlobalTemplates(): Promise<CertificateTemplate[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('certificate_templates')
        .select(`
            *,
            event:events(id, title),
            creator:users!certificate_templates_created_by_fkey(id, name, email)
        `)
        .eq('is_global', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    return data ?? []
}

