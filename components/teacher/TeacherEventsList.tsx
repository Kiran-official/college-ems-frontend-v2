'use client'

import { useState } from 'react'
import { SearchInput } from '@/components/forms/SearchInput'
import { EventCard } from '@/components/events/EventCard'
import type { Event } from '@/lib/types/db'

interface TeacherEventsListProps {
    initialEvents: Event[]
}

export function TeacherEventsList({ initialEvents }: TeacherEventsListProps) {
    const [searchQuery, setSearchQuery] = useState('')

    const filtered = initialEvents.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="teacher-events-list">
            <div style={{ marginBottom: 24 }}>
                <SearchInput 
                    value={searchQuery} 
                    onChange={setSearchQuery} 
                    placeholder="Search your events..." 
                />
            </div>

            {filtered.length === 0 ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-glass)', borderRadius: 'var(--r-xl)' }}>
                    No matching events found.
                </div>
            ) : (
                <div className="card-grid">
                    {filtered.map(e => (
                        <EventCard key={e.id} event={e} basePath="/teacher/events" />
                    ))}
                </div>
            )}
        </div>
    )
}
