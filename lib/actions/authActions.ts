'use server'

import { createAdminClient, createSSRClient } from '@/lib/supabase/server'

export async function clearMustChangePasswordAction(): Promise<{ success: boolean; error?: string }> {
    try {
        // Get the current user from the session
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        // Use admin client to bypass RLS
        const admin = createAdminClient()
        const { error } = await admin.from('users')
            .update({ must_change_password: false })
            .eq('id', user.id)

        if (error) return { success: false, error: error.message }
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function registerStudentAction(data: {
    name: string
    email: string
    phone_number?: string
    password: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const admin = createAdminClient()

        // Create auth user
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true,
        })

        if (authError) {
            const msg = authError.message.toLowerCase()
            if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('email address is already')) {
                return { success: false, error: 'An account with this email already exists. Sign in instead.' }
            }
            return { success: false, error: authError.message }
        }

        if (!authData.user) {
            return { success: false, error: 'Failed to create user' }
        }

        // Upsert into users table (handles cases where auth user already exists)
        const { error: insertError } = await admin.from('users').upsert({
            id: authData.user.id,
            name: data.name,
            email: data.email,
            phone_number: data.phone_number || null,
            role: 'student',
            student_type: 'external',
            must_change_password: false,
            is_active: true,
        }, { onConflict: 'id' })

        if (insertError) {
            // Rollback: delete auth user
            await admin.auth.admin.deleteUser(authData.user.id)
            return { success: false, error: insertError.message }
        }

        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}
