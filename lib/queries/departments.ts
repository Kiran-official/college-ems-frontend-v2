import { createSSRClient } from '@/lib/supabase/server'
import type { Department } from '@/lib/types/db'

export async function getDepartments(): Promise<Department[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name')
    return data ?? []
}

export async function getDepartmentById(id: string): Promise<Department | null> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('departments')
        .select('*')
        .eq('id', id)
        .single()
    return data
}
