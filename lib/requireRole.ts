import { createSSRClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types/db'

/**
 * Shared authorization utility for Server Actions.
 *
 * 1. Authenticates the caller via Supabase JWT (getUser)
 * 2. Reads `role` from app_metadata (no DB hit in the happy path)
 * 3. Falls back to a DB lookup if app_metadata is missing (legacy sessions)
 * 4. Throws if the caller is unauthenticated or lacks an allowed role
 *
 * Usage:
 *   const { userId, role } = await requireRole(['admin', 'teacher'])
 */
export async function requireRole(
    allowedRoles: UserRole[]
): Promise<{ userId: string; role: UserRole }> {
    const ssr = await createSSRClient()
    const { data: { user } } = await ssr.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Fast path: check app_metadata (admin-controlled, no DB round-trip)
    let role = user.app_metadata?.role as UserRole | undefined

    // Fallback: check DB if metadata is missing (old sessions before migration)
    if (!role) {
        const { data: profile } = await ssr
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
        role = profile?.role as UserRole | undefined
    }

    if (!role || !allowedRoles.includes(role)) {
        throw new Error('Not authorised')
    }

    return { userId: user.id, role }
}
