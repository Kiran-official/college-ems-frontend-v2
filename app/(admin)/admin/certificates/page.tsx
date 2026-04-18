import { getAllCertificates, getCertificateStats } from '@/lib/queries/certificates'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Award } from 'lucide-react'
import { format } from 'date-fns'
import { CertAdminActions } from './CertAdminActions'

export default async function AdminCertificatesPage() {
    const [certificates, stats] = await Promise.all([
        getAllCertificates(),
        getCertificateStats(),
    ])

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">Certificates</h1>
                    <p className="page-sub">Monitor certificate generation across all events</p>
                </div>
                {stats.failed > 0 && <CertAdminActions failedCount={stats.failed} />}
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <Badge variant="pending">{stats.pending} Pending</Badge>
                <Badge variant="processing">{stats.processing} Processing</Badge>
                <Badge variant="generated">{stats.generated} Generated</Badge>
                <Badge variant="failed">{stats.failed} Failed</Badge>
            </div>

            {certificates.length === 0 ? (
                <EmptyState icon={Award} title="No certificates" subtitle="Certificates will appear here once generated." />
            ) : (
                <>
                    <div className="resp-table">
                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Event</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Generated At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {certificates.map(cert => (
                                        <tr key={cert.id}>
                                            <td data-label="Student">{cert.student?.name ?? '—'}</td>
                                            <td data-label="Event">{cert.event?.title ?? '—'}</td>
                                            <td data-label="Type"><Badge variant={cert.certificate_type}>{cert.certificate_type}</Badge></td>
                                            <td data-label="Status"><Badge variant={cert.status}>{cert.status}</Badge></td>
                                            <td data-label="Generated">{cert.generated_at ? format(new Date(cert.generated_at), 'dd/MM/yyyy') : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="resp-cards">
                        {certificates.map(cert => (
                            <div key={cert.id} className="m-card">
                                <div className="m-card__row">
                                    <span className="m-card__name">{cert.student?.name ?? '—'}</span>
                                    <Badge variant={cert.certificate_type} style={{ fontSize: '9px', padding: '1px 6px' }}>{cert.certificate_type}</Badge>
                                    <Badge variant={cert.status} style={{ fontSize: '9px', padding: '1px 6px' }}>{cert.status}</Badge>
                                </div>
                                <div className="m-card__details" style={{ marginTop: 4 }}>
                                    <span className="m-card__detail">{cert.event?.title ?? '—'}</span>
                                    <span className="m-card__detail">{cert.generated_at ? format(new Date(cert.generated_at), 'dd/MM/yyyy') : 'Not generated'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
