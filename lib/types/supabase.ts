export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: number
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_downloads: {
        Row: {
          last_request: string
          user_id: string
        }
        Insert: {
          last_request?: string
          user_id: string
        }
        Update: {
          last_request?: string
          user_id?: string
        }
        Relationships: []
      }
      certificate_templates: {
        Row: {
          background_image_url: string | null
          certificate_type: string
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          is_active: boolean
          is_global: boolean
          layout_json: Json
          template_name: string
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          certificate_type: string
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          layout_json: Json
          template_name: string
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          certificate_type?: string
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          is_active?: boolean
          is_global?: boolean
          layout_json?: Json
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_type: string
          created_at: string | null
          error_message: string | null
          event_id: string | null
          file_path: string | null
          generated_at: string | null
          id: string
          last_retried_at: string | null
          retry_count: number
          status: string | null
          storage_path: string | null
          student_id: string
          verification_id: string | null
          winner_id: string | null
        }
        Insert: {
          certificate_type: string
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          file_path?: string | null
          generated_at?: string | null
          id?: string
          last_retried_at?: string | null
          retry_count?: number
          status?: string | null
          storage_path?: string | null
          student_id: string
          verification_id?: string | null
          winner_id?: string | null
        }
        Update: {
          certificate_type?: string
          created_at?: string | null
          error_message?: string | null
          event_id?: string | null
          file_path?: string | null
          generated_at?: string | null
          id?: string
          last_retried_at?: string | null
          retry_count?: number
          status?: string | null
          storage_path?: string | null
          student_id?: string
          verification_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "winners"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          event_date: string
          forum: string | null
          id: string
          is_active: boolean
          is_paid: boolean
          max_categories_per_student: number | null
          participant_type: string
          previous_status: string | null
          registration_deadline: string
          registration_fee: number | null
          results_published: boolean
          status: Database["public"]["Enums"]["event_status"]
          team_size: number | null
          title: string
          updated_at: string
          upi_qr_url: string | null
          visibility: Database["public"]["Enums"]["event_visibility"]
        }
        Insert: {
          created_at?: string
          created_by: string
          department_id?: string | null
          description?: string | null
          event_date: string
          forum?: string | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          max_categories_per_student?: number | null
          participant_type?: string
          previous_status?: string | null
          registration_deadline: string
          registration_fee?: number | null
          results_published?: boolean
          status?: Database["public"]["Enums"]["event_status"]
          team_size?: number | null
          title: string
          updated_at?: string
          upi_qr_url?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Update: {
          created_at?: string
          created_by?: string
          department_id?: string | null
          description?: string | null
          event_date?: string
          forum?: string | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          max_categories_per_student?: number | null
          participant_type?: string
          previous_status?: string | null
          registration_deadline?: string
          registration_fee?: number | null
          results_published?: boolean
          status?: Database["public"]["Enums"]["event_status"]
          team_size?: number | null
          title?: string
          updated_at?: string
          upi_qr_url?: string | null
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_in_charge: {
        Row: {
          created_at: string
          event_id: string
          id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_in_charge_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fic_teacher_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      individual_registrations: {
        Row: {
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          event_id: string | null
          id: string
          payment_proof_url: string | null
          payment_status: Database["public"]["Enums"]["payment_status_enum"]
          payment_submitted_at: string | null
          registered_at: string
          rejection_reason: string | null
          student_id: string
          team_id: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          event_id?: string | null
          id?: string
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          payment_submitted_at?: string | null
          registered_at?: string
          rejection_reason?: string | null
          student_id: string
          team_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          attendance_status?: Database["public"]["Enums"]["attendance_status"]
          event_id?: string | null
          id?: string
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          payment_submitted_at?: string | null
          registered_at?: string
          rejection_reason?: string | null
          student_id?: string
          team_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "individual_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "individual_registrations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_students_registry: {
        Row: {
          created_at: string | null
          department: string
          email: string
          id: string
          name: string
          section: string
          semester: string
          year: string
        }
        Insert: {
          created_at?: string | null
          department: string
          email: string
          id?: string
          name: string
          section: string
          semester: string
          year: string
        }
        Update: {
          created_at?: string | null
          department?: string
          email?: string
          id?: string
          name?: string
          section?: string
          semester?: string
          year?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          status: string | null
          student_id: string
          team_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          status?: string | null
          student_id: string
          team_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          status?: string | null
          student_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          is_disqualified: boolean
          leader_id: string | null
          payment_proof_url: string | null
          payment_status: Database["public"]["Enums"]["payment_status_enum"]
          payment_submitted_at: string | null
          rejection_reason: string | null
          team_name: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          is_disqualified?: boolean
          leader_id?: string | null
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          payment_submitted_at?: string | null
          rejection_reason?: string | null
          team_name: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          is_disqualified?: boolean
          leader_id?: string | null
          payment_proof_url?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_enum"]
          payment_submitted_at?: string | null
          rejection_reason?: string | null
          team_name?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          department_id: string | null
          dob: string | null
          email: string | null
          id: string
          is_active: boolean
          must_change_password: boolean
          name: string
          phone_number: string | null
          programme: string | null
          role: Database["public"]["Enums"]["user_role"]
          semester: number | null
          student_type: Database["public"]["Enums"]["student_type_enum"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          dob?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          must_change_password?: boolean
          name: string
          phone_number?: string | null
          programme?: string | null
          role: Database["public"]["Enums"]["user_role"]
          semester?: number | null
          student_type?: Database["public"]["Enums"]["student_type_enum"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          dob?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          name?: string
          phone_number?: string | null
          programme?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          semester?: number | null
          student_type?: Database["public"]["Enums"]["student_type_enum"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      winners: {
        Row: {
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          position_label: string
          rank_order: number | null
          student_id: string | null
          tags: string[]
          team_id: string | null
          winner_type: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          position_label: string
          rank_order?: number | null
          student_id?: string | null
          tags?: string[]
          team_id?: string | null
          winner_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          position_label?: string
          rank_order?: number | null
          student_id?: string | null
          tags?: string[]
          team_id?: string | null
          winner_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "winners_declared_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_force_event_status: {
        Args: {
          p_admin_id: string
          p_event_id: string
          p_new_status: Database["public"]["Enums"]["event_status"]
        }
        Returns: undefined
      }
      admin_soft_delete_event: {
        Args: { p_admin_id: string; p_event_id: string }
        Returns: undefined
      }
      claim_certificates_batch: {
        Args: never
        Returns: {
          certificate_type: string
          created_at: string | null
          error_message: string | null
          event_id: string | null
          file_path: string | null
          generated_at: string | null
          id: string
          last_retried_at: string | null
          retry_count: number
          status: string | null
          storage_path: string | null
          student_id: string
          verification_id: string | null
          winner_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "certificates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      close_event: { Args: { p_event_id: string }; Returns: undefined }
      create_business_user: {
        Args: {
          p_department_id: string
          p_email: string
          p_name: string
          p_password: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_uucms_number: string
        }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      enqueue_participation_certificates: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      enqueue_winner_certificates: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      fn_refresh_analytics: { Args: never; Returns: undefined }
      fn_validate_teams_before_close: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      get_event_from_category: {
        Args: { p_category_id: string }
        Returns: {
          created_at: string
          created_by: string
          department_id: string | null
          description: string | null
          event_date: string
          forum: string | null
          id: string
          is_active: boolean
          is_paid: boolean
          max_categories_per_student: number | null
          participant_type: string
          previous_status: string | null
          registration_deadline: string
          registration_fee: number | null
          results_published: boolean
          status: Database["public"]["Enums"]["event_status"]
          team_size: number | null
          title: string
          updated_at: string
          upi_qr_url: string | null
          visibility: Database["public"]["Enums"]["event_visibility"]
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      owns_event: { Args: { p_event_id: string }; Returns: boolean }
      publish_results: { Args: { p_event_id: string }; Returns: undefined }
      results_published_for_category: {
        Args: { p_category_id: string }
        Returns: boolean
      }
      retry_failed_certificates: {
        Args: { p_event_id: string }
        Returns: number
      }
      student_participated_in_event: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      teacher_mark_attendance: {
        Args: {
          p_registration_id: string
          p_status: Database["public"]["Enums"]["attendance_status"]
          p_teacher_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      attendance_status: "registered" | "attended" | "absent"
      event_status: "draft" | "open" | "closed" | "completed" | "archived"
      event_visibility: "public_all" | "internal_only" | "external_only"
      payment_status_enum:
        | "not_required"
        | "pending"
        | "submitted"
        | "verified"
        | "rejected"
        | "refund_requested"
        | "refunded"
      student_type_enum: "internal" | "external"
      user_role: "student" | "teacher" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_status: ["registered", "attended", "absent"],
      event_status: ["draft", "open", "closed", "completed", "archived"],
      event_visibility: ["public_all", "internal_only", "external_only"],
      payment_status_enum: [
        "not_required",
        "pending",
        "submitted",
        "verified",
        "rejected",
        "refund_requested",
        "refunded",
      ],
      student_type_enum: ["internal", "external"],
      user_role: ["student", "teacher", "admin"],
    },
  },
} as const
