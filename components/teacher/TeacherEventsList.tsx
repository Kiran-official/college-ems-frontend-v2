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
    const [statusFilter, setStatusFilter] = useState<string>('all')

    const filtered = initialEvents.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase())
        
        let matchesStatus = statusFilter === 'all' || e.status === statusFilter
        
        // Smart derived statuses
        if (statusFilter === 'processing') {
            matchesStatus = e.status === 'closed' && !e.results_published
        } else if (statusFilter === 'published') {
            matchesStatus = e.status === 'closed' && e.results_published
        }
        
        return matchesSearch && matchesStatus
    })

    return (
        <div className="teacher-events-list">
            <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <SearchInput 
                    value={searchQuery} 
                    onChange={setSearchQuery} 
                    placeholder="Search your events..." 
                />

                <div style={{ position: 'relative', minWidth: 160 }}>
                    <select
                        className="form-input"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ paddingRight: 32 }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="open">Open (Registration)</option>
                        <option value="closed">Closed (Event Over)</option>
                        <option value="processing">Processing (Selecting Winners)</option>
                        <option value="published">Published (Results Out)</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
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
