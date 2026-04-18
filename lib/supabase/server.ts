import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types/db'

// SSR client — uses anon key + cookie session — for Server Components and Server Actions (reads)
export async function createSSRClient() {
    const cookieStore = await cookies()
    return createServerClient<Database>(
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

