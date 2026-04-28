'use client'

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
    totalPages: number
    currentPage: number
}

export function Pagination({ totalPages, currentPage }: PaginationProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const router = useRouter()

    if (totalPages <= 1) return null

    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', pageNumber.toString())
        return `${pathname}?${params.toString()}`
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
            <button
                className="btn btn--outline btn--sm"
                disabled={currentPage <= 1}
                onClick={() => router.push(createPageURL(currentPage - 1))}
            >
                <ChevronLeft size={16} /> Prev
            </button>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, padding: '0 16px', color: 'var(--text-secondary)' }}>
                Page {currentPage} of {totalPages}
            </span>
            <button
                className="btn btn--outline btn--sm"
                disabled={currentPage >= totalPages}
                onClick={() => router.push(createPageURL(currentPage + 1))}
            >
                Next <ChevronRight size={16} />
            </button>
        </div>
    )
}
