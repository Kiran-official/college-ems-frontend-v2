'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { retryAllFailedCertificatesAction } from '@/lib/actions/certificateActions'
import { RotateCcw } from 'lucide-react'

export function CertAdminActions({ failedCount }: { failedCount: number }) {
    const [pending, startTransition] = useTransition()

    function retryAll() {
        startTransition(async () => {
            await retryAllFailedCertificatesAction()
            window.location.reload()
        })
    }

    return (
        <Button variant="outline" size="sm" onClick={retryAll} loading={pending}>
            <RotateCcw size={14} /> Retry All Failed ({failedCount})
        </Button>
    )
}
