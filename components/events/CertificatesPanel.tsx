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

    const renderTemplateStatus = () => {
        const pTemplate = templates.find(t => t.certificate_type === 'participation')
        const wTemplate = templates.find(t => t.certificate_type === 'winner')

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
                {/* Participation Template */}
                <div className="glass" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${hasParticipation ? 'rgba(16, 224, 154, 0.3)' : 'rgba(245, 166, 35, 0.3)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {pTemplate?.background_image_url ? (
                            <div style={{ width: 44, height: 32, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                                <img src={pTemplate.background_image_url} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ) : (
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: hasParticipation ? 'rgba(16, 224, 154, 0.1)' : 'rgba(245, 166, 35, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {hasParticipation ? <Check size={16} color="var(--success)" /> : <FileWarning size={16} color="var(--warning)" />}
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Participation Template</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{hasParticipation ? 'Ready to use • Attached' : 'Missing design'}</div>
                        </div>
                    </div>
                    {hasParticipation && pTemplate ? (
                        <Link href={`${createTemplatePath.replace('/create', '')}/${pTemplate.id}`}>
                            <Button size="sm" variant="ghost">Edit</Button>
                        </Link>
                    ) : (
                        <Link href={`${createTemplatePath}?eventId=${eventId}&type=participation`}>
                            <Button size="sm" variant="outline">Create</Button>
                        </Link>
                    )}
                </div>

                {/* Winner Template */}
                <div className="glass" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${hasWinner ? 'rgba(16, 224, 154, 0.3)' : (winners.length > 0 ? 'rgba(245, 166, 35, 0.3)' : 'rgba(255,255,255,0.05)')}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {wTemplate?.background_image_url ? (
                            <div style={{ width: 44, height: 32, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                                <img src={wTemplate.background_image_url} alt="W" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ) : (
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: hasWinner ? 'rgba(16, 224, 154, 0.1)' : (winners.length > 0 ? 'rgba(245, 166, 35, 0.1)' : 'rgba(255,255,255,0.05)'), display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hasWinner || winners.length > 0 ? 1 : 0.5 }}>
                                {hasWinner ? <Check size={16} color="var(--success)" /> : (winners.length > 0 ? <FileWarning size={16} color="var(--warning)" /> : <Award size={16} color="var(--text-tertiary)" />)}
                            </div>
                        )}
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>Winner Template</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {hasWinner ? 'Ready to use • Attached' : (winners.length > 0 ? 'Missing design' : 'Not required')}
                            </div>
                        </div>
                    </div>
                    {hasWinner && wTemplate ? (
                        <Link href={`${createTemplatePath.replace('/create', '')}/${wTemplate.id}`}>
                            <Button size="sm" variant="ghost">Edit</Button>
                        </Link>
                    ) : (
                        <Link href={`${createTemplatePath}?eventId=${eventId}&type=winner`}>
                            <Button size="sm" variant="outline">Create</Button>
                        </Link>
                    )}
                </div>
            </div>
        )
    }

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
                            <td data-label="Student">{cert.student?.name ?? '—'}</td>
                            <td data-label="Type"><Badge variant={cert.certificate_type}>{cert.certificate_type}</Badge></td>
                            <td data-label="Status"><Badge variant={cert.status}>{cert.status}</Badge></td>
                            <td data-label="Generated">{cert.generated_at ? format(new Date(cert.generated_at), 'dd/MM/yyyy') : '—'}</td>
                            <td data-label="Action">
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
