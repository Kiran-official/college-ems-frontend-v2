'use client'

import dynamic from 'next/dynamic'
import type { Event, CertificateTemplate } from '@/lib/types/db'

const TemplateBuilder = dynamic(() => import('./TemplateBuilder').then(mod => mod.TemplateBuilder), {
  ssr: false,
  loading: () => <div className="h-[600px] w-full bg-white/5 animate-pulse rounded-xl" />
})

interface Props {
    events: Event[]
    template?: CertificateTemplate
    basePath: string
}

export function TemplateBuilderWrapper(props: Props) {
    return <TemplateBuilder {...props} />
}
