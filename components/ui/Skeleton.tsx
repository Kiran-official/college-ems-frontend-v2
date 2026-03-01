interface SkeletonProps {
    width?: string
    height?: string
    className?: string
}

export function Skeleton({ width = '100%', height = '20px', className = '' }: SkeletonProps) {
    return <div className={`skeleton ${className}`} style={{ width, height }} />
}

export function SkeletonCard() {
    return (
        <div className="glass stat-card">
            <Skeleton width="44px" height="44px" />
            <Skeleton width="80px" height="36px" />
            <Skeleton width="120px" height="12px" />
        </div>
    )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="table-wrap">
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from({ length: rows }).map((_, i) => (
                    <Skeleton key={i} height="40px" />
                ))}
            </div>
        </div>
    )
}
