'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function incrementSemesterAction(): Promise<{ success: boolean; error?: string }> {
    try {
        const admin = createAdminClient()
        // Increment semester by 1 for all active students
        const { error } = await admin.rpc('increment_semester')
        if (error) {
            // Fallback: manually update if RPC doesn't exist
            const { data: students } = await admin.from('users')
                .select('id, semester')
                .eq('role', 'student')
                .eq('is_active', true)

            if (students) {
                for (const s of students) {
                    await admin.from('users')
                        .update({ semester: (s.semester ?? 1) + 1 })
                        .eq('id', s.id)
                }
            }
        }
        revalidatePath('/admin/users')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}

export async function decrementSemesterAction(): Promise<{ success: boolean; error?: string }> {
    try {
        const admin = createAdminClient()
        const { data: students } = await admin.from('users')
            .select('id, semester')
            .eq('role', 'student')
            .eq('is_active', true)

        if (students) {
            for (const s of students) {
                const newSem = Math.max(1, (s.semester ?? 1) - 1)
                await admin.from('users')
                    .update({ semester: newSem })
                    .eq('id', s.id)
            }
        }
        revalidatePath('/admin/users')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}
