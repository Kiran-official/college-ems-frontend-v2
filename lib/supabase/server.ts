import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/db'

// SSR client — uses anon key + cookie session — for Server Components and Server Actions (reads)
export async function createSSRClient() {
    const cookieStore = await cookies()
<<<<<<< HEAD
    return createServerClient<Database>(
=======
    return createServerClient(
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
                    try {
                        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Ignore — called from Server Component where we can't set cookies
                    }
                },
            },
        }
    )
}

// Admin client — uses service role key — for Server Actions (mutations) ONLY
// NEVER use this in a Server Component
export function createAdminClient() {
<<<<<<< HEAD
    return createSupabaseClient<Database>(
=======
    return createSupabaseClient(
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}
