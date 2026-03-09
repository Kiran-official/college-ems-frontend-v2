
import { createAdminClient } from './lib/supabase/server';

async function debug() {
    const admin = createAdminClient();

    console.log('--- EVENTS ---');
    const { data: events } = await admin.from('events').select('id, title').eq('is_active', true);
    console.log(JSON.stringify(events, null, 2));

    console.log('\n--- CATEGORIES ---');
    const { data: cats } = await admin.from('event_categories').select('*');
    console.log(JSON.stringify(cats, null, 2));
}

debug();
