
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, ...val] = line.split('=');
        if (key && val) acc[key.trim()] = val.join('=').trim();
        return acc;
    }, {});

async function checkFinalStatus() {
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('--- Checking Global Certificate Status ---');
    const { data: stats, error } = await supabase
        .from('certificates')
        .select('id, status, error_message');

    if (error) {
        console.error('Error fetching certificates:', error.message);
    } else {
        const counts = stats.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            if (curr.error_message) {
                console.log(`[${curr.id}] Error: ${curr.error_message}`);
            }
            return acc;
        }, {});
        console.log('Current status counts:', counts);
    }
}

checkFinalStatus().catch(console.error);
