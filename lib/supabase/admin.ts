import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Singleton admin client — reused across all server-side calls in the same process
// Uses service role key — for Server Actions (mutations) ONLY
// NEVER use this in a Server Component for reads that should respect RLS
let adminClient: ReturnType<typeof createSupabaseClient<any>> | null = null

export function createAdminClient() {
    if (!adminClient) {
        adminClient = createSupabaseClient<any>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: { autoRefreshToken: false, persistSession: false },
                db: { schema: 'public' },
                global: {
                    headers: { 'x-connection-pool': 'true' },
                },
            }
        )
    }
    return adminClient
}
