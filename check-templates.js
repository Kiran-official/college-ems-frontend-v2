
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, ...val] = line.split('=');
        if (key && val) acc[key.trim()] = val.join('=').trim();
        return acc;
    }, {});

async function checkTemplates() {
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: templates, error } = await supabase.from('certificate_templates').select('id, layout_json, html_content').limit(2);

    if (error) {
        console.error('Error fetching templates:', error.message);
    } else {
        templates.forEach(t => {
            console.log(`Template ID: ${t.id}`);
            console.log(`Has HTML: ${!!t.html_content}, Length: ${t.html_content?.length || 0}`);
            console.log(`Has Layout JSON: ${!!t.layout_json}`);
        });
    }
}

checkTemplates().catch(console.error);
