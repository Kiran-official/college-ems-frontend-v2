import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'

interface Props {
    params: Promise<{ id: string }>
}

/**
 * Smart Redirect Page
 * Notifications send users to /events/[id].
 * This page redirects them to the correct role-specific path:
 * - Student: /student/events/[id]
 * - Teacher: /teacher/events/[id]
 * - Admin:   /admin/events/[id]
 */
export default async function EventRedirectPage({ params }: Props) {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
        redirect(`/login?returnTo=/events/${id}`)
    }

    const role = user.role

    // Redirect based on user role
    if (role === 'admin') {
        redirect(`/admin/events/${id}`)
    } else if (role === 'teacher') {
        redirect(`/teacher/events/${id}`)
    } else {
        // Default to student view
        redirect(`/student/events/${id}`)
    }
}
