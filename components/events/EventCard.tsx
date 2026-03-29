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
    const teachers = fic.map(f => f.teacher).filter(Boolean)
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

export function EventCard({ event, basePath, isRegistered }: EventCardProps & { isRegistered?: boolean }) {
    const eventDate = format(new Date(event.event_date), 'dd/MM, hh:mm a')
    const participantLabel = event.participant_type.charAt(0).toUpperCase() + event.participant_type.slice(1)

    return (
        <Link href={`${basePath}/${event.id}`} className="glass event-card-premium">
            <div className="event-card__header">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Badge variant={event.status} className="event-card__status">
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                    {isRegistered && (
                        <Badge variant="success" className="event-card__status">Registered</Badge>
                    )}
                </div>
            </div>

            <div className="event-card__main">
                <h3 className="event-card__title">{event.title}</h3>
                {event.faculty_in_charge && <FacultyPills fic={event.faculty_in_charge} />}
            </div>

            <div className="event-card__footer">
                <div className="event-card__info-row">
                    <div className="event-card__info">
                        <Calendar size={14} className="text-secondary" />
                        <span>{eventDate}</span>
                    </div>
                    <div className="event-card__info">
                        <Users2 size={14} className="text-secondary" />
                        <span>{participantLabel}</span>
                    </div>
                </div>

                <div className="event-card__action">
                    Explore <Eye size={16} />
                </div>
            </div>

            <div className="stat-card__glow" />
        </Link>
    )
}
