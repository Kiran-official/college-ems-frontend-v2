'use server'

import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
const revalidate = { path: revalidatePath as any, tag: revalidateTag as any }
import { requireRole } from '@/lib/requireRole'

export async function createUserAction(data: {
    name: string
    email: string
    phone_number?: string
    role: 'admin' | 'teacher' | 'student'
    department_id?: string
    programme?: string
    semester?: number
    student_type?: 'internal' | 'external'
}): Promise<{ success: boolean; error?: string }> {
    try {
        await requireRole(['admin'])

        const admin = createAdminClient()
        
        // Check for existing phone number
        if (data.phone_number?.trim()) {
            const { data: existingPhone } = await admin.from('users')
                .select('email')
                .eq('phone_number', data.phone_number.trim())
                .maybeSingle()
            
            if (existingPhone) {
                return { success: false, error: `A user with this phone number already exists (${existingPhone.email})` }
            }
        }

        // Create auth user with temp password
        // Use phone number as password if provided, otherwise generate a temporary password
        const tempPassword = data.phone_number?.trim() || `SICM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
            email: data.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { display_name: data.name },
            app_metadata: { 
                role: data.role, 
                is_active: true, 
                must_change_password: true 
            }
        })

        if (authError) {
            if (authError.message.includes('already') || authError.message.includes('exists')) {
                return { success: false, error: 'A user with this email already exists' }
            }
            return { success: false, error: authError.message }
        }
        if (!authData.user) return { success: false, error: 'Failed to create user' }

        // Upsert user row (a DB trigger may have already inserted a bare-bones row)
        const { error: insertError } = await admin.from('users').upsert({
            id: authData.user.id,
            name: data.name,
            email: data.email,
            phone_number: data.phone_number || null,
            role: data.role,
            department_id: data.department_id || null,
            programme: data.programme ? data.programme.trim().toUpperCase() : null,
            semester: data.role === 'student' ? (data.semester ?? 1) : null,
            student_type: data.role === 'student' ? (data.student_type ?? 'internal') : null,
            must_change_password: true,
            is_active: true,
        }, { onConflict: 'id' })

        if (insertError) {
            await admin.auth.admin.deleteUser(authData.user.id)
            return { success: false, error: insertError.message }
        }

        revalidate.path('/admin/users')
        revalidate.tag('users')
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
        semester?: string
        student_type?: 'internal' | 'external'
    }>,
    role: 'teacher' | 'student' = 'student'
): Promise<{ created: number; skipped: number; errors: string[] }> {
    try {
        await requireRole(['admin'])
    } catch {
        return { created: 0, skipped: 0, errors: ['Not authenticated or not authorised'] }
    }

    const admin = createAdminClient()

    // Resolve department names to IDs
    const { data: departments } = await admin.from('departments').select('id, name')
    const deptMap = new Map((departments ?? []).map(d => [d.name.trim().toLowerCase(), d.id]))

    // Pre-fetch all auth users so we can find orphaned ones by email
    const authEmailToId = new Map<string, string>()
    let page = 1
    while (true) {
        const { data: listData, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
        if (listError || !listData?.users?.length) break
        for (const au of listData.users) {
            if (au.email) authEmailToId.set(au.email.toLowerCase(), au.id)
        }
        if (listData.users.length < 1000) break
        page++
    }

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const u of users) {
        try {
            const departmentId = u.department ? deptMap.get(u.department.trim().toLowerCase()) : undefined
            const emailLower = u.email.trim().toLowerCase()
            
            // Phone collision check
            if (u.phone_number?.trim()) {
                const { data: phoneMatch } = await admin.from('users').select('email').eq('phone_number', u.phone_number.trim()).maybeSingle()
                if (phoneMatch && phoneMatch.email.toLowerCase() !== emailLower) {
                    errors.push(`${u.email}: Phone number ${u.phone_number} already used by ${phoneMatch.email}`)
                    skipped++
                    continue
                }
            }

            // Use phone number as password if provided, otherwise generate a random temporary password
            const tempPassword = u.phone_number?.trim() || `SICM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

            // The user data to write into the public.users table
            const semesterVal = u.semester ? parseInt(u.semester, 10) : 1

            const userData = {
                name: u.name,
                email: u.email.trim(),
                phone_number: u.phone_number || null,
                role: role,
                department_id: departmentId || null,
                programme: role === 'student' ? (u.programme?.trim().toUpperCase() || null) : null,
                semester: role === 'student' ? (isNaN(semesterVal) ? 1 : semesterVal) : null,
                student_type: role === 'student' ? 'internal' : null,
                must_change_password: true,
                is_active: true,
            }

            // Check if auth user already exists (from the pre-fetched map)
            const existingAuthId = authEmailToId.get(emailLower)

            if (existingAuthId) {
                // Sync app_metadata before DB update
                const { error: metaError } = await admin.auth.admin.updateUserById(existingAuthId, {
                    password: tempPassword,
                    user_metadata: { display_name: u.name },
                    app_metadata: {
                        role: role,
                        is_active: true,
                        must_change_password: true
                    }
                })

                if (metaError) {
                    errors.push(`${u.email}: Failed to sync auth metadata: ${metaError.message}`)
                    continue
                }

                const { error: upsertError } = await admin.from('users').upsert(
                    { id: existingAuthId, ...userData },
                    { onConflict: 'id' }
                )

                if (upsertError) {
                    errors.push(`${u.email}: ${upsertError.message}`)
                    continue
                }

                created++
                continue
            }

            // No auth user exists — create a fresh one
            const { data: authData, error: authError } = await admin.auth.admin.createUser({
                email: u.email.trim(),
                password: tempPassword,
                email_confirm: true,
                user_metadata: { display_name: u.name },
                app_metadata: {
                    role: role,
                    is_active: true,
                    must_change_password: true
                }
            })

            if (authError) {
                errors.push(`${u.email}: ${authError.message}`)
                continue
            }

            if (!authData.user) {
                errors.push(`${u.email}: Failed to create auth user`)
                continue
            }

            // Upsert the users row (a DB trigger may have already inserted a bare-bones row)
            const { error: insertError } = await admin.from('users').upsert(
                { id: authData.user.id, ...userData },
                { onConflict: 'id' }
            )

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

    revalidate.path('/admin/users')
    revalidate.tag('users')
    return { created, skipped, errors }
}

export async function toggleUserActiveAction(
    userId: string,
    isActive: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireRole(['admin'])

        const admin = createAdminClient()
        
        // 1. Sync app_metadata first (Ordered Sync)
        const { error: authError } = await admin.auth.admin.updateUserById(userId, {
            app_metadata: { is_active: isActive }
        })
        if (authError) return { success: false, error: 'Auth sync failed: ' + authError.message }

        // 2. Update database
        const { error } = await admin.from('users').update({ is_active: isActive }).eq('id', userId)
        if (error) return { success: false, error: 'Database update failed: ' + error.message }

        revalidate.path('/admin/users')
        revalidate.tag('users')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function searchStudentsForInviteAction(
    query: string,
    excludeId: string
): Promise<{ id: string; name: string; email: string; programme?: string; semester?: number }[]> {
    try {
        const ssr = await createSSRClient()
        const { data: { user } } = await ssr.auth.getUser()
        if (!user) return []

        if (!query.trim() || query.trim().length < 2) return []

        const admin = createAdminClient()
        let queryBuilder = admin
            .from('users')
            .select('id, name, email, programme, semester')
            .eq('role', 'student')
            .eq('is_active', true)

        if (excludeId && excludeId.trim()) {
            queryBuilder = queryBuilder.neq('id', excludeId)
        }

        const { data, error } = await queryBuilder
            .or(`name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`)
            .order('name')
            .limit(8)

        if (error) {
            console.error('Student search error:', error)
            return []
        }

        return data ?? []
    } catch {
        return []
    }
}

export type UpdateUserInput = {
    name?: string;
    email?: string;
    phone_number?: string;
    role?: 'admin' | 'teacher' | 'student';
    student_type?: 'internal' | 'external' | null;
    active?: boolean;
    password?: string;
    department_id?: string;
    programme?: string;
    semester?: number;
}

export async function updateUserCredentials(
    userId: string,
    fields: UpdateUserInput
): Promise<{ success: boolean; error?: string }> {
    try {
        await requireRole(['admin'])

        const admin = createAdminClient()

        // Build forced app_metadata sync object
        const metaUpdate: Record<string, any> = {}
        if (fields.role !== undefined) metaUpdate.role = fields.role;
        if (fields.active !== undefined) metaUpdate.is_active = fields.active;
        // (Note: we don't have must_change_password in the fields input here usually, 
        // but if we did we'd sync it too)

        const authUpdate: any = {}
        if (fields.email !== undefined) authUpdate.email = fields.email;
        if (fields.password) authUpdate.password = fields.password;
        if (Object.keys(metaUpdate).length > 0) authUpdate.app_metadata = metaUpdate;

        if (Object.keys(authUpdate).length > 0) {
            // Ordered Sync: Auth first
            const { error } = await admin.auth.admin.updateUserById(userId, authUpdate)
            if (error) return { success: false, error: 'Auth sync failed: ' + error.message }
        }

        // Update public.users
        const dbUpdate: Record<string, any> = {}
        if (fields.name !== undefined) dbUpdate.name = fields.name;
        if (fields.email !== undefined) dbUpdate.email = fields.email;
        if (fields.role !== undefined) dbUpdate.role = fields.role;
        if (fields.phone_number !== undefined) dbUpdate.phone_number = fields.phone_number || null;
        if (fields.student_type !== undefined) dbUpdate.student_type = fields.student_type;
        if (fields.active !== undefined) dbUpdate.is_active = fields.active;
        if (fields.department_id !== undefined) dbUpdate.department_id = fields.department_id || null;
        if (fields.programme !== undefined) dbUpdate.programme = fields.programme || null;
        if (fields.semester !== undefined) dbUpdate.semester = fields.semester || null;

        if (Object.keys(dbUpdate).length > 0) {
            const { error } = await admin.from('users').update(dbUpdate).eq('id', userId)
            if (error) return { success: false, error: error.message }
        }

        revalidate.path('/admin/users')
        revalidate.tag('users')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}