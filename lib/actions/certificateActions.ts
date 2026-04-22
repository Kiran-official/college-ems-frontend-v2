'use server'

import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { TemplateLayout } from '@/lib/types/db'
import { issueEventCertificates } from '@/lib/certificates'
import { processPendingCertificates } from '@/lib/processing'

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
                file_path: null,
                storage_path: null,
                generated_at: null,
                retry_count: 0,
                last_retried_at: new Date().toISOString(),
            })
            .eq('id', certificateId)
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/certificates')
        revalidatePath('/teacher/certificates')
        revalidateTag('certificates')
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
        if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
            return { success: false, error: 'Not authorised' }
        }

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
                file_path: null,
                storage_path: null,
                generated_at: null,
                retry_count: 0,
                last_retried_at: new Date().toISOString(),
            })
            .eq('status', 'failed')
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/certificates')
        revalidateTag('certificates')
        return { success: true, count: failed.length }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function triggerCertificateProcessingAction(): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        // Directly call the processing logic instead of using fetch
        await processPendingCertificates()

        return { success: true }
    } catch (e) {
        console.error('[triggerCertificateProcessingAction] crash:', e)
        return { success: false, error: e instanceof Error ? e.message : 'Failed to trigger certificate processing' }
    }
}

export async function createTemplateAction(data: {
    event_id?: string
    is_global?: boolean
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
            is_active: true,
            created_by: user.id,
        }).select('id').single()

        if (error || !template) return { success: false, error: error?.message ?? 'Failed to create template' }

        revalidatePath('/admin/templates')
        revalidatePath('/teacher/templates')
        revalidateTag('certificates')
        revalidateTag('events')
        return { success: true, template_id: template.id }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function updateTemplateAction(
    templateId: string,
    data: {
        template_name?: string
        event_id?: string
        is_global?: boolean
        layout_json?: TemplateLayout
        background_image_url?: string
        is_active?: boolean
        certificate_type?: 'participation' | 'winner'
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
        revalidateTag('certificates')
        revalidateTag('events')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function deleteTemplateAction(
    templateId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // Check if any certificates have been generated with this template
        const { data: template } = await admin
            .from('certificate_templates')
            .select('event_id')
            .eq('id', templateId)
            .single()

        if (template?.event_id) {
            const { count } = await admin
                .from('certificates')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', template.event_id)

            if (count && count > 0) {
                // Soft-delete: keep the template data for existing certificates
                const { error } = await admin
                    .from('certificate_templates')
                    .update({ is_active: false })
                    .eq('id', templateId)
                if (error) return { success: false, error: error.message }
            } else {
                // Hard delete if no certificates reference this event
                const { error } = await admin
                    .from('certificate_templates')
                    .delete()
                    .eq('id', templateId)
                if (error) return { success: false, error: error.message }
            }
        } else {
            // Global template or no event — hard delete
            const { error } = await admin
                .from('certificate_templates')
                .delete()
                .eq('id', templateId)
            if (error) return { success: false, error: error.message }
        }

        revalidatePath('/admin/templates')
        revalidatePath('/teacher/templates')
        revalidateTag('certificates')
        revalidateTag('events')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function cloneTemplateAction(sourceTemplateId: string, targetEventId: string, targetType?: 'participation' | 'winner'): Promise<{ success: boolean; template_id?: string; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()
        const { data: source, error: fetchErr } = await admin.from('certificate_templates').select('*').eq('id', sourceTemplateId).single()
        if (fetchErr || !source) return { success: false, error: 'Source template not found' }

        const { data: cloned, error: insertErr } = await admin.from('certificate_templates').insert({
            event_id: targetEventId,
            is_global: false,
            template_name: `${source.template_name} (Clone)`,
            certificate_type: targetType || source.certificate_type,
            layout_json: source.layout_json,
            background_image_url: source.background_image_url,
            is_active: true,
            created_by: user.id
        }).select('id').single()

        if (insertErr || !cloned) return { success: false, error: insertErr?.message || 'Failed to clone' }

        revalidatePath('/admin/templates')
        revalidatePath('/teacher/templates')
        revalidateTag('certificates')
        revalidateTag('events')
        return { success: true, template_id: cloned.id }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function uploadTemplateBackgroundAction(
    formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated. Please log in.' }

        const file = formData.get('file') as File | null
        if (!file || !(file instanceof Blob)) {
            return { success: false, error: 'Invalid file provided.' }
        }

        const admin = createAdminClient()

        // Ensure bucket exists
        const { data: buckets } = await admin.storage.listBuckets()
        if (!buckets?.find(b => b.name === 'certificate-templates')) {
            const { error: createError } = await admin.storage.createBucket('certificate-templates', {
                public: true,
                fileSizeLimit: 6242880, // 6MB
            })
            if (createError) {
                console.error('Bucket Creation Error:', createError)
                return { success: false, error: 'Storage bucket not initialized. Please contact admin.' }
            }
        }

        const fileExt = file.name ? file.name.split('.').pop() : 'png'
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        const filePath = `backgrounds/${fileName}`

        const { error: uploadError } = await admin.storage
            .from('certificate-templates')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: true
            })

        if (uploadError) {
            console.error('Supabase Upload Error:', uploadError)
            return { success: false, error: `Upload failed: ${uploadError.message}` }
        }

        const { data: urlData } = admin.storage
            .from('certificate-templates')
            .getPublicUrl(filePath)

        return { success: true, url: urlData.publicUrl }
    } catch (err) {
        console.error('Upload Action Crash:', err)
        return { success: false, error: err instanceof Error ? err.message : 'An error occurred during upload' }
    }
}

export async function syncEventCertificatesAction(eventId: string): Promise<{ success: boolean; queued?: number; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const admin = createAdminClient()

        // 2. Execute
        const certResult = await issueEventCertificates(admin, eventId)
        if (!certResult.success) {
            return { success: false, error: certResult.error }
        }

        if (certResult.queued > 0) {
            // Trigger background processing
            await triggerCertificateProcessingAction()
        }

        revalidatePath(`/admin/events/${eventId}`)
        revalidatePath(`/teacher/events/${eventId}`)
        revalidatePath('/admin/certificates')
        revalidatePath('/teacher/certificates')

        return { success: true, queued: certResult.queued }
    } catch (e) {
        console.error('[syncEventCertificatesAction] error:', e)
        return { success: false, error: 'An unexpected error occurred' }
    }
}
