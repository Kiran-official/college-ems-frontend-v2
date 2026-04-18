import { Suspense } from 'react'
import { createSSRClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginClient from './LoginClient'

export default async function LoginPage() {
    const supabase = await createSSRClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
        redirect('/dashboard')
    }

    return (
        <Suspense fallback={<div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Loading...</div>}>
            <LoginClient />
        </Suspense>
    )
}
