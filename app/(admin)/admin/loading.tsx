import { SkeletonCard } from '@/components/ui/Skeleton'

export default function AdminLoading() {
    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <div className="skeleton" style={{ width: '200px', height: '32px', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ width: '300px', height: '16px' }} />
                </div>
            </div>

            <div className="card-grid">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>

            <div className="glow-bg glow-bg--cyan" style={{ width: '400px', height: '400px', top: '-100px', right: '-100px', position: 'fixed', opacity: 0.1, pointerEvents: 'none' }} />
        </div>
    )
}
