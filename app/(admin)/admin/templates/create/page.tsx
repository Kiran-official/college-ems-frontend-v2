import { TemplateBuilderWrapper } from '@/components/templates/TemplateBuilderWrapper'
import { TemplatePickerScreen } from '@/components/templates/TemplatePickerScreen'
import { getActiveEvents } from '@/lib/queries/events'
import { getAllTemplates } from '@/lib/queries/templates'

interface Props {
    searchParams: Promise<{ mode?: string; eventId?: string; type?: string }>
}

export default async function AdminCreateTemplatePage({ searchParams }: Props) {
    const params = await searchParams
    const events = await getActiveEvents()

    // If mode=scratch, go directly to builder
    if (params.mode === 'scratch') {
        return <TemplateBuilderWrapper events={events} basePath="/admin/templates" />
    }

    // Otherwise show the picker screen
    const existingTemplates = await getAllTemplates()
    const initialEventId = params.eventId || ''
    const initialType = (params.type === 'winner' ? 'winner' : 'participation') as 'participation' | 'winner'

    return (
        <div className="page" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: 40 }}>
                <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', backgroundImage: 'linear-gradient(90deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Create Template</h1>
                <p className="page-sub" style={{ margin: '4px 0 0 0', opacity: 0.8 }}>Choose a starting point for your certificate design</p>
            </div>
            <TemplatePickerScreen
                events={events}
                existingTemplates={existingTemplates}
                basePath="/admin/templates"
                initialEventId={initialEventId}
                initialType={initialType}
            />
        </div>
    )
}
