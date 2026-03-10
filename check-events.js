const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const EVENT_SELECT = `
    *,
    department:departments(*),
    creator:users!events_created_by_fkey(id, name, email, role),
    faculty_in_charge:faculty_in_charge!faculty_in_charge_event_id_fkey(*, teacher:users!fic_teacher_fkey(id, name, email))
`;

async function check() {
    const tables = [
        'certificates',
        'certificate_templates',
        'winners',
        'individual_registrations',
        'teams',
        'faculty_in_charge',
        'event_categories'
    ];

    console.log('--- Checking Columns for Event-Related Tables ---');
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('event_id').limit(1);
            if (error) {
                console.log(`Table ${table}: DOES NOT have event_id (Error: ${error.message})`);
            } else {
                console.log(`Table ${table}: HAS event_id`);
            }
        } catch (e) {
            console.log(`Table ${table}: FAILED with exception: ${e.message}`);
        }
    }
}

check();
