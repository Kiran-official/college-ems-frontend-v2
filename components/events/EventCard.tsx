import Link from 'next/link'
import { Calendar, Users2, User as UserIcon, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import type { Event, FacultyInCharge } from '@/lib/types/db'

interface EventCardProps {
    event: Event
    basePath: string // '/admin/events', '/teacher/events', '/student/events'
}

function FacultyPills({ fic }: { fic: FacultyInCharge[] }) {
    // Unique event-level faculty only
    const eventLevel = fic.filter(f => !f.category_id)
    const teachers = eventLevel.map(f => f.teacher).filter(Boolean)
    if (teachers.length === 0) return null

    const show = teachers.slice(0, 2)
    const overflow = teachers.length - 2

    return (
        <div className="faculty-pills">
            {show.map(t => (
                <span key={t!.id} className="faculty-pill">{t!.name}</span>
            ))}
            {overflow > 0 && (
                <span className="faculty-pill" title={teachers.slice(2).map(t => t!.name).join(', ')}>
                    +{overflow} more
                </span>
            )}
        </div>
    )
}

const VISIBILITY_LABEL: Record<string, string> = {
    public_all: 'Open to All',
    internal_only: 'Internal Only',
    external_only: 'External Only',
}

export function EventCard({ event, basePath }: EventCardProps) {
    const eventDate = format(new Date(event.event_date), 'dd/MM/yyyy, hh:mm a')
    const deadline = format(new Date(event.registration_deadline), 'dd/MM/yyyy, hh:mm a')
    const hasCategories = (event.categories?.length ?? 0) > 0

    return (
        <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {event.title}
                </h3>
                <Badge variant={event.status}>{event.status}</Badge>
            </div>

            {event.faculty_in_charge && <FacultyPills fic={event.faculty_in_charge} />}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <Badge variant={event.visibility === 'internal_only' ? 'internal' : event.visibility === 'external_only' ? 'external' : 'info'}>
                    <Eye size={11} /> {VISIBILITY_LABEL[event.visibility] ?? event.visibility}
                </Badge>
                <Badge variant={event.participant_type === 'single' ? 'individual' : 'team'}>
                    {event.participant_type === 'single'
                        ? <><UserIcon size={11} /> Individual</>
                        : <><Users2 size={11} /> Team{event.team_size ? ` (${event.team_size})` : ''}</>
                    }
                </Badge>
                {hasCategories && (
                    <Badge variant="processing">
                        {event.categories!.length} {event.categories!.length === 1 ? 'Category' : 'Categories'}
                    </Badge>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} /> {eventDate}
                </div>
                {event.status === 'open' && (
                    <div style={{ color: 'var(--warning)', fontSize: '0.75rem' }}>
                        Deadline: {deadline}
                    </div>
                )}
            </div>

            <Link
                href={`${basePath}/${event.id}`}
                className="btn btn--outline btn--sm"
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
            >
                View Event →
            </Link>
        </div>
    )
}
