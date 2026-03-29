import { CreateEventForm } from '@/app/(admin)/admin/events/create/CreateEventForm'
import { getDepartments } from '@/lib/queries/departments'
import { getCurrentUser, getActiveTeachers } from '@/lib/queries/users'
import { redirect } from 'next/navigation'

export default async function TeacherCreateEventPage() {
    const [departments, currentUser, teachers] = await Promise.all([
        getDepartments(),
        getCurrentUser(),
        getActiveTeachers()
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
                teachers={teachers}
                basePath="/teacher/events"
                isAdmin={false}
            />
        </div>
    )
}
