import { redirect } from 'next/navigation'
import { TemplateBuilder } from '@/components/templates/TemplateBuilder'
import { getCurrentUser } from '@/lib/queries/users'
import { getTeacherEvents, getEventsByCreator } from '@/lib/queries/events'

export default async function TeacherCreateTemplatePage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    // Show events teacher has access to
    const [created, fic] = await Promise.all([
        getEventsByCreator(user.id),
        getTeacherEvents(user.id),
    ])
    const eventMap = new Map<string, typeof created[0]>()
    for (const e of [...created, ...fic]) eventMap.set(e.id, e)
    const events = Array.from(eventMap.values())

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Create Template</h1>
                <p className="page-sub">Design a certificate template for your events</p>
            </div>
            <TemplateBuilder events={events} basePath="/teacher/templates" />
        </div>
    )
}
