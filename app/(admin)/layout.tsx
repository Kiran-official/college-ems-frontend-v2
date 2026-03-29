import { redirect } from 'next/navigation'
import { createSSRClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/session'
import Sidebar from '@/components/layout/Sidebar'
import { NotificationPermission } from '@/components/pwa/NotificationPermission'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await requireSession()
    const { data: profile } = await (await createSSRClient())
        .from('users').select('name, email, role').eq('id', session.user.id).single() as {
            data: { name: string; email: string; role: string } | null
        }
    if (!profile || profile.role !== 'admin') {
        redirect(`/${profile?.role ?? 'login'}`)
    }

    return (
        <div className="portal portal--admin">
            <div className="app-shell">
                <Sidebar role="admin" userName={profile.name} userEmail={profile.email} />
                <main className="app-main">{children}</main>
            </div>
            <NotificationPermission />
        </div>
    )
}
