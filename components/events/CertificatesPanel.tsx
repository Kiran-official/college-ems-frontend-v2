'use client'

import { useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { retryCertificateAction } from '@/lib/actions/certificateActions'
import { EmptyState } from '@/components/ui/EmptyState'
import { Award, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import type { Certificate } from '@/lib/types/db'

interface CertificatesPanelProps {
    certificates: Certificate[]
    stats: { pending: number; processing: number; generated: number; failed: number }
}

export function CertificatesPanel({ certificates, stats }: CertificatesPanelProps) {
    const [pending, startTransition] = useTransition()

    function retry(certId: string) {
        startTransition(async () => {
            await retryCertificateAction(certId)
            window.location.reload()
        })
    }

    return (
        <div>
            {/* Summary strip */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <Badge variant="pending">{stats.pending} Pending</Badge>
                <Badge variant="processing">{stats.processing} Processing</Badge>
                <Badge variant="generated">{stats.generated} Generated</Badge>
                <Badge variant="failed">{stats.failed} Failed</Badge>
            </div>

            {certificates.length === 0 ? (
                <EmptyState icon={Award} title="No certificates" subtitle="No certificates have been created for this event yet." />
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Category</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Generated At</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {certificates.map(cert => (
                                <tr key={cert.id}>
                                    <td>{cert.student?.name ?? '—'}</td>
                                    <td>{(cert.category as { category_name?: string } | undefined)?.category_name ?? '—'}</td>
                                    <td><Badge variant={cert.certificate_type}>{cert.certificate_type}</Badge></td>
                                    <td><Badge variant={cert.status}>{cert.status}</Badge></td>
                                    <td>{cert.generated_at ? format(new Date(cert.generated_at), 'dd MMM yyyy') : '—'}</td>
                                    <td>
                                        {cert.status === 'failed' && (
                                            <Button size="sm" variant="ghost" onClick={() => retry(cert.id)} loading={pending}>
                                                <RotateCcw size={14} /> Retry
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
