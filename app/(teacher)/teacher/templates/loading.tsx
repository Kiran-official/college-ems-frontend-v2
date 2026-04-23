import { SkeletonCard } from '@/components/ui/Skeleton'

export default function TeacherTemplatesLoading() {
    return (
        <div className="page" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="page-header">
                <div className="page-header__title-group">
                    <div className="skeleton" style={{ width: '180px', height: '32px', marginBottom: '8px' }} />
                    <div className="skeleton" style={{ width: '300px', height: '16px' }} />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        </div>
    )
}
