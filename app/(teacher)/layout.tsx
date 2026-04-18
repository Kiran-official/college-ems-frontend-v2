import { redirect } from 'next/navigation'
import { createSSRClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/session'
import Sidebar from '@/components/layout/Sidebar'
import { NotificationPermission } from '@/components/pwa/NotificationPermission'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
    const user = await requireSession()
    
    // Use app_metadata (admin-controlled) for role verification
    const role = user.app_metadata?.role
    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Teacher'

    if (role !== 'teacher') {
        redirect(`/${role ?? 'login'}`)
    }

    return (
        <div className="portal portal--teacher">
            <div className="app-shell">
                <Sidebar role="teacher" userName={name} userEmail={user.email ?? ''} />
                <main className="app-main">{children}</main>
            </div>
            <NotificationPermission />
        </div>
    )
}
