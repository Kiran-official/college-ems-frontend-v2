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
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Edit Template: {template.template_name}</h1>
                <p className="page-sub">Update the layout and settings for this template</p>
            </div>
            <TemplateBuilder events={events} template={template} basePath="/admin/templates" />
        </div>
    )
}
