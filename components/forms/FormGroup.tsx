import type { ReactNode } from 'react'

interface FormGroupProps {
    label: string
    required?: boolean
    error?: string
    helper?: string
    children: ReactNode
    htmlFor?: string
}

export function FormGroup({ label, required, error, helper, children, htmlFor }: FormGroupProps) {
    return (
        <div className="form-group">
            <label className={`form-label ${required ? 'form-label--required' : ''}`} htmlFor={htmlFor}>
                {label}
            </label>
            {children}
            {error && <div className="form-error">{error}</div>}
            {helper && !error && <div className="form-helper">{helper}</div>}
        </div>
    )
}
