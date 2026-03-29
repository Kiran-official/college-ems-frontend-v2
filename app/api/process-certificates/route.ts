import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { TemplateLayout, TemplateField } from '@/lib/types/db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// A4 Landscape dimensions in PDF points (72 pt = 1 inch)
const PAGE_WIDTH = 841.89
const PAGE_HEIGHT = 595.28

function createAdmin() {
    return createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    })
}

/** Convert a hex colour string like #FFFFFF to pdf-lib rgb() values */
function hexToRgb(hex: string) {
    const clean = hex.replace('#', '')
    const r = parseInt(clean.substring(0, 2), 16) / 255
    const g = parseInt(clean.substring(2, 4), 16) / 255
    const b = parseInt(clean.substring(4, 6), 16) / 255
    return rgb(r, g, b)
}

/** Download a remote image as ArrayBuffer (or null on failure) */
async function fetchImageBytes(url: string): Promise<ArrayBuffer | null> {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (!res.ok) return null
        return await res.arrayBuffer()
    } catch {
        return null
    }
}

/** Resolve the text to render for a given template field */
function resolveFieldText(
    field: TemplateField,
    context: {
        studentName: string
        eventName: string
        eventDate: string
        certType: string
        positionLabel: string
    }
): string {
    switch (field.field_type) {
        case 'student_name':   return context.studentName
        case 'event_name':     return context.eventName
        case 'date':           return context.eventDate
        case 'certificate_type':
            return context.certType === 'winner' ? 'Winner Certificate' : 'Participation Certificate'
        case 'position':       return context.positionLabel || ''
        case 'custom':         return field.customText ?? ''
        default:               return ''
    }
}

export async function POST(req: NextRequest) {
    // Verify the request comes from our own server (simple shared-secret check)
    const authHeader = req.headers.get('x-internal-secret')
    if (authHeader !== SERVICE_KEY) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdmin()

    // 1. Fetch pending certificates (process up to 50 per run)
    const { data: pending, error: fetchErr } = await admin
        .from('certificates')
        .select(`
            id,
            event_id,
            student_id,
            certificate_type,
            winner_id,
            student:users!certificates_student_id_fkey(name),
            event:events(title, event_date),
            winner:winners(position_label)
        `)
        .eq('status', 'pending')
        .limit(50)

    if (fetchErr) {
        return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    if (!pending || pending.length === 0) {
        return NextResponse.json({ processed: 0, message: 'No pending certificates' })
    }

    // Ensure the 'certificates' storage bucket exists
    const { data: buckets } = await admin.storage.listBuckets()
    if (!buckets?.find(b => b.name === 'certificates')) {
        await admin.storage.createBucket('certificates', { public: true, fileSizeLimit: 10485760 })
    }

    let processed = 0
    let failed = 0

    for (const cert of pending) {
        // Mark as processing immediately
        await admin
            .from('certificates')
            .update({ status: 'processing' })
            .eq('id', cert.id)

        try {
            // 2. Fetch matching active template
            const { data: templates } = await admin
                .from('certificate_templates')
                .select('id, layout_json, background_image_url')
                .eq('event_id', cert.event_id)
                .eq('certificate_type', cert.certificate_type)
                .eq('is_active', true)
                .limit(1)

            const template = templates?.[0]
            if (!template) {
                throw new Error(`No active ${cert.certificate_type} template found for event`)
            }

            const layout = template.layout_json as TemplateLayout
            const studentName = (cert.student as { name?: string })?.name ?? 'Student'
            const eventTitle = (cert.event as { title?: string; event_date?: string })?.title ?? 'Event'
            const rawDate = (cert.event as { title?: string; event_date?: string })?.event_date ?? ''
            const eventDate = rawDate
                ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                : ''
            const positionLabel = (cert.winner as { position_label?: string })?.position_label ?? ''

            const context = {
                studentName,
                eventName: eventTitle,
                eventDate,
                certType: cert.certificate_type,
                positionLabel,
            }

            // 3. Build the PDF
            const pdfDoc = await PDFDocument.create()
            const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])

            // Embed background image if available
            if (template.background_image_url) {
                const imgBytes = await fetchImageBytes(template.background_image_url)
                if (imgBytes) {
                    try {
                        // Try PNG first, fall back to JPEG
                        let embeddedImg
                        const url = template.background_image_url.toLowerCase()
                        if (url.includes('.png') || url.includes('png')) {
                            embeddedImg = await pdfDoc.embedPng(imgBytes).catch(() => null)
                        }
                        if (!embeddedImg) {
                            embeddedImg = await pdfDoc.embedJpg(imgBytes).catch(() => null)
                        }
                        if (!embeddedImg) {
                            // Last resort: try the other format
                            embeddedImg = await pdfDoc.embedPng(imgBytes).catch(() => null)
                        }
                        if (embeddedImg) {
                            page.drawImage(embeddedImg, {
                                x: 0,
                                y: 0,
                                width: PAGE_WIDTH,
                                height: PAGE_HEIGHT,
                            })
                        }
                    } catch {
                        // Skip background on error — still generate certificate
                    }
                }
            }

            // 4. Draw each text field
            const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
            const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
            const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
            const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique)

            for (const field of layout.fields) {
                const text = resolveFieldText(field, context)
                if (!text) continue

                // pdf-lib origin is bottom-left; template uses top-left percentages
                const xPt = (field.x / 100) * PAGE_WIDTH
                const yFromTop = (field.y / 100) * PAGE_HEIGHT
                const yPt = PAGE_HEIGHT - yFromTop    // flip to pdf-lib coordinate space

                const fontSize = field.fontSize
                const color = hexToRgb(field.color || '#000000')

                // Choose font variant
                let font = helvetica
                if (field.bold && field.italic) font = helveticaBoldOblique
                else if (field.bold) font = helveticaBold
                else if (field.italic) font = helveticaOblique

                // Calculate text width for alignment
                const textWidth = font.widthOfTextAtSize(text, fontSize)
                const fieldWidth = (field.width / 100) * PAGE_WIDTH
                let drawX = xPt - fieldWidth / 2  // default: x is center of field

                if (field.align === 'center') {
                    drawX = xPt - textWidth / 2
                } else if (field.align === 'right') {
                    drawX = xPt + fieldWidth / 2 - textWidth
                } else {
                    // left — x marks the left edge of the field
                    drawX = xPt - fieldWidth / 2
                }

                page.drawText(text, {
                    x: Math.max(0, drawX),
                    y: Math.max(0, yPt - fontSize / 2),
                    size: fontSize,
                    font,
                    color,
                })
            }

            // 5. Serialise PDF to bytes
            const pdfBytes = await pdfDoc.save()

            // 6. Upload to Supabase Storage
            const filePath = `${cert.event_id}/${cert.id}.pdf`
            const { error: uploadError } = await admin.storage
                .from('certificates')
                .upload(filePath, pdfBytes, {
                    contentType: 'application/pdf',
                    upsert: true,
                })

            if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)

            // 7. Get public URL
            const { data: urlData } = admin.storage.from('certificates').getPublicUrl(filePath)

            // 8. Mark certificate as generated
            await admin
                .from('certificates')
                .update({
                    status: 'generated',
                    file_path: urlData.publicUrl,
                    generated_at: new Date().toISOString(),
                    error_message: null,
                })
                .eq('id', cert.id)

            processed++
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            console.error(`[process-certificates] cert ${cert.id} failed:`, message)

            await admin
                .from('certificates')
                .update({
                    status: 'failed',
                    error_message: message,
                })
                .eq('id', cert.id)

            failed++
        }
    }

    return NextResponse.json({ processed, failed, total: pending.length })
}
