import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Fetching last 20 certificates...')
    const { data: certs, error } = await supabase
        .from('certificates')
        .select(`
            id, 
            status, 
            certificate_type, 
            error_message, 
            retry_count, 
            created_at,
            event:events(title),
            student:users(name)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        console.error('Database error:', error)
        return
    }

    if (!certs || certs.length === 0) {
        console.log('No certificates found.')
        return
    }

    certs.forEach(c => {
        console.log(`[${c.created_at}] ID: ${c.id} | Status: ${c.status} | Type: ${c.certificate_type}`)
        console.log(`  Event: ${c.event?.title} | Student: ${c.student?.name}`)
        if (c.error_message) {
            console.log(`  Error: ${c.error_message}`)
        }
        console.log('---')
    })
}

check()
