'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'

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
                    const nextSem = (s.semester ?? 1) + 1
                    // If semester > 6, they are no longer active students
                    await admin.from('users')
                        .update({ 
                            semester: nextSem,
                            is_active: nextSem <= 6
                        })
                        .eq('id', s.id)
                }
            }
        }
        revalidatePath('/admin/users')
        revalidateTag('users', 'max')
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

        if (students) {
            for (const s of students) {
                const newSem = Math.max(1, (s.semester ?? 1) - 1)
                // When decrementing, we might want to reactive users who were just deactivated at 7? 
                // Let's keep it simple: just decrement the value.
                await admin.from('users')
                    .update({ semester: newSem })
                    .eq('id', s.id)
            }
        }
        revalidatePath('/admin/users')
        revalidateTag('users', 'max')
        return { success: true }
    } catch {
        return { success: false, error: 'An unexpected error occurred' }
    }
}
