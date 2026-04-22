import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Department } from '@/lib/types/db'

import { unstable_cache } from 'next/cache'

export const getDepartments = unstable_cache(
    async (): Promise<Department[]> => {
        const supabase = createAdminClient()
        const { data } = await supabase
            .from('departments')
            .select('id, name, is_active, created_at')
            .eq('is_active', true)
            .order('name')
        return (data as unknown as Department[]) ?? []
    },
    ['all-departments'],
    { revalidate: 300, tags: ['departments'] }
)

export async function getDepartmentById(id: string): Promise<Department | null> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single()
    return data
}
