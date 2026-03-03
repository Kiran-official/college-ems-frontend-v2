'use client'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
    open: boolean
    onClose: () => void
    title: string
    subtitle?: string
    large?: boolean
    xlarge?: boolean
    children: ReactNode
    footer?: ReactNode
}

export function Modal({ open, onClose, title, subtitle, large, xlarge, children, footer }: ModalProps) {
    useEffect(() => {
        if (!open) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKey)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKey)
            document.body.style.overflow = ''
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={`modal-box glass ${xlarge ? 'modal-box--xl' : large ? 'modal-box--lg' : ''}`}>
                <div className="modal-title">{title}</div>
                {subtitle && <div className="modal-sub">{subtitle}</div>}
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    )
}
