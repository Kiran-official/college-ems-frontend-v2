import { TemplateBuilder } from '@/components/templates/TemplateBuilder'
import { getActiveEvents } from '@/lib/queries/events'

export default async function AdminCreateTemplatePage() {
    const events = await getActiveEvents()

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Create Template</h1>
                <p className="page-sub">Design a certificate template with drag-and-drop fields</p>
            </div>
            <TemplateBuilder events={events} basePath="/admin/templates" />
        </div>
    )
}
