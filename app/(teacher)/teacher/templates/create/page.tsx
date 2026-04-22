import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { TemplatePickerScreen } from '@/components/templates/TemplatePickerScreen'
import { requireSession } from '@/lib/session'
import { getTeacherEvents, getEventsByCreator } from '@/lib/queries/events'
import { getAllTemplates } from '@/lib/queries/templates'

const TemplateBuilder = dynamic(() => import('@/components/templates/TemplateBuilder').then(mod => mod.TemplateBuilder), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-white/5 animate-pulse rounded-xl" />
})

interface Props {
    searchParams: Promise<{ mode?: string; eventId?: string; type?: string }>
}

export default async function TeacherCreateTemplatePage({ searchParams }: Props) {
    const session = await requireSession()
    const params = await searchParams

    // Merge created + fic events IN PARALLEL
    const [created, fic, existingTemplates] = await Promise.all([
        getEventsByCreator(session.id),
        getTeacherEvents(session.id),
        getAllTemplates()
    ])
    const eventMap = new Map<string, typeof created[0]>()
    for (const e of [...created, ...fic]) eventMap.set(e.id, e)
    const events = Array.from(eventMap.values())

    // If mode=scratch, go directly to builder
    if (params.mode === 'scratch') {
        return <TemplateBuilder events={events} basePath="/teacher/templates" />
    }

    const initialEventId = params.eventId || ''
    const initialType = (params.type === 'winner' ? 'winner' : 'participation') as 'participation' | 'winner'

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Create Template</h1>
                <p className="page-sub">Choose a starting point for your certificate design</p>
            </div>
            <TemplatePickerScreen
                events={events}
                existingTemplates={existingTemplates}
                basePath="/teacher/templates"
                initialEventId={initialEventId}
                initialType={initialType}
            />
        </div>
    )
}
