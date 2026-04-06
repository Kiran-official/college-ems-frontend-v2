'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { archiveEventAction, restoreEventAction } from '@/lib/actions/eventActions'
import { Archive, RotateCcw } from 'lucide-react'

export function ArchiveRestoreButtons({ eventId, isActive }: { eventId: string; isActive: boolean }) {
    const [pending, startTransition] = useTransition()
    const router = useRouter()

    function handleClick() {
        if (!confirm(`Are you sure you want to ${isActive ? 'archive' : 'restore'} this event?`)) return

        startTransition(async () => {
            const res = isActive 
                ? await archiveEventAction(eventId) 
                : await restoreEventAction(eventId)

            if (!res.success) {
                alert(res.error || 'Failed to update event')
            } else {
                router.refresh()
            }
        })
    }

    return (
        <Button 
            size="sm" 
            variant={isActive ? 'danger' : 'outline'} 
            onClick={handleClick} 
            loading={pending}
            title={isActive ? 'Archive Event' : 'Restore Event'}
        >
            {isActive ? (
                <>
                    <Archive size={12} /> Archive
                </>
            ) : (
                <>
                    <RotateCcw size={12} /> Restore
                </>
            )}
        </Button>
    )
}
