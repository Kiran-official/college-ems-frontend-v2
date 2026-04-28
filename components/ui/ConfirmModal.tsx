'use client'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, Trash2, Info } from 'lucide-react'

interface ConfirmModalProps {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'default'
    loading?: boolean
}

const variantConfig = {
    danger: {
        icon: Trash2,
        iconClass: 'confirm-modal__icon--danger',
        buttonVariant: 'danger' as const,
    },
    warning: {
        icon: AlertTriangle,
        iconClass: 'confirm-modal__icon--warning',
        buttonVariant: 'danger' as const,
    },
    default: {
        icon: Info,
        iconClass: 'confirm-modal__icon--default',
        buttonVariant: 'primary' as const,
    },
}

export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
    loading = false,
}: ConfirmModalProps) {
    const cancelRef = useRef<HTMLButtonElement>(null)
    const config = variantConfig[variant]
    const Icon = config.icon

    useEffect(() => {
        if (!open) return
        // Auto-focus cancel button to prevent accidental confirmation
        setTimeout(() => cancelRef.current?.focus(), 50)
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
            <div className="modal-box glass confirm-modal">
                <div className={`confirm-modal__icon ${config.iconClass}`}>
                    <Icon size={24} />
                </div>
                <div className="confirm-modal__title">{title}</div>
                <div className="confirm-modal__desc">{description}</div>
                <div className="confirm-modal__actions">
                    <button
                        ref={cancelRef}
                        className="btn btn--ghost"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <Button
                        variant={config.buttonVariant}
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    )
}
