'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { hardDeleteEventAction } from '@/lib/actions/eventActions'
import { Trash2 } from 'lucide-react'

interface DeleteEventButtonProps {
    eventId: string
    eventTitle: string
}

export function DeleteEventButton({ eventId, eventTitle }: DeleteEventButtonProps) {
    const [pending, startTransition] = useTransition()

    async function handleDelete() {
        const confirmed = window.confirm(
            `Are you sure you want to PERMANENTLY delete the event "${eventTitle}"?\n\nThis will also delete all registrations, categories, and related data. This action cannot be undone.`
        )

        if (!confirmed) return

        startTransition(async () => {
            const result = await hardDeleteEventAction(eventId)
            if (!result.success) {
                alert(result.error ?? 'Failed to delete event')
                return
            }
            window.location.reload()
        })
    }

    return (
        <Button
            size="sm"
            variant="danger"
            onClick={handleDelete}
            loading={pending}
            title="Hard Delete"
        >
            <Trash2 size={12} /> Delete
        </Button>
    )
}
