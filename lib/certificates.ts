import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Shared utility to check if a student or team has been declared a winner for an event.
 */
export async function isWinner(
    supabase: SupabaseClient,
    participantId?: string,
    teamId?: string
): Promise<boolean> {
    const orParts = []
    if (participantId) orParts.push(`student_id.eq.${participantId}`)
    if (teamId) orParts.push(`team_id.eq.${teamId}`)

    if (orParts.length === 0) return false

    const { data } = await supabase
        .from('winners')
        .select('id')
        .or(orParts.join(','))
        .limit(1)

    return (data?.length ?? 0) > 0
}

/**
 * Consolidates the logic for prepares and inserting certificates for an event.
 * Ensures that winners DO NOT receive participation certificates.
 */
export async function issueEventCertificates(
    admin: SupabaseClient,
    eventId: string
): Promise<{ success: boolean; queued: number; error?: string }> {
    try {
        // 1. Fetch active templates
        const { data: templates, error: templateError } = await admin
            .from('certificate_templates')
            .select('certificate_type')
            .eq('event_id', eventId)
            .eq('is_active', true)

        if (templateError) return { success: false, queued: 0, error: templateError.message }
        if (!templates || templates.length === 0) return { success: false, queued: 0, error: 'No active certificate templates found.' }

        const hasParticipationTemplate = templates.some(t => t.certificate_type === 'participation')
        const hasWinnerTemplate = templates.some(t => t.certificate_type === 'winner')

        // 2. Fetch existing winners once to avoid N+1 queries later
        const { data: eventWinners } = await admin
            .from('winners')
            .select('id, student_id, team_id, winner_type')
            .eq('event_id', eventId)

        const winnerStudentIds = new Set<string>()
        const winnerTeamIds = new Set<string>()

        if (eventWinners) {
            for (const w of eventWinners) {
                if (w.student_id) winnerStudentIds.add(w.student_id)
                if (w.team_id) winnerTeamIds.add(w.team_id)
            }
        }

        const allToInsert: any[] = []

        // 3. Prepare Winner Certificates
        if (hasWinnerTemplate && eventWinners) {
            for (const w of eventWinners) {
                if (w.winner_type === 'student' && w.student_id) {
                    allToInsert.push({
                        winner_id: w.id,
                        student_id: w.student_id,
                        event_id: eventId,
                        certificate_type: 'winner',
                        status: 'pending'
                    })
                } else if (w.winner_type === 'team' && w.team_id) {
                    const { data: members } = await admin
                        .from('team_members')
                        .select('student_id')
                        .eq('team_id', w.team_id)
                        .eq('status', 'approved')

                    members?.forEach(m => {
                        allToInsert.push({
                            winner_id: w.id,
                            student_id: m.student_id,
                            event_id: eventId,
                            certificate_type: 'winner',
                            status: 'pending'
                        })
                    })
                }
            }
        }

        // 4. Prepare Participation Certificates
        if (hasParticipationTemplate) {
            const { data: attendees } = await admin
                .from('individual_registrations')
                .select('student_id, team_id')
                .eq('event_id', eventId)
                .eq('attendance_status', 'attended')

            if (attendees) {
                for (const a of attendees) {
                    // Check if attendee is a winner (skip participation if they are)
                    if (winnerStudentIds.has(a.student_id)) continue
                    if (a.team_id && winnerTeamIds.has(a.team_id)) continue

                    allToInsert.push({
                        student_id: a.student_id,
                        event_id: eventId,
                        certificate_type: 'participation',
                        status: 'pending'
                    })
                }
            }
        }

        // 5. Execute with Upsert (onConflict) to handle race conditions
        // We rely on the UNIQUE(event_id, student_id, certificate_type) constraint
        if (allToInsert.length > 0) {
            const { error: insertError } = await admin
                .from('certificates')
                .upsert(allToInsert, { 
                    onConflict: 'event_id,student_id,certificate_type',
                    ignoreDuplicates: true // Don't overwrite if it already exists
                })
            
            if (insertError) return { success: false, queued: 0, error: insertError.message }
        }

        return { success: true, queued: allToInsert.length }
    } catch (err: any) {
        return { success: false, queued: 0, error: err.message || 'Failed to issue certificates' }
    }
}
