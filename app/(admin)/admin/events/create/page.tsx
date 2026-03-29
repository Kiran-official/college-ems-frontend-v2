import { CreateEventForm } from './CreateEventForm'
import { getDepartments } from '@/lib/queries/departments'
import { getCurrentUser, getActiveTeachers } from '@/lib/queries/users'

export default async function AdminCreateEventPage() {
    const [departments, currentUser, teachers] = await Promise.all([
        getDepartments(),
        getCurrentUser(),
        getActiveTeachers()
    ])

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Create Event</h1>
                <p className="page-sub">Set up a new event with registration and participation details</p>
            </div>
            <CreateEventForm
                departments={departments}
                currentUser={currentUser!}
                teachers={teachers}
                basePath="/admin/events"
                isAdmin={true}
            />
        </div>
    )
}
