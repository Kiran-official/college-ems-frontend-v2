import { Search, Home } from 'lucide-react'
import Link from 'next/link'

export default function TeacherNotFound() {
    return (
        <div className="error-page">
            <div className="error-page__mesh">
                <div className="error-page__mesh-circle error-page__mesh-circle--1" />
                <div className="error-page__mesh-circle error-page__mesh-circle--2" />
                <div className="error-page__mesh-circle error-page__mesh-circle--3" />
            </div>

            <div className="error-page__card">
                <div className="error-page__icon-wrap error-page__icon-wrap--404">
                    <Search size={32} />
                </div>

                <div className="error-page__code error-page__code--404">404</div>
                <h1 className="error-page__title">Page not found</h1>
                <p className="error-page__message">
                    This teacher page doesn&apos;t exist or has been moved.
                    Check the URL or return to the teacher dashboard.
                </p>

                <div className="error-page__actions">
                    <Link href="/teacher" className="error-page__btn error-page__btn--primary">
                        <Home size={16} />
                        Teacher Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}
