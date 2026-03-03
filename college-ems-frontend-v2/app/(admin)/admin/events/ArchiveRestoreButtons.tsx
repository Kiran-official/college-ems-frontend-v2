'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { archiveEventAction, restoreEventAction } from '@/lib/actions/eventActions'
import { Archive, RotateCcw } from 'lucide-react'

export function ArchiveRestoreButtons({ eventId, isActive }: { eventId: string; isActive: boolean }) {
    const [pending, startTransition] = useTransition()

    function handleClick() {
        startTransition(async () => {
            if (isActive) {
                await archiveEventAction(eventId)
            } else {
                await restoreEventAction(eventId)
            }
            window.location.reload()
        })
    }

    return (
        <Button size="sm" variant={isActive ? 'danger' : 'outline'} onClick={handleClick} loading={pending}>
            {isActive ? <><Archive size={12} /> Archive</> : <><RotateCcw size={12} /> Restore</>}
        </Button>
    )
}
