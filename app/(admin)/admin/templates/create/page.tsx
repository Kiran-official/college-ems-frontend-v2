import { TemplateBuilder } from '@/components/templates/TemplateBuilder'
import { getActiveEvents } from '@/lib/queries/events'

export default async function AdminCreateTemplatePage() {
    const events = await getActiveEvents()

    return (
        <div className="page" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: 40 }}>
                <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', backgroundImage: 'linear-gradient(90deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Create Template</h1>
                <p className="page-sub" style={{ margin: '4px 0 0 0', opacity: 0.8 }}>Design a certificate template with drag-and-drop fields</p>
            </div>
            <TemplateBuilder events={events} basePath="/admin/templates" />
        </div>
    )
}
