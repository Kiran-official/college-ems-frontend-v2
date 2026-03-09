import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTeams() {
    const { data: teams, error } = await supabase
        .from('teams')
        .select('id, team_name, created_at, created_by, members:team_members(id, student_id, status)')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error(error);
    } else {
        console.log("Recent Teams:", JSON.stringify(teams, null, 2));
    }

    const { data: regs, error: regError } = await supabase
        .from('individual_registrations')
        .select('*')
        .order('registered_at', { ascending: false })
        .limit(3);

    if (regError) {
        console.error(regError);
    } else {
        console.log("Recent Registrations:", JSON.stringify(regs, null, 2));
    }
}

checkTeams();
