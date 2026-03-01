import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success'
    size?: 'sm' | 'md' | 'lg'
    full?: boolean
    loading?: boolean
    children: ReactNode
}

export function Button({
    variant = 'primary',
    size = 'md',
    full = false,
    loading = false,
    children,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const classes = [
        'btn',
        `btn--${variant}`,
        size !== 'md' ? `btn--${size}` : '',
        full ? 'btn--full' : '',
        loading ? 'btn--loading' : '',
        className,
    ].filter(Boolean).join(' ')

    return (
        <button className={classes} disabled={disabled || loading} {...props}>
            {loading && <span className="spinner" />}
            {children}
        </button>
    )
}
