import { createSSRClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import type { User, UserRole } from '@/lib/types/db'

export async function getCurrentUser(): Promise<User | null> {
    const supabase = await createSSRClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
        .from('users')
        .select('id, name, email, role, phone_number, department_id, programme, semester, student_type, is_active, must_change_password, created_at, department:departments(name)')
        .eq('id', user.id)
        .single()
    return data as unknown as User
}

export async function getUserById(id: string): Promise<User | null> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('id, name, email, role, phone_number, department_id, programme, semester, student_type, is_active, must_change_password, created_at, department:departments(name)')
        .eq('id', id)
        .single()
    return data as unknown as User
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('id, name, email, role, department_id, programme, semester, is_active, must_change_password, created_at, department:departments(name)')
        .eq('role', role)
        .order('name')
    return (data as unknown as User[]) ?? []
}

export async function getTeachers(): Promise<User[]> {
    return getUsersByRole('teacher')
}

export async function getActiveTeachers(): Promise<Pick<User, 'id' | 'name' | 'email' | 'role' | 'department_id'>[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('id, name, email, role, department_id')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('name')
    return data ?? []
}

export async function searchTeachers(query: string): Promise<Pick<User, 'id' | 'name' | 'email'>[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('role', 'teacher')
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .limit(10)
    return data ?? []
}

export async function searchStudents(query: string): Promise<(Pick<User, 'id' | 'name' | 'email'> & { department: { name: string }[] })[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('id, name, email, department:departments(name)')
        .eq('role', 'student')
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .limit(10)
    return data ?? []
}

export const getUserStats = unstable_cache(
    async () => {
        const supabase = createAdminClient()
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
        const { count: totalStudents } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student')
        const { count: totalTeachers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'teacher')
        return {
            totalUsers: totalUsers ?? 0,
            totalStudents: totalStudents ?? 0,
            totalTeachers: totalTeachers ?? 0,
        }
    },
    ['user-stats'],
    { revalidate: 60, tags: ['users'] }
)
