import { Suspense } from 'react'
import { createSSRClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginClient from './LoginClient'

export default async function LoginPage() {
    const supabase = await createSSRClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
        redirect('/dashboard')
    }

    return (
        <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Loading...</div>}>
            <LoginClient />
        </Suspense>
    )
}
