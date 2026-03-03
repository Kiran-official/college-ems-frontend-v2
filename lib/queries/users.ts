import { createSSRClient } from '@/lib/supabase/server'
import type { User, UserRole } from '@/lib/types/db'

export async function getCurrentUser(): Promise<User | null> {
    const supabase = await createSSRClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
        .from('users')
        .select('*, department:departments(*)')
        .eq('id', user.id)
        .single()
    return data
}

export async function getUserById(id: string): Promise<User | null> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('*, department:departments(*)')
        .eq('id', id)
        .single()
    return data
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('*, department:departments(*)')
        .eq('role', role)
        .order('name')
    return data ?? []
}

export async function getTeachers(): Promise<User[]> {
    return getUsersByRole('teacher')
}

<<<<<<< HEAD
export async function getActiveTeachers(): Promise<Pick<User, 'id' | 'name' | 'email' | 'role' | 'department_id'>[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('id, name, email, role, department_id')
=======
export async function getActiveTeachers(): Promise<User[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('id, name, email, role, department_id, is_active, must_change_password, created_at')
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
        .eq('role', 'teacher')
        .eq('is_active', true)
        .order('name')
    return data ?? []
}

<<<<<<< HEAD
export async function searchTeachers(query: string): Promise<Pick<User, 'id' | 'name' | 'email'>[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('id, name, email')
=======
export async function searchTeachers(query: string): Promise<User[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('id, name, email, role, is_active, must_change_password, created_at')
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
        .eq('role', 'teacher')
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .limit(10)
    return data ?? []
}

<<<<<<< HEAD
export async function searchStudents(query: string): Promise<(Pick<User, 'id' | 'name' | 'email'> & { department: { name: string }[] })[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('id, name, email, department:departments(name)')
=======
export async function searchStudents(query: string): Promise<User[]> {
    const supabase = await createSSRClient()
    const { data } = await supabase
        .from('users')
        .select('id, name, email, role, is_active, must_change_password, created_at, department:departments(name)')
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
        .eq('role', 'student')
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .limit(10)
<<<<<<< HEAD
    return data ?? []
=======
    return (data as any) ?? []
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229
}

export async function getUserStats() {
    const supabase = await createSSRClient()
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
}
