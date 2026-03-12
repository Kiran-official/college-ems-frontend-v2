import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Admin client — uses service role key — for Server Actions (mutations) ONLY
// NEVER use this in a Server Component
export function createAdminClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}
