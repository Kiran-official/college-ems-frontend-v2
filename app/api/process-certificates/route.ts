import { NextRequest, NextResponse } from 'next/server'
import { processPendingCertificates } from '@/lib/processing'

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
    // Verify the request comes from our own server (simple shared-secret check)
    const authHeader = req.headers.get('x-internal-secret')
    if (authHeader !== SERVICE_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const result = await processPendingCertificates()
        return NextResponse.json(result)
    } catch (err: any) {
        console.error('[process-certificates] API Error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
