import { requireSession } from '@/lib/session'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Award } from 'lucide-react'
import { format } from 'date-fns'
import { createSSRClient } from '@/lib/supabase/server'

export default async function TeacherCertificatesPage() {
    const session = await requireSession()

    // Get events this teacher is assigned to
    const supabase = await createSSRClient()
    const { data: ficRows } = await supabase
        .from('faculty_in_charge')
        .select('event_id')
        .eq('teacher_id', session.id)
    const eventIds = [...new Set(ficRows?.map(r => r.event_id) ?? [])]

    let certificates: any[] = []
    if (eventIds.length > 0) {
        const { data } = await supabase
            .from('certificates')
            .select(`
                *,
                student:users!certificates_student_id_fkey(id, name, email),
                event:events(id, title)
            `)
            .in('event_id', eventIds)
            .order('created_at', { ascending: false })
        certificates = data ?? []
    }

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <h1 className="page-title">Certificates</h1>
                    <p className="page-sub">Certificates for your events</p>
                </div>
            </div>

            {certificates.length === 0 ? (
                <EmptyState icon={Award} title="No certificates" subtitle="Certificates for your events will appear here." />
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
                                    {certificates.map((cert: any) => (
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
                        {certificates.map((cert: any) => (
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
