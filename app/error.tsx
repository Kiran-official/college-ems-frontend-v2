'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[GlobalError]', error)
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
                    An unexpected error occurred. This has been logged and we&apos;ll look into it.
                    You can try again or head back to safety.
                </p>

                <div className="error-page__actions">
                    <button onClick={reset} className="error-page__btn error-page__btn--primary">
                        <RotateCcw size={16} />
                        Try Again
                    </button>
                    <Link href="/" className="error-page__btn error-page__btn--secondary">
                        <Home size={16} />
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
