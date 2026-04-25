'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function TeacherError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[TeacherError]', error)
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
                    An error occurred in the teacher portal. This has been logged automatically.
                    Try again or return to the teacher dashboard.
                </p>

                <div className="error-page__actions">
                    <button onClick={reset} className="error-page__btn error-page__btn--primary">
                        <RotateCcw size={16} />
                        Try Again
                    </button>
                    <Link href="/teacher" className="error-page__btn error-page__btn--secondary">
                        <Home size={16} />
                        Teacher Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}
