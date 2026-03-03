import { CreateEventForm } from '@/app/(admin)/admin/events/create/CreateEventForm'
import { getDepartments } from '@/lib/queries/departments'
import { getCurrentUser } from '@/lib/queries/users'
import { redirect } from 'next/navigation'

export default async function TeacherCreateEventPage() {
    const [departments, currentUser] = await Promise.all([
        getDepartments(),
        getCurrentUser(),
    ])
    if (!currentUser) redirect('/login')

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Create Event</h1>
                <p className="page-sub">Set up a new event with registration and participation details</p>
            </div>
            <CreateEventForm
                departments={departments}
                currentUser={currentUser}
                basePath="/teacher/events"
                isAdmin={false}
            />
        </div>
    )
}
