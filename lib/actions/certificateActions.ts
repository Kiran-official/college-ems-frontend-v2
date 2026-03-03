'use server'

import { createAdminClient, createSSRClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TemplateLayout } from '@/lib/types/db'

export async function retryCertificateAction(
    certificateId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { error } = await admin
            .from('certificates')
            .update({
                status: 'pending',
                error_message: null,
                retry_count: 0,
                last_retried_at: new Date().toISOString(),
            })
            .eq('id', certificateId)
            .eq('status', 'failed')
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/certificates')
        revalidatePath('/teacher/certificates')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function retryAllFailedCertificatesAction(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') return { success: false, error: 'Not authorised' }

        const admin = createAdminClient()
        const { data: failed } = await admin
            .from('certificates')
            .select('id')
            .eq('status', 'failed')

        if (!failed || failed.length === 0) return { success: true, count: 0 }

        const { error } = await admin
            .from('certificates')
            .update({
                status: 'pending',
                error_message: null,
                retry_count: 0,
                last_retried_at: new Date().toISOString(),
            })
            .eq('status', 'failed')
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/certificates')
        return { success: true, count: failed.length }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function createTemplateAction(data: {
    event_id: string
    category_id?: string
    template_name: string
    certificate_type: 'participation' | 'winner'
    layout_json: TemplateLayout
    background_image_url?: string
}): Promise<{ success: boolean; template_id?: string; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { data: template, error } = await admin.from('certificate_templates').insert({
            ...data,
            category_id: data.category_id || null,
            is_active: true,
            created_by: user.id,
        }).select('id').single()

        if (error || !template) return { success: false, error: error?.message ?? 'Failed to create template' }

        revalidatePath('/admin/templates')
        revalidatePath('/teacher/templates')
        return { success: true, template_id: template.id }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function updateTemplateAction(
    templateId: string,
    data: {
        template_name?: string
        layout_json?: TemplateLayout
        background_image_url?: string
        is_active?: boolean
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { error } = await admin.from('certificate_templates').update(data).eq('id', templateId)
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/templates')
        revalidatePath('/teacher/templates')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}
