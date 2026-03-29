interface SpinnerProps {
    size?: 'sm' | 'lg'
    page?: boolean
}

export function Spinner({ size, page }: SpinnerProps) {
    if (page) {
        return (
            <div className="spinner-page">
                <div className="spinner spinner--lg" />
            </div>
        )
    }
    return <div className={`spinner ${size === 'lg' ? 'spinner--lg' : ''}`} />
}
