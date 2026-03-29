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
            <div className="mesh-bg" style={{ pointerEvents: 'none' }}>
                <div className="mesh-circle" style={{ width: '800px', height: '800px', top: '-100px', left: '-200px', background: 'var(--accent)', opacity: 0.3 }} />
                <div className="mesh-circle" style={{ width: '600px', height: '600px', bottom: '-200px', right: '-100px', background: 'var(--accent-secondary)', animationDelay: '-8s', opacity: 0.2 }} />
            </div>

            <div className="page-header">
                <div className="page-header__title-group">
                    <h1 className="page-title">My Certificates</h1>
                    <p className="page-sub">Your earned participation and winner certificates</p>
                </div>
            </div>

            {certificates.length === 0 ? (
                <EmptyState icon={Award} title="No certificates yet" subtitle="Participate in events to earn certificates." />
            ) : (
                <div className="card-grid">
                    {certificates.map(cert => (
                        <div key={cert.id} className="certificate-card">
                            <div className="certificate-card__icon">
                                <Award size={24} />
                            </div>
                            
                            <div className="certificate-card__body">
                                <h3 className="certificate-card__title">
                                    {cert.event?.title ?? 'Event'}
                                </h3>
                                
                                <div className="certificate-card__meta">
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <Badge variant={cert.certificate_type === 'winner' ? 'gold' : 'info'}>
                                            {cert.certificate_type.charAt(0).toUpperCase() + cert.certificate_type.slice(1)}
                                        </Badge>
                                        {cert.winner && (
                                            <Badge variant="gold">{(cert.winner as { position_label?: string }).position_label}</Badge>
                                        )}
                                    </div>
                                    
                                    {cert.generated_at && (
                                        <div className="certificate-card__date">
                                            <Award size={14} />
                                            Generated on {format(new Date(cert.generated_at), 'dd MMM yyyy')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {cert.file_path && (
                                <div className="certificate-card__action">
                                    <a
                                        href={cert.file_path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn--primary w-full"
                                        style={{ justifyContent: 'center', gap: 8 }}
                                    >
                                        <Award size={18} />
                                        Download Certificate
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
