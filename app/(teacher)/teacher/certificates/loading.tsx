import { SkeletonCard } from '@/components/ui/Skeleton'

export default function TeacherCertificatesLoading() {
    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <div className="skeleton" style={{ width: '180px', height: '32px', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ width: '280px', height: '16px' }} />
                </div>
            </div>

            <div className="card-grid">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        </div>
    )
}
