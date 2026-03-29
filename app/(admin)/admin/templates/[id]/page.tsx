import { notFound } from 'next/navigation'
import { TemplateBuilder } from '@/components/templates/TemplateBuilder'
import { getTemplateById } from '@/lib/queries/templates'
import { getActiveEvents } from '@/lib/queries/events'

interface Props {
    params: Promise<{ id: string }>
}

export default async function AdminTemplateDetailPage({ params }: Props) {
    const { id } = await params
    const [template, events] = await Promise.all([
        getTemplateById(id),
        getActiveEvents(),
    ])
    if (!template) notFound()

    return (
        <div className="page" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: 40 }}>
                <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', backgroundImage: 'linear-gradient(90deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Edit Template: {template.template_name}</h1>
                <p className="page-sub" style={{ margin: '4px 0 0 0', opacity: 0.8 }}>Update the layout and settings for this template</p>
            </div>
            <TemplateBuilder events={events} template={template} basePath="/admin/templates" />
        </div>
    )
}
