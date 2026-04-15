'use client'

import { useState } from 'react'
import { SearchInput } from '@/components/forms/SearchInput'
import { EventCard } from '@/components/events/EventCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar } from 'lucide-react'
import type { Event } from '@/lib/types/db'

interface StudentEventsListProps {
    upcoming: Event[]
    closed: Event[]
    completed: Event[]
    registeredIds: Set<string>
}

export function StudentEventsList({ upcoming, closed, completed, registeredIds }: StudentEventsListProps) {
    const [searchQuery, setSearchQuery] = useState('')

    const filterFn = (e: Event) => e.title.toLowerCase().includes(searchQuery.toLowerCase())

    const upcomingUnfiltered = upcoming.filter(filterFn)
    const filteredClosed = closed.filter(filterFn)
    const filteredCompleted = completed.filter(filterFn)

    // Separate upcoming into Open (unregistered) and Registered Open
    const registeredOpen = upcomingUnfiltered.filter(e => registeredIds.has(e.id))
    const filteredUpcoming = upcomingUnfiltered.filter(e => !registeredIds.has(e.id))

    const hasResults = filteredUpcoming.length > 0 || registeredOpen.length > 0 || filteredClosed.length > 0 || filteredCompleted.length > 0

    return (
        <div className="student-events-list">
            <div style={{ marginBottom: 40 }}>
                <SearchInput 
                    value={searchQuery} 
                    onChange={setSearchQuery} 
                    placeholder="Search all events..." 
                />
            </div>

            {!hasResults ? (
                <EmptyState 
                    icon={Calendar} 
                    title="No matching events" 
                    subtitle={searchQuery ? "Try a different search term." : "Check back later for new events."} 
                />
            ) : (
                <>
                    {/* Section 1: Open for Registration (Unregistered) */}
                    {filteredUpcoming.length > 0 && (
                        <section style={{ marginBottom: 64 }}>
                            <div className="section-header">
                                <div className="status-indicator status-indicator--open" />
                                <h2 className="section-title">Open for Registration</h2>
                            </div>
                            <div className="event-card-grid">
                                {filteredUpcoming.map(e => (
                                    <EventCard key={e.id} event={e} basePath="/student/events" />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Section 2: Registered Events (Open) */}
                    {registeredOpen.length > 0 && (
                        <section style={{ marginBottom: 64 }}>
                            <div className="section-header">
                                <div className="status-indicator status-indicator--open" style={{ background: 'var(--success)' }} />
                                <h2 className="section-title">Registered Events</h2>
                            </div>
                            <div className="event-card-grid">
                                {registeredOpen.map(e => (
                                    <EventCard key={e.id} event={e} basePath="/student/events" isRegistered={true} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Section 3: Ongoing / Closed */}
                    {filteredClosed.length > 0 && (
                        <section style={{ marginBottom: 64 }}>
                            <div className="section-header">
                                <div className="status-indicator status-indicator--closed" />
                                <h2 className="section-title">Ongoing / Closed</h2>
                            </div>
                            <div className="event-card-grid">
                                {filteredClosed.map(e => (
                                    <EventCard key={e.id} event={e} basePath="/student/events" isRegistered={registeredIds.has(e.id)} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Section 4: Completed */}
                    {filteredCompleted.length > 0 && (
                        <section>
                            <div className="section-header">
                                <div className="status-indicator status-indicator--completed" />
                                <h2 className="section-title">Completed</h2>
                            </div>
                            <div className="event-card-grid">
                                {filteredCompleted.map(e => (
                                    <EventCard key={e.id} event={e} basePath="/student/events" isRegistered={registeredIds.has(e.id)} />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    )
}
