'use client'

import { useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { retryCertificateAction, triggerCertificateProcessingAction } from '@/lib/actions/certificateActions'
import { EmptyState } from '@/components/ui/EmptyState'
import { Award, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import type { Certificate, CertificateTemplate, Winner } from '@/lib/types/db'
import Link from 'next/link'
import { FileWarning, Check } from 'lucide-react'

interface CertificatesPanelProps {
    certificates: Certificate[]
    stats: { pending: number; processing: number; generated: number; failed: number }
    templates: CertificateTemplate[]
    eventId: string
    createTemplatePath: string
    winners: Winner[]
}

export function CertificatesPanel({ certificates, stats, templates, eventId, createTemplatePath, winners }: CertificatesPanelProps) {
    const [pending, startTransition] = useTransition()

    function retry(certId: string) {
        startTransition(async () => {
            await retryCertificateAction(certId)
            window.location.reload()
        })
    }

    function triggerProcessing() {
        startTransition(async () => {
            const res = await triggerCertificateProcessingAction()
            if (res.success) {
                alert('Processing triggered! It may take a few moments for all certificates to generate.')
            } else {
                alert(`Error: ${res.error}`)
            }
            window.location.reload()
        })
    }

    const hasParticipation = templates.some(t => t.certificate_type === 'participation')
    const hasWinner = templates.some(t => t.certificate_type === 'winner')

    const renderTemplateStatus = () => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="glass" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${hasParticipation ? 'var(--success-bg)' : 'var(--warning-bg)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: hasParticipation ? 'var(--success-bg)' : 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {hasParticipation ? <Check size={16} color="var(--success)" /> : <FileWarning size={16} color="var(--warning)" />}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Participation Template</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{hasParticipation ? 'Template attached' : 'Template missing'}</div>
                    </div>
                </div>
                {!hasParticipation && (
                    <Link href={`${createTemplatePath}?eventId=${eventId}&type=participation`}>
                        <Button size="sm" variant="outline">Create</Button>
                    </Link>
                )}
            </div>

            <div className="glass" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${hasWinner ? 'var(--success-bg)' : (winners.length > 0 ? 'var(--warning-bg)' : 'var(--border-glass)')}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: hasWinner ? 'var(--success-bg)' : (winners.length > 0 ? 'var(--warning-bg)' : 'var(--border)'), display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hasWinner || winners.length > 0 ? 1 : 0.5 }}>
                        {hasWinner ? <Check size={16} color="var(--success)" /> : (winners.length > 0 ? <FileWarning size={16} color="var(--warning)" /> : <Award size={16} color="var(--text-tertiary)" />)}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Winner Template</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                            {hasWinner ? 'Template attached' : (winners.length > 0 ? 'Template missing' : 'Not required (No winners declared)')}
                        </div>
                    </div>
                </div>
                {!hasWinner && (
                    <Link href={`${createTemplatePath}?eventId=${eventId}&type=winner`}>
                        <Button size="sm" variant="outline">Create</Button>
                    </Link>
                )}
            </div>
        </div>
    )

    const renderTable = (certs: Certificate[]) => (
        <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Student</th>
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

    if (certificates.length === 0) {
        return (
            <div>
                {renderTemplateStatus()}
                {/* Summary strip */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                    <Badge variant="pending">{stats.pending} Pending</Badge>
                    <Badge variant="processing">{stats.processing} Processing</Badge>
                    <Badge variant="generated">{stats.generated} Generated</Badge>
                    <Badge variant="failed">{stats.failed} Failed</Badge>
                    {(stats.pending > 0 || stats.failed > 0) && (
                        <Button size="sm" variant="outline" onClick={triggerProcessing} loading={pending}>
                            <RotateCcw size={14} /> Process Pending Queue
                        </Button>
                    )}
                </div>
                <EmptyState icon={Award} title="No certificates" subtitle="No certificates have been created for this event yet." />
            </div>
        )
    }

    return (
        <div>
            {renderTemplateStatus()}
            {/* Summary strip */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <Badge variant="pending">{stats.pending} Pending</Badge>
                <Badge variant="processing">{stats.processing} Processing</Badge>
                <Badge variant="generated">{stats.generated} Generated</Badge>
                <Badge variant="failed">{stats.failed} Failed</Badge>
                {(stats.pending > 0 || stats.failed > 0) && (
                    <Button size="sm" variant="outline" onClick={triggerProcessing} loading={pending}>
                        <RotateCcw size={14} /> Process Pending Queue
                    </Button>
                )}
            </div>

            {renderTable(certificates)}
        </div>
    )
}
