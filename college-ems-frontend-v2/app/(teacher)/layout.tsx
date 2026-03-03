import { redirect } from 'next/navigation'
import { createSSRClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createSSRClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('users').select('name, email, role').eq('id', user.id).single() as {
            data: { name: string; email: string; role: string } | null
        }
    if (!profile || profile.role !== 'teacher') redirect(`/${profile?.role ?? 'login'}`)

    return (
        <div className="portal portal--teacher">
            <div className="app-shell">
                <Sidebar role="teacher" userName={profile.name} userEmail={profile.email} />
                <main className="app-main">{children}</main>
            </div>
        </div>
    )
}
