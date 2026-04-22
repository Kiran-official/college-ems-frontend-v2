import { notFound } from 'next/navigation'
import { TemplateBuilderWrapper } from '@/components/templates/TemplateBuilderWrapper'
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

    return <TemplateBuilderWrapper events={events} template={template} basePath="/admin/templates" />
}
