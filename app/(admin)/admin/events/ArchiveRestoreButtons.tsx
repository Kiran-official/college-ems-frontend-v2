'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { archiveEventAction, restoreEventAction } from '@/lib/actions/eventActions'
import { Archive, RotateCcw } from 'lucide-react'

export function ArchiveRestoreButtons({ eventId, isActive }: { eventId: string; isActive: boolean }) {
    const [pending, startTransition] = useTransition()
    const [showConfirm, setShowConfirm] = useState(false)
    const router = useRouter()

    function handleConfirm() {
        startTransition(async () => {
            const res = isActive 
                ? await archiveEventAction(eventId) 
                : await restoreEventAction(eventId)

            if (!res.success) {
                alert(res.error || 'Failed to update event')
            } else {
                router.refresh()
            }
            setShowConfirm(false)
        })
    }

    return (
        <>
            <Button 
                size="sm" 
                variant={isActive ? 'danger' : 'outline'} 
                onClick={() => setShowConfirm(true)} 
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
            
            <ConfirmModal
                open={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleConfirm}
                title={isActive ? 'Archive Event' : 'Restore Event'}
                description={`Are you sure you want to ${isActive ? 'archive' : 'restore'} this event?`}
                variant={isActive ? 'warning' : 'default'}
                loading={pending}
            />
        </>
    )
}
