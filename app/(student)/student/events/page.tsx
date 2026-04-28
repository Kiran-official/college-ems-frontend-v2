import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/session'
import { getPaginatedStudentEvents } from '@/lib/queries/events'
import { getRegistrationsByStudent } from '@/lib/queries/registrations'
import { StudentEventsList } from '@/components/student/StudentEventsList'

export default async function StudentEventsPage({
    searchParams
}: {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const session = await requireSession()

    // Fetch student_type from app_metadata or lightweight DB query
    let studentType = session.app_metadata?.student_type
    if (!studentType) {
        const { createSSRClient } = await import('@/lib/supabase/server')
        const { data } = await (await createSSRClient()).from('users').select('student_type').eq('id', session.id).single()
        studentType = data?.student_type
    }

    const isExternal = studentType === 'external'

    const page = Number(params?.page) || 1
    const search = params?.search as string || ''
    const tab = (params?.tab as 'upcoming' | 'closed' | 'completed') || 'upcoming'

    const [{ data: events, count }, myRegs] = await Promise.all([
        getPaginatedStudentEvents({
            tab,
            page,
            limit: 20,
            search,
            studentId: session.id,
            isExternal
        }),
        getRegistrationsByStudent(session.id)
    ])

    const totalPages = Math.ceil(count / 20)
    const registeredIds = new Set(myRegs.map(r => r.event_id))

    return (
        <div className="page">
            <div className="mesh-bg" style={{ pointerEvents: 'none' }}>
                <div className="mesh-circle" style={{ width: '800px', height: '800px', top: '-100px', left: '-200px', background: 'var(--accent)', opacity: 0.3 }} />
                <div className="mesh-circle" style={{ width: '600px', height: '600px', bottom: '-200px', right: '-100px', background: 'var(--accent-secondary)', animationDelay: '-8s', opacity: 0.2 }} />
            </div>

            <div className="page-header">
                <div className="page-header__title-group">
                    <h1 className="page-title">Events</h1>
                    <p className="page-sub">Discover, register, and track events</p>
                </div>
            </div>

            <StudentEventsList 
                events={events} 
                registeredIds={registeredIds} 
                currentTab={tab}
                currentPage={page}
                totalPages={totalPages}
                currentSearch={search}
            />
        </div>
    )
}
