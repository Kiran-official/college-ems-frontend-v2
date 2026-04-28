'use client'

import { useTransition, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { hardDeleteEventAction } from '@/lib/actions/eventActions'
import { Trash2 } from 'lucide-react'

interface DeleteEventButtonProps {
    eventId: string
    eventTitle: string
}

export function DeleteEventButton({ eventId, eventTitle }: DeleteEventButtonProps) {
    const [pending, startTransition] = useTransition()
    const [showConfirm, setShowConfirm] = useState(false)

    function handleConfirm() {
        startTransition(async () => {
            const result = await hardDeleteEventAction(eventId)
            if (!result.success) {
                alert(result.error ?? 'Failed to delete event')
                setShowConfirm(false)
                return
            }
            window.location.reload()
        })
    }

    return (
        <>
            <Button
                size="sm"
                variant="danger"
                onClick={() => setShowConfirm(true)}
                loading={pending}
                title="Hard Delete"
            >
                <Trash2 size={12} /> Delete
            </Button>
            
            <ConfirmModal
                open={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleConfirm}
                title="Permanently Delete Event"
                description={`Are you sure you want to PERMANENTLY delete "${eventTitle}"? This will also delete all registrations, categories, and related data. This action cannot be undone.`}
                variant="danger"
                loading={pending}
            />
        </>
    )
}
