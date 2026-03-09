const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envLocalPath = path.resolve('.env');
const envContent = fs.readFileSync(envLocalPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';
envContent.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: teams } = await supabase.from('teams').select('*').order('created_at', { ascending: false }).limit(3);
    const { data: regs } = await supabase.from('individual_registrations').select('*').order('registered_at', { ascending: false }).limit(3);
    fs.writeFileSync('db-inspect.json', JSON.stringify({ teams, regs }, null, 2));
}
check();
