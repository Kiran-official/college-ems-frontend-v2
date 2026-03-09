
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, ...val] = line.split('=');
        if (key && val) acc[key.trim()] = val.join('=').trim();
        return acc;
    }, {});

async function debug() {
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Find "Dasara Dhamaka" events
    const { data: events } = await supabase.from('events').select('id, title').ilike('title', '%Dasara%');
    console.log('--- DASARA EVENTS ---');
    events.forEach(e => console.log(`ID: ${e.id} | Title: ${e.title}`));

    const { data: allCats } = await supabase.from('event_categories').select('*');
    console.log('\n--- ALL CATEGORIES IN DB ---');
    if (!allCats || allCats.length === 0) {
        console.log('NONE FOUND AT ALL');
    } else {
        allCats.forEach(c => console.log(`ID: ${c.id} | EventID: ${c.event_id} | Name: ${c.category_name}`));
    }
}

debug().catch(console.error);
