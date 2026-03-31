import { notFound, redirect } from 'next/navigation'
import { TemplateBuilder } from '@/components/templates/TemplateBuilder'
import { getTemplateById } from '@/lib/queries/templates'
import { getCurrentUser } from '@/lib/queries/users'
import { getTeacherEvents, getEventsByCreator } from '@/lib/queries/events'

interface Props {
    params: Promise<{ id: string }>
}

export default async function TeacherTemplateDetailPage({ params }: Props) {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const [template, created, fic] = await Promise.all([
        getTemplateById(id),
        getEventsByCreator(user.id),
        getTeacherEvents(user.id),
    ])
    if (!template) notFound()

    const eventMap = new Map<string, typeof created[0]>()
    for (const e of [...created, ...fic]) eventMap.set(e.id, e)
    const events = Array.from(eventMap.values())

    return <TemplateBuilder events={events} template={template} basePath="/teacher/templates" />
}
