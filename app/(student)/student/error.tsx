'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function StudentError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[StudentError]', error)
    }, [error])

    return (
        <div className="error-page">
            <div className="error-page__mesh">
                <div className="error-page__mesh-circle error-page__mesh-circle--1" />
                <div className="error-page__mesh-circle error-page__mesh-circle--2" />
                <div className="error-page__mesh-circle error-page__mesh-circle--3" />
            </div>

            <div className="error-page__card">
                <div className="error-page__icon-wrap">
                    <AlertTriangle size={32} />
                </div>

                <div className="error-page__code">500</div>
                <h1 className="error-page__title">Something went wrong</h1>
                <p className="error-page__message">
                    An error occurred while loading this page. This has been logged automatically.
                    Try again or return to your dashboard.
                </p>

                <div className="error-page__actions">
                    <button onClick={reset} className="error-page__btn error-page__btn--primary">
                        <RotateCcw size={16} />
                        Try Again
                    </button>
                    <Link href="/student" className="error-page__btn error-page__btn--secondary">
                        <Home size={16} />
                        My Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}
