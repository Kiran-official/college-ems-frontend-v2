import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

async function migrate() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env')
        process.exit(1)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    console.log('--- EMS Metadata Migration ---')
    console.log('Fetching users from public.users table...')

    const { data: users, error: dbError } = await supabase
        .from('users')
        .select('id, role, is_active, must_change_password')

    if (dbError) {
        console.error('Failed to fetch users:', dbError.message)
        process.exit(1)
    }

    if (!users || users.length === 0) {
        console.log('No users found in database.')
        return
    }

    console.log(`Found ${users.length} users. Proceeding with app_metadata sync...`)

    let successCount = 0
    let failCount = 0

    for (const user of users) {
        process.stdout.write(`Syncing user ${user.id} (${user.role})... `)
        
        try {
            const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
                app_metadata: {
                    role: user.role,
                    is_active: user.is_active,
                    must_change_password: user.must_change_password
                }
            })

            if (authError) {
                console.log(`[FAILED] - ${authError.message}`)
                failCount++
            } else {
                console.log('[SUCCESS]')
                successCount++
            }
        } catch (err) {
            console.log(`[ERROR] - ${err instanceof Error ? err.message : 'Unknown'}`)
            failCount++
        }
    }

    console.log('\n--- Migration Finished ---')
    console.log(`Successfully synced: ${successCount}`)
    console.log(`Failed: ${failCount}`)
    
    if (failCount > 0) {
        console.log('Please check the failures and re-run if necessary.')
    } else {
        console.log('All user metadata is now in sync for Zero-DB middleware pathing.')
    }
}

migrate().catch(err => {
    console.error('Fatal migration error:', err)
    process.exit(1)
})
