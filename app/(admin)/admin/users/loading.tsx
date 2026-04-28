export default function UsersLoading() {
    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header__title-group">
                    <div className="skeleton" style={{ height: 40, width: 280, borderRadius: 'var(--r-md)', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 18, width: 320, borderRadius: 'var(--r-sm)' }} />
                </div>
            </div>
            <div className="skeleton" style={{ height: 44, borderRadius: 'var(--r-md)', marginBottom: 24 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="skeleton" style={{ height: 48, borderRadius: 'var(--r-md)' }} />
                ))}
            </div>
        </div>
    )
}
