import { SkeletonCard } from '@/components/ui/Skeleton'

export default function TeacherLoading() {
    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <div className="skeleton" style={{ width: '180px', height: '32px', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ width: '250px', height: '16px' }} />
                </div>
            </div>

            <div className="card-grid">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>

            <div className="glow-bg glow-bg--violet" style={{ width: '400px', height: '400px', top: '-100px', right: '-100px', position: 'fixed', opacity: 0.1, pointerEvents: 'none' }} />
        </div>
    )
}
