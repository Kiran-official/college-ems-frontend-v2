import { redirect } from 'next/navigation'
import { createSSRClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/session'
import Sidebar from '@/components/layout/Sidebar'
import { NotificationPermission } from '@/components/pwa/NotificationPermission'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
    const user = await requireSession()
    
    // Use app_metadata (admin-controlled) for role verification
    let role = user.app_metadata?.role
    let name = user.user_metadata?.name || user.email?.split('@')[0] || 'Student'

    // Transition Fallback: If metadata is missing (old session), check DB once
    if (!role) {
        const { data } = await (await createSSRClient())
            .from('users').select('role, name').eq('id', user.id).single()
        role = data?.role
        if (data?.name) name = data.name
    }

    if (role !== 'student') {
        redirect(`/${role ?? 'login'}`)
    }

    return (
        <div className="portal portal--student">
            <div className="app-shell">
                <Sidebar role="student" userName={name} userEmail={user.email ?? ''} />
                <main className="app-main">{children}</main>
            </div>
            <NotificationPermission />
        </div>
    )
}
