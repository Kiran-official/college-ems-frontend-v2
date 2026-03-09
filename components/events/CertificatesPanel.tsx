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
    categoryId?: string
}

export function CertificatesPanel({ certificates, stats, categoryId }: CertificatesPanelProps) {
    const [pending, startTransition] = useTransition()

    const filteredCerts = categoryId
        ? certificates.filter(c => c.category_id === categoryId)
        : certificates

    const displayStats = categoryId ? {
        pending: filteredCerts.filter(c => c.status === 'pending').length,
        processing: filteredCerts.filter(c => c.status === 'processing').length,
        generated: filteredCerts.filter(c => c.status === 'generated').length,
        failed: filteredCerts.filter(c => c.status === 'failed').length,
    } : stats

    function retry(certId: string) {
        startTransition(async () => {
            await retryCertificateAction(certId)
            window.location.reload()
        })
    }

    const hasCategories = Array.from(new Set(certificates.map(c => c.category_id).filter(Boolean))).length > 0

    const renderTable = (certs: Certificate[]) => (
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
                    {certs.map(cert => (
                        <tr key={cert.id}>
                            <td>{cert.student?.name ?? '—'}</td>
                            <td>{(cert.category as { category_name?: string } | undefined)?.category_name ?? '—'}</td>
                            <td><Badge variant={cert.certificate_type}>{cert.certificate_type}</Badge></td>
                            <td><Badge variant={cert.status}>{cert.status}</Badge></td>
                            <td>{cert.generated_at ? format(new Date(cert.generated_at), 'dd/MM/yyyy') : '—'}</td>
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
    )

    if (filteredCerts.length === 0) {
        return (
            <div>
                {/* Summary strip */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                    <Badge variant="pending">{displayStats.pending} Pending</Badge>
                    <Badge variant="processing">{displayStats.processing} Processing</Badge>
                    <Badge variant="generated">{displayStats.generated} Generated</Badge>
                    <Badge variant="failed">{displayStats.failed} Failed</Badge>
                </div>
                <EmptyState icon={Award} title="No certificates" subtitle={categoryId ? "No certificates found for this category." : "No certificates have been created for this event yet."} />
            </div>
        )
    }

    const content = () => {
        if (categoryId || !hasCategories) {
            return renderTable(filteredCerts)
        }

        // Global view with categories
        const categoriesInCerts = Array.from(new Set(certificates.map(c => c.category_id).filter(Boolean)))

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {categoriesInCerts.map(catId => {
                    const catCerts = certificates.filter(c => c.category_id === catId)
                    const catName = (catCerts[0]?.category as { category_name?: string } | undefined)?.category_name ?? 'Other'
                    return (
                        <div key={catId ?? 'none'}>
                            <div className="category-section-header">{catName}</div>
                            {renderTable(catCerts)}
                        </div>
                    )
                })}
                {/* Also show certificates without category if any */}
                {certificates.filter(c => !c.category_id).length > 0 && (
                    <div>
                        <div className="category-section-header">General / No Category</div>
                        {renderTable(certificates.filter(c => !c.category_id))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div>
            {/* Summary strip */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <Badge variant="pending">{displayStats.pending} Pending</Badge>
                <Badge variant="processing">{displayStats.processing} Processing</Badge>
                <Badge variant="generated">{displayStats.generated} Generated</Badge>
                <Badge variant="failed">{displayStats.failed} Failed</Badge>
            </div>

            {content()}
        </div>
    )
}
