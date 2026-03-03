import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/queries/users'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Award } from 'lucide-react'
import { format } from 'date-fns'
import { createSSRClient } from '@/lib/supabase/server'

export default async function TeacherCertificatesPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    // Get events this teacher is assigned to
    const supabase = await createSSRClient()
    const { data: ficRows } = await supabase
        .from('faculty_in_charge')
        .select('event_id')
        .eq('teacher_id', user.id)
<<<<<<< HEAD
    const eventIds = [...new Set(ficRows?.map(r => r.event_id) ?? [])]
=======
    const eventIds = [...new Set((ficRows as any)?.map((r: any) => r.event_id) ?? [])]
>>>>>>> f3a7296793f0bfbe32432215f4c41ffc0412d229

    let certificates: any[] = []
    if (eventIds.length > 0) {
        const { data } = await supabase
            .from('certificates')
            .select(`
                *,
                student:users!certificates_student_id_fkey(id, name, email),
                event:events(id, title),
                category:event_categories(id, category_name)
            `)
            .in('event_id', eventIds)
            .order('created_at', { ascending: false })
        certificates = data ?? []
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Certificates</h1>
                <p className="page-sub">Certificates for your events</p>
            </div>

            {certificates.length === 0 ? (
                <EmptyState icon={Award} title="No certificates" subtitle="Certificates for your events will appear here." />
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
                            {certificates.map((cert: any) => (
                                <tr key={cert.id}>
                                    <td>{cert.student?.name ?? '—'}</td>
                                    <td>{cert.event?.title ?? '—'}</td>
                                    <td>{cert.category?.category_name ?? '—'}</td>
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
