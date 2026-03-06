import Link from 'next/link'
import { getAllTemplates } from '@/lib/queries/templates'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileText, Plus } from 'lucide-react'
import { format } from 'date-fns'

export default async function AdminTemplatesPage() {
    const templates = await getAllTemplates()

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Certificate Templates</h1>
                    <p className="page-sub">Manage all certificate templates</p>
                </div>
                <Link href="/admin/templates/create" className="btn btn--primary">
                    <Plus size={16} /> New Template
                </Link>
            </div>

            {templates.length === 0 ? (
                <EmptyState icon={FileText} title="No templates yet" subtitle="Create the first certificate template." />
            ) : (
                <div className="card-grid">
                    {templates.map(t => (
                        <Link key={t.id} href={`/admin/templates/${t.id}`} className="glass" style={{ padding: 20, display: 'block', textDecoration: 'none', color: 'inherit' }}>
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
