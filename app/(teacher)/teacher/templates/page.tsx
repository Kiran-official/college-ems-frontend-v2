import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { getTemplatesByCreator } from '@/lib/queries/templates'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileText, Plus } from 'lucide-react'
import { format } from 'date-fns'

export default async function TeacherTemplatesPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const templates = await getTemplatesByCreator(user.id)

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">My Templates</h1>
                    <p className="page-sub">Certificate templates you have created</p>
                </div>
                <Link href="/teacher/templates/create" className="btn btn--primary">
                    <Plus size={16} /> New Template
                </Link>
            </div>

            {templates.length === 0 ? (
                <EmptyState icon={FileText} title="No templates yet" subtitle="Create your first certificate template." />
            ) : (
                <div className="card-grid">
                    {templates.map(t => (
                        <Link key={t.id} href={`/teacher/templates/${t.id}`} className="glass" style={{ padding: 20, display: 'block', textDecoration: 'none', color: 'inherit' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>{t.template_name}</h3>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                <Badge variant={t.certificate_type}>{t.certificate_type}</Badge>
                                <Badge variant={t.is_active ? 'generated' : 'failed'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                {t.event?.title ?? '—'} {t.category ? `→ ${t.category.category_name}` : ''}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 6 }}>
                                Created {format(new Date(t.created_at), 'dd/MM/yyyy')}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
