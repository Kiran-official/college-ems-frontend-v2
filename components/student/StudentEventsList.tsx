'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SearchInput } from '@/components/forms/SearchInput'
import { EventCard } from '@/components/events/EventCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Calendar } from 'lucide-react'
import { Pagination } from '@/components/ui/Pagination'
import type { Event } from '@/lib/types/db'

interface StudentEventsListProps {
    events: Event[]
    registeredIds: Set<string>
    currentTab: 'upcoming' | 'closed' | 'completed'
    currentPage: number
    totalPages: number
    currentSearch: string
}

export function StudentEventsList({ events, registeredIds, currentTab, currentPage, totalPages, currentSearch }: StudentEventsListProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [searchQuery, setSearchQuery] = useState(currentSearch)

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== currentSearch) {
                const params = new URLSearchParams(searchParams.toString())
                if (searchQuery) params.set('search', searchQuery)
                else params.delete('search')
                params.set('page', '1')
                router.push(`${pathname}?${params.toString()}`)
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [searchQuery, currentSearch, pathname, router, searchParams])

    const handleTabChange = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('tab', tab)
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="student-events-list">
            <div style={{ marginBottom: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
                <SearchInput 
                    value={searchQuery} 
                    onChange={setSearchQuery} 
                    placeholder="Search events..." 
                />

                <div className="tabs-container" style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 12, overflowX: 'auto' }}>
                    <button 
                        className={`btn ${currentTab === 'upcoming' ? 'btn--primary' : 'btn--outline'}`}
                        onClick={() => handleTabChange('upcoming')}
                    >
                        Upcoming
                    </button>
                    <button 
                        className={`btn ${currentTab === 'closed' ? 'btn--primary' : 'btn--outline'}`}
                        onClick={() => handleTabChange('closed')}
                    >
                        Closed
                    </button>
                    <button 
                        className={`btn ${currentTab === 'completed' ? 'btn--primary' : 'btn--outline'}`}
                        onClick={() => handleTabChange('completed')}
                    >
                        Completed
                    </button>
                </div>
            </div>

            {events.length === 0 ? (
                <EmptyState 
                    icon={Calendar} 
                    title="No events found" 
                    subtitle={searchQuery ? "Try a different search term." : "Check back later for new events."} 
                />
            ) : (
                <>
                    <div className="event-card-grid">
                        {events.map(e => (
                            <EventCard key={e.id} event={e} basePath="/student/events" isRegistered={registeredIds.has(e.id)} />
                        ))}
                    </div>
                    <Pagination currentPage={currentPage} totalPages={totalPages} />
                </>
            )}
        </div>
    )
}
