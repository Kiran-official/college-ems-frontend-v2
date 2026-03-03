'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function registerStudentAction(data: {
    name: string
    email: string
    phone_number?: string
    password: string
    date_of_birth?: string
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
            if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
                return { success: false, error: 'An account with this email already exists. Sign in instead.' }
            }
            return { success: false, error: authError.message }
        }

        if (!authData.user) {
            return { success: false, error: 'Failed to create user' }
        }

        // Insert into users table
        const { error: insertError } = await admin.from('users').insert({
            id: authData.user.id,
            name: data.name,
            email: data.email,
            phone_number: data.phone_number || null,
            role: 'student',
            student_type: 'external',
            must_change_password: false,
            is_active: true,
            date_of_birth: data.date_of_birth || null,
        })

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
