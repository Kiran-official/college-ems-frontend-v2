// ═══════════════════════════════════════════════════════════════
// SICM EMS — Database Types
// ═══════════════════════════════════════════════════════════════

export type UserRole = 'admin' | 'teacher' | 'student'
export type StudentType = 'internal' | 'external'
export type EventStatus = 'draft' | 'open' | 'closed' | 'completed'
export type EventVisibility = 'public_all' | 'internal_only' | 'external_only'
export type ParticipantType = 'single' | 'multiple'
export type AttendanceStatus = 'registered' | 'attended' | 'absent'
export type CertificateType = 'participation' | 'winner'
export type CertificateStatus = 'pending' | 'processing' | 'generated' | 'failed'
export type WinnerType = 'student' | 'team'

// ── Core Entities ──────────────────────────────────────────────

export interface Department {
    id: string
    name: string
    is_active: boolean
    created_at: string
}

export interface User {
    id: string
    name: string
    email: string
    phone_number?: string
    role: UserRole
    student_type?: StudentType
    department_id?: string
    programme?: string
    semester?: number

    is_active: boolean
    must_change_password: boolean
    created_at: string
    updated_at?: string
    // Joined fields
    department?: Department
}

export interface Event {
    id: string
    title: string
    description?: string
    event_date: string
    registration_deadline: string
    status: EventStatus
    visibility: EventVisibility
    is_active: boolean
    participant_type: ParticipantType
    team_size?: number
    results_published: boolean
    created_by: string
    department_id?: string
    created_at: string
    updated_at?: string
    // Joined fields
    department?: Department
    creator?: User
    faculty_in_charge?: FacultyInCharge[]
    categories?: any[] // DEPRECATED: Categories have been removed. This remains for partial compatibility.
}

export interface EventCategory {
    id: string
    event_id: string
    category_name: string
    description?: string
    event_date?: string
    participant_type: ParticipantType
    team_size?: number
    created_at: string
    updated_at?: string
}

export interface FacultyInCharge {
    id?: string
    event_id: string
    teacher_id: string
    category_id?: string
    // Joined fields
    teacher?: User
}

// ── Registrations ──────────────────────────────────────────────

export interface IndividualRegistration {
    id: string
    student_id: string
    event_id: string
    category_id?: string
    team_id?: string
    attendance_status: AttendanceStatus
    registered_at: string
    // Joined fields
    student?: User
    event?: Event
    team?: Team
    category?: EventCategory
}

export interface Team {
    id: string
    event_id: string
    team_name: string
    created_by: string
    created_at: string
    // Joined fields
    members?: TeamMember[]
    creator?: User
}

export interface TeamMember {
    id: string
    team_id: string
    student_id: string
    status: 'pending' | 'approved'
    joined_at: string
    invited_by?: string | null
    // Joined fields
    student?: User
}

// ── Winners ────────────────────────────────────────────────────

export interface Winner {
    id: string
    event_id: string
    category_id?: string
    winner_type: WinnerType
    student_id?: string
    team_id?: string
    position_label: string
    tags: string[]             // stored as text[] in Supabase
    created_at: string
    // Joined fields
    student?: User
    team?: Team
    category?: EventCategory
}

// ── Certificates ───────────────────────────────────────────────

export interface CertificateTemplate {
    id: string
    event_id: string
    template_name: string
    certificate_type: CertificateType
    layout_json: TemplateLayout
    background_image_url?: string
    is_active: boolean
    created_by: string
    created_at: string
    updated_at?: string
    // Joined fields
    event?: Event
    creator?: User
}

export interface TemplateLayout {
    fields: TemplateField[]
}

export interface TemplateField {
    id: string
    field_type: string  // 'student_name' | 'event_name' | 'position' | 'date' | 'certificate_type' | 'custom'
    x: number           // percentage 0-100
    y: number           // percentage 0-100
    width: number       // percentage 0-100
    fontSize: number
    fontFamily: string
    color: string
    bold: boolean
    italic: boolean
    align: 'left' | 'center' | 'right'
    customText?: string // only for field_type = 'custom'
}

export interface Certificate {
    id: string
    winner_id?: string
    student_id: string
    event_id: string
    certificate_type: CertificateType
    status: CertificateStatus
    file_path?: string
    error_message?: string
    retry_count: number
    last_retried_at?: string
    generated_at?: string
    created_at: string
    // Joined fields
    student?: User
    event?: Event
    winner?: Winner
}

// ── Database type for Supabase client ──────────────────────────
// Row = any so `.select()` results can be cast to our typed interfaces.
// Insert/Update = Record so `.insert()`/`.update()` accept any column payload.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInsert = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyUpdate = Record<string, any>

export type Database = {
    public: {
        Tables: {
            users: { Row: AnyRow; Insert: AnyInsert; Update: AnyUpdate }
            departments: { Row: AnyRow; Insert: AnyInsert; Update: AnyUpdate }
            events: { Row: AnyRow; Insert: AnyInsert; Update: AnyUpdate }
            faculty_in_charge: { Row: AnyRow; Insert: AnyInsert; Update: AnyUpdate }
            individual_registrations: { Row: AnyRow; Insert: AnyInsert; Update: AnyUpdate }
            teams: { Row: AnyRow; Insert: AnyInsert; Update: AnyUpdate }
            team_members: { Row: AnyRow; Insert: AnyInsert; Update: AnyUpdate }
            winners: { Row: AnyRow; Insert: AnyInsert; Update: AnyUpdate }
            certificate_templates: { Row: AnyRow; Insert: AnyInsert; Update: AnyUpdate }
            certificates: { Row: AnyRow; Insert: AnyInsert; Update: AnyUpdate }
        }
        Functions: {
            close_event: { Args: { p_event_id: string }; Returns: void }
        }
    }
}

