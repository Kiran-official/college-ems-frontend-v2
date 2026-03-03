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
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Event</th>
                                <th>Category</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Generated At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {certificates.map(cert => (
                                <tr key={cert.id}>
                                    <td>{cert.student?.name ?? '—'}</td>
                                    <td>{cert.event?.title ?? '—'}</td>
                                    <td>{(cert.category as { category_name?: string } | undefined)?.category_name ?? '—'}</td>
                                    <td><Badge variant={cert.certificate_type}>{cert.certificate_type}</Badge></td>
                                    <td><Badge variant={cert.status}>{cert.status}</Badge></td>
                                    <td>{cert.generated_at ? format(new Date(cert.generated_at), 'dd MMM yyyy') : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
