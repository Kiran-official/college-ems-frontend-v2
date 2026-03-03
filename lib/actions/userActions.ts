'use server'

import { createAdminClient, createSSRClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createUserAction(data: {
    name: string
    email: string
    phone_number?: string
    role: 'admin' | 'teacher' | 'student'
    department_id?: string
    programme?: string
    student_type?: 'internal' | 'external'
}): Promise<{ success: boolean; error?: string }> {
    try {
        // Auth check
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') return { success: false, error: 'Not authorised' }

        const admin = createAdminClient()

        // Create auth user with temp password
        const tempPassword = `SICM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
            email: data.email,
            password: tempPassword,
            email_confirm: true,
        })

        if (authError) {
            if (authError.message.includes('already') || authError.message.includes('exists')) {
                return { success: false, error: 'A user with this email already exists' }
            }
            return { success: false, error: authError.message }
        }
        if (!authData.user) return { success: false, error: 'Failed to create user' }

        // Insert user row
        const { error: insertError } = await admin.from('users').insert({
            id: authData.user.id,
            name: data.name,
            email: data.email,
            phone_number: data.phone_number || null,
            role: data.role,
            department_id: data.department_id || null,
            programme: data.programme || null,
            student_type: data.role === 'student' ? (data.student_type ?? 'internal') : undefined,
            must_change_password: true,
            is_active: true,
        })

        if (insertError) {
            await admin.auth.admin.deleteUser(authData.user.id)
            return { success: false, error: insertError.message }
        }

        revalidatePath('/admin/users')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function bulkCreateUsersAction(
    users: Array<{
        name: string
        email: string
        phone_number?: string
        role?: 'teacher' | 'student'
        department?: string
        programme?: string
        student_type?: 'internal' | 'external'
    }>,
    role: 'teacher' | 'student' = 'student'
): Promise<{ created: number; skipped: number; errors: string[] }> {
    // Auth check
    const ssr = await createSSRClient()
    const { data: { user } } = await ssr.auth.getUser()
    if (!user) return { created: 0, skipped: 0, errors: ['Not authenticated'] }

    const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') return { created: 0, skipped: 0, errors: ['Not authorised'] }

    const admin = createAdminClient()

    // Resolve department names to IDs
    const { data: departments } = await admin.from('departments').select('id, name')
    const deptMap = new Map((departments ?? []).map(d => [d.name, d.id]))

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const u of users) {
        try {
            const tempPassword = `SICM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
            const { data: authData, error: authError } = await admin.auth.admin.createUser({
                email: u.email,
                password: tempPassword,
                email_confirm: true,
            })

            if (authError) {
                if (authError.message.includes('already') || authError.message.includes('exists')) {
                    skipped++
                    continue
                }
                errors.push(`${u.email}: ${authError.message}`)
                continue
            }

            if (!authData.user) {
                errors.push(`${u.email}: Failed to create auth user`)
                continue
            }

            const departmentId = u.department ? deptMap.get(u.department) : undefined

            const { error: insertError } = await admin.from('users').insert({
                id: authData.user.id,
                name: u.name,
                email: u.email,
                phone_number: u.phone_number || null,
                role: role,
                department_id: departmentId || null,
                programme: role === 'student' ? (u.programme || null) : null,
                student_type: role === 'student' ? 'internal' : undefined,
                must_change_password: true,
                is_active: true,
            })

            if (insertError) {
                await admin.auth.admin.deleteUser(authData.user.id)
                errors.push(`${u.email}: ${insertError.message}`)
                continue
            }

            created++
        } catch (err) {
            errors.push(`${u.email}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
    }

    revalidatePath('/admin/users')
    return { created, skipped, errors }
}

export async function toggleUserActiveAction(
    userId: string,
    isActive: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return { success: false, error: 'Not authenticated' }

        const { data: profile } = await ssr.from('users').select('role').eq('id', user.id).single()
        if (!profile || profile.role !== 'admin') return { success: false, error: 'Not authorised' }

        const admin = createAdminClient()
        const { error } = await admin.from('users').update({ is_active: isActive }).eq('id', userId)
        if (error) return { success: false, error: error.message }

        revalidatePath('/admin/users')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}
