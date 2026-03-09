import Link from 'next/link'
import { getAllTemplates } from '@/lib/queries/templates'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { FileText, Plus, LayoutTemplate, Star, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

export default async function AdminTemplatesPage() {
    const templates = await getAllTemplates()

    return (
        <div className="page" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid var(--border-glass)', paddingBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--r-lg)', background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(0,201,255,0.2) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 0 20px rgba(124,58,237,0.1)' }}>
                        <LayoutTemplate size={24} color="#B983FF" />
                    </div>
                    <div>
                        <h1 className="page-title" style={{ margin: 0, fontSize: '1.75rem', backgroundImage: 'linear-gradient(90deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Certificate Templates</h1>
                        <p className="page-sub" style={{ margin: '4px 0 0 0', opacity: 0.8 }}>Design and manage certificates for all your events</p>
                    </div>
                </div>
                <Link href="/admin/templates/create" className="btn btn--primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: '0.9375rem', fontWeight: 600, boxShadow: '0 8px 16px rgba(0, 201, 255, 0.25)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                    <Plus size={18} /> New Template
                </Link>
            </div>

            {templates.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title="No templates yet"
                    subtitle="Create your first beautiful certificate template to distribute to event participants or winners."
                />
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                    {templates.map(t => (
                        <Link
                            key={t.id}
                            href={`/admin/templates/${t.id}`}
                            style={{
                                display: 'block',
                                textDecoration: 'none',
                                color: 'inherit',
                                position: 'relative',
                                borderRadius: 'var(--r-xl)',
                                padding: '2px', // for gradient border
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
                                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                cursor: 'pointer',
                            }}
                            className="template-card-hover"
                        >
                            <div className="glass" style={{ height: '100%', padding: 24, borderRadius: 'calc(var(--r-xl) - 2px)', background: 'var(--bg-card)', border: 'none', display: 'flex', flexDirection: 'column', transition: 'background 0.3s ease' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>

                                    <div style={{ width: 40, height: 40, borderRadius: 'var(--r-lg)', background: t.certificate_type === 'winner' ? 'rgba(245, 166, 35, 0.1)' : 'rgba(0, 201, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${t.certificate_type === 'winner' ? 'rgba(245, 166, 35, 0.2)' : 'rgba(0, 201, 255, 0.2)'}` }}>
                                        {t.certificate_type === 'winner' ? <Star size={18} color="#F5A623" /> : <FileText size={18} color="#00C9FF" />}
                                    </div>

                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                        {/* Using generated and failed as per the existing app semantics for active/inactive */}
                                        <Badge variant={t.is_active ? 'generated' : 'failed'}>{t.is_active ? 'Active' : 'Inactive'}</Badge>
                                    </div>
                                </div>

                                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>{t.template_name}</h3>

                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 20, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
                                        Event: <span style={{ color: 'var(--text-primary)' }}>{t.event?.title ?? '—'}</span>
                                    </div>
                                    {t.category && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                                            Category: <span style={{ color: 'var(--text-primary)' }}>{t.category.category_name}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                                        {format(new Date(t.created_at), 'MMM dd, yyyy')}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--accent)', fontWeight: 600 }}>
                                        Edit <ArrowRight size={14} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
