import { SkeletonCard } from '@/components/ui/Skeleton'

export default function StudentEventsLoading() {
    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <div className="skeleton" style={{ width: '160px', height: '32px', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ width: '260px', height: '16px' }} />
                </div>
            </div>

            <div className="card-grid">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        </div>
    )
}
