import { SkeletonCard } from '@/components/ui/Skeleton'

export default function StudentCertificatesLoading() {
    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <div className="skeleton" style={{ width: '200px', height: '32px', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ width: '320px', height: '16px' }} />
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
