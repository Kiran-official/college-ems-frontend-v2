import { NextResponse } from 'next/server';
import { autoClosePastEventsAction } from '@/lib/actions/eventActions';

export async function GET(request: Request) {
    // 1. Authenticate the Cron request
    // Vercel sends an Authorization header with a Bearer token matching CRON_SECRET
    const authHeader = request.headers.get('authorization');
    
    // Accept requests either specifically from vercel cron OR manually if using a custom secret key 
    // This provides fallback security if not on vercel but still manually curling
    if (!process.env.CRON_SECRET) {
        return NextResponse.json({ success: false, error: 'CRON_SECRET environment variable is not configured' }, { status: 500 });
    }
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
    }

    try {
        const result = await autoClosePastEventsAction();
        
        if (!result.success) {
            console.error('Cron Event Close Failed:', result.error);
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
        
        console.log(`Cron execution successful. Closed ${result.closedCount} events.`);
        return NextResponse.json({ success: true, closedCount: result.closedCount });
        
    } catch (error) {
        console.error('Cron Execution Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
