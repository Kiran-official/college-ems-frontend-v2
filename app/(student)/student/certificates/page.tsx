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
            <div className="page-header">
                <h1 className="page-title">My Certificates</h1>
                <p className="page-sub">Your earned participation and winner certificates</p>
            </div>

            {certificates.length === 0 ? (
                <EmptyState icon={Award} title="No certificates yet" subtitle="Participate in events to earn certificates." />
            ) : (
                <div className="card-grid">
                    {certificates.map(cert => (
                        <div key={cert.id} className="glass" style={{ padding: 24 }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>
                                {cert.event?.title ?? 'Event'}
                            </h3>
                            {(cert.category as { category_name?: string } | undefined)?.category_name && (
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                                    {(cert.category as { category_name?: string }).category_name}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                                <Badge variant={cert.certificate_type}>{cert.certificate_type}</Badge>
                                {cert.winner && (
                                    <Badge variant="winner">{(cert.winner as { position_label?: string }).position_label}</Badge>
                                )}
                            </div>
                            {cert.generated_at && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    Generated on {format(new Date(cert.generated_at), 'dd MMM yyyy')}
                                </div>
                            )}
                            {cert.file_path && (
                                <a
                                    href={cert.file_path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn--outline btn--sm"
                                    style={{ marginTop: 12 }}
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
