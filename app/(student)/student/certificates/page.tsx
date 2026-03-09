import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { getCertificatesByStudent } from '@/lib/queries/certificates'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Award } from 'lucide-react'
import { format } from 'date-fns'

export default async function StudentCertificatesPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const certificates = await getCertificatesByStudent(user.id)

    return (
        <div className="page">
            <div className="mesh-bg">
                <div className="mesh-circle" style={{ width: '800px', height: '800px', top: '-100px', left: '-200px', background: 'var(--accent)', opacity: 0.3 }} />
                <div className="mesh-circle" style={{ width: '600px', height: '600px', bottom: '-200px', right: '-100px', background: 'var(--accent-secondary)', animationDelay: '-8s', opacity: 0.2 }} />
            </div>

            <div className="page-header">
                <h1 className="page-title">My Certificates</h1>
                <p className="page-sub">Your earned participation and winner certificates</p>
            </div>

            {certificates.length === 0 ? (
                <EmptyState icon={Award} title="No certificates yet" subtitle="Participate in events to earn certificates." />
            ) : (
                <div className="card-grid">
                    {certificates.map(cert => (
                        <div key={cert.id} className="glass-premium" style={{ padding: 24 }}>
                            <h3 className="section-title" style={{ fontSize: '1.125rem', marginBottom: 8 }}>
                                {cert.event?.title ?? 'Event'}
                            </h3>
                            {(cert.category as { category_name?: string } | undefined)?.category_name && (
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                                    {(cert.category as { category_name?: string }).category_name}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                <Badge variant={cert.certificate_type === 'winner' ? 'success' : 'info'}>
                                    {cert.certificate_type.charAt(0).toUpperCase() + cert.certificate_type.slice(1)}
                                </Badge>
                                {cert.winner && (
                                    <Badge variant="success">{(cert.winner as { position_label?: string }).position_label}</Badge>
                                )}
                            </div>
                            {cert.generated_at && (
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: 16 }}>
                                    Generated on {format(new Date(cert.generated_at), 'dd/MM/yyyy')}
                                </div>
                            )}
                            {cert.file_path && (
                                <a
                                    href={cert.file_path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn--outline btn--sm w-full"
                                    style={{ justifyContent: 'center' }}
                                >
                                    Download Certificate
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
