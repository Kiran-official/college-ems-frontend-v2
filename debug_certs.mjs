
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const eventId = 'a77ab540-e960-4e5a-905c-78765964c945'

async function debug() {
    console.log(`Debugging Event ID: ${eventId}`)
    
    // 1. Get all registrations for this event to check attendance
    const { data: regs } = await supabase
        .from('individual_registrations')
        .select('student_id, attendance_status, student(name)')
        .eq('event_id', eventId)

    const regMap = new Map(regs?.map(r => [r.student_id, r]))

    // 2. Get all certificates for this event
    const { data: certs } = await supabase
        .from('certificates')
        .select('id, student_id, status, certificate_type, error_message')
        .eq('event_id', eventId)

    console.log(`Found ${regs?.length ?? 0} registrations and ${certs?.length ?? 0} certificates.`)

    if (certs) {
        certs.forEach(c => {
            const reg = regMap.get(c.student_id)
            const studentName = (reg?.student as any)?.name ?? 'Unknown'
            console.log(`- Cert [${c.id}] | Student: ${studentName} (${c.student_id}) | Type: ${c.certificate_type} | Status: ${c.status} | Attendance: ${reg?.attendance_status} | Error: ${c.error_message ?? 'None'}`)
        })
    }

    // 3. Highlight violations (cert exists but not attended)
    const violations = certs?.filter(c => {
        const reg = regMap.get(c.student_id)
        return c.certificate_type === 'participation' && reg?.attendance_status !== 'attended'
    })

    if (violations && violations.length > 0) {
        console.warn('--- VIOLATIONS FOUND (Participation cert for non-attendee) ---')
        violations.forEach(v => {
            console.warn(`Violation: ${v.id} for student ${v.student_id} (Attendance: ${regMap.get(v.student_id)?.attendance_status})`)
        })
    } else {
        console.log('No participation certificate violations found.')
    }
}

debug()
