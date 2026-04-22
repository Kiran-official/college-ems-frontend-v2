import { SkeletonCard } from '@/components/ui/Skeleton'

export default function StudentLoading() {
    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <div className="skeleton" style={{ width: '220px', height: '32px', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ width: '200px', height: '16px' }} />
                </div>
            </div>

            <div className="bento-grid card-grid">
                <div className="bento-item"><SkeletonCard /></div>
                <div className="bento-item"><SkeletonCard /></div>
                <div className="bento-item"><SkeletonCard /></div>
                <div className="bento-item"><SkeletonCard /></div>
            </div>
        </div>
    )
}
