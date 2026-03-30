import { redirect } from 'next/navigation'
import { TemplateBuilder } from '@/components/templates/TemplateBuilder'
import { TemplatePickerScreen } from '@/components/templates/TemplatePickerScreen'
import { getCurrentUser } from '@/lib/queries/users'
import { getTeacherEvents, getEventsByCreator } from '@/lib/queries/events'
import { getGlobalTemplates } from '@/lib/queries/templates'

interface Props {
    searchParams: Promise<{ mode?: string; eventId?: string; type?: string }>
}

export default async function TeacherCreateTemplatePage({ searchParams }: Props) {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const params = await searchParams

    // Merge created + fic events
    const [created, fic] = await Promise.all([
        getEventsByCreator(user.id),
        getTeacherEvents(user.id),
    ])
    const eventMap = new Map<string, typeof created[0]>()
    for (const e of [...created, ...fic]) eventMap.set(e.id, e)
    const events = Array.from(eventMap.values())

    // If mode=scratch, go directly to builder
    if (params.mode === 'scratch') {
        return <TemplateBuilder events={events} basePath="/teacher/templates" />
    }

    // Otherwise show the picker screen
    const globalTemplates = await getGlobalTemplates()

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Create Template</h1>
                <p className="page-sub">Choose a starting point for your certificate design</p>
            </div>
            <TemplatePickerScreen
                events={events}
                globalTemplates={globalTemplates}
                basePath="/teacher/templates"
            />
        </div>
    )
}
