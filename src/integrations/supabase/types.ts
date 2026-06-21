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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      booking_responses: {
        Row: {
          created_at: string
          id: string
          schedule_id: string
          status: Database["public"]["Enums"]["student_response_status"]
          student_id: string | null
          student_name: string
          student_phone: string
          unavailable_note: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          schedule_id: string
          status?: Database["public"]["Enums"]["student_response_status"]
          student_id?: string | null
          student_name: string
          student_phone: string
          unavailable_note?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          schedule_id?: string
          status?: Database["public"]["Enums"]["student_response_status"]
          student_id?: string | null
          student_name?: string
          student_phone?: string
          unavailable_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_responses_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "trainer_dashboard_responses"
            referencedColumns: ["schedule_id"]
          },
          {
            foreignKeyName: "booking_responses_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "weekly_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "trainer_dashboard_responses"
            referencedColumns: ["student_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pt_sessions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          roster_id: string
          scheduled_at: string
          status: string
          student_user_id: string | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          roster_id: string
          scheduled_at: string
          status?: string
          student_user_id?: string | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          roster_id?: string
          scheduled_at?: string
          status?: string
          student_user_id?: string | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_sessions_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "student_rosters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_sessions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      response_slot_preferences: {
        Row: {
          created_at: string
          id: string
          preference_rank: number
          response_id: string
          slot_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preference_rank: number
          response_id: string
          slot_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preference_rank?: number
          response_id?: string
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_slot_preferences_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "booking_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_slot_preferences_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "trainer_dashboard_responses"
            referencedColumns: ["response_id"]
          },
          {
            foreignKeyName: "response_slot_preferences_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_assignments: {
        Row: {
          created_at: string
          id: string
          response_id: string | null
          schedule_id: string
          slot_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          student_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          response_id?: string | null
          schedule_id: string
          slot_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          response_id?: string | null
          schedule_id?: string
          slot_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_assignments_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "booking_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "trainer_dashboard_responses"
            referencedColumns: ["response_id"]
          },
          {
            foreignKeyName: "schedule_assignments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "trainer_dashboard_responses"
            referencedColumns: ["schedule_id"]
          },
          {
            foreignKeyName: "schedule_assignments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "weekly_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "trainer_dashboard_responses"
            referencedColumns: ["student_id"]
          },
        ]
      }
      student_rosters: {
        Row: {
          created_at: string
          id: string
          memo: string | null
          remaining_sessions: number
          status: string
          student_email: string | null
          student_name: string
          student_phone: string | null
          student_user_id: string | null
          total_sessions: number
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          memo?: string | null
          remaining_sessions?: number
          status?: string
          student_email?: string | null
          student_name: string
          student_phone?: string | null
          student_user_id?: string | null
          total_sessions?: number
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          memo?: string | null
          remaining_sessions?: number
          status?: string
          student_email?: string | null
          student_name?: string
          student_phone?: string | null
          student_user_id?: string | null
          total_sessions?: number
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_rosters_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_activity_log: {
        Row: {
          count: number | null
          created_at: string
          day: string | null
          from_day: string | null
          from_hour: number | null
          hour: number | null
          id: string
          kind: string
          schedule_id: string
          trainer_id: string
          who: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string
          day?: string | null
          from_day?: string | null
          from_hour?: number | null
          hour?: number | null
          id?: string
          kind: string
          schedule_id: string
          trainer_id: string
          who?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string
          day?: string | null
          from_day?: string | null
          from_hour?: number | null
          hour?: number | null
          id?: string
          kind?: string
          schedule_id?: string
          trainer_id?: string
          who?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_activity_log_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "weekly_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_activity_log_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_selections: {
        Row: {
          assigned_method: string
          created_at: string
          id: string
          schedule_id: string
          slot_id: string | null
          status: Database["public"]["Enums"]["selection_status"]
          student_name: string
          student_user_id: string
        }
        Insert: {
          assigned_method?: string
          created_at?: string
          id?: string
          schedule_id: string
          slot_id?: string | null
          status?: Database["public"]["Enums"]["selection_status"]
          student_name: string
          student_user_id: string
        }
        Update: {
          assigned_method?: string
          created_at?: string
          id?: string
          schedule_id?: string
          slot_id?: string | null
          status?: Database["public"]["Enums"]["selection_status"]
          student_name?: string
          student_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_selections_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "trainer_dashboard_responses"
            referencedColumns: ["schedule_id"]
          },
          {
            foreignKeyName: "student_selections_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "weekly_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_selections_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_pt_label: string | null
          memo: string | null
          name: string
          phone: string | null
          remaining_sessions: number
          total_sessions: number
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_pt_label?: string | null
          memo?: string | null
          name: string
          phone?: string | null
          remaining_sessions?: number
          total_sessions?: number
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_pt_label?: string | null
          memo?: string | null
          name?: string
          phone?: string | null
          remaining_sessions?: number
          total_sessions?: number
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          capacity: number
          created_at: string
          day_of_week: number
          hour: number
          id: string
          is_available: boolean
          is_closed: boolean
          note: string | null
          schedule_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          day_of_week: number
          hour: number
          id?: string
          is_available?: boolean
          is_closed?: boolean
          note?: string | null
          schedule_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          day_of_week?: number
          hour?: number
          id?: string
          is_available?: boolean
          is_closed?: boolean
          note?: string | null
          schedule_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_slots_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "trainer_dashboard_responses"
            referencedColumns: ["schedule_id"]
          },
          {
            foreignKeyName: "time_slots_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "weekly_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_profiles: {
        Row: {
          avatar_url: string | null
          branch_name: string | null
          created_at: string
          display_name: string
          gym_name: string | null
          id: string
          instagram_url: string | null
          intro: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          branch_name?: string | null
          created_at?: string
          display_name: string
          gym_name?: string | null
          id?: string
          instagram_url?: string | null
          intro?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          branch_name?: string | null
          created_at?: string
          display_name?: string
          gym_name?: string | null
          id?: string
          instagram_url?: string | null
          intro?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trainers: {
        Row: {
          avatar_url: string | null
          created_at: string
          gym: string | null
          id: string
          instagram_url: string | null
          intro: string | null
          name: string
          theme_from: string
          theme_to: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          gym?: string | null
          id?: string
          instagram_url?: string | null
          intro?: string | null
          name: string
          theme_from?: string
          theme_to?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          gym?: string | null
          id?: string
          instagram_url?: string | null
          intro?: string | null
          name?: string
          theme_from?: string
          theme_to?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_schedules: {
        Row: {
          booking_closes_at: string | null
          booking_opens_at: string | null
          booking_token: string
          confirmed_at: string | null
          created_at: string
          id: string
          is_published: boolean
          request_sent_at: string | null
          title: string | null
          trainer_id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          booking_closes_at?: string | null
          booking_opens_at?: string | null
          booking_token?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          request_sent_at?: string | null
          title?: string | null
          trainer_id: string
          updated_at?: string
          week_start: string
        }
        Update: {
          booking_closes_at?: string | null
          booking_opens_at?: string | null
          booking_token?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          request_sent_at?: string | null
          title?: string | null
          trainer_id?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedules_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      trainer_dashboard_responses: {
        Row: {
          assigned_slot: Json | null
          last_pt_label: string | null
          preferred_slots: Json | null
          remaining_sessions: number | null
          response_id: string | null
          response_status:
            | Database["public"]["Enums"]["student_response_status"]
            | null
          schedule_id: string | null
          student_id: string | null
          student_name: string | null
          student_phone: string | null
          total_sessions: number | null
          trainer_user_id: string | null
          week_start: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_unregistered_roster: {
        Args: { p_roster_id: string; p_schedule_id: string; p_slot_id: string }
        Returns: undefined
      }
      cancel_confirmed_assignment: {
        Args: { p_schedule_id: string; p_student_user_id: string }
        Returns: undefined
      }
      cancel_unregistered_roster_assignment: {
        Args: { p_roster_id: string; p_schedule_id: string }
        Returns: undefined
      }
      confirm_weekly_schedule: {
        Args: {
          p_assignments: Json
          p_mark_week_confirmed?: boolean
          p_schedule_id: string
        }
        Returns: undefined
      }
      current_user_owns_schedule: {
        Args: { _schedule_id: string }
        Returns: boolean
      }
      current_user_owns_trainer: {
        Args: { _trainer_id: string }
        Returns: boolean
      }
      get_public_booking_schedule: {
        Args: { _booking_token: string }
        Returns: Json
      }
      get_schedule_demand: {
        Args: { p_schedule_id: string }
        Returns: {
          picks: number
          slot_id: string
        }[]
      }
      mark_schedule_requested: {
        Args: { p_schedule_id: string }
        Returns: undefined
      }
      schedule_is_public: { Args: { _schedule_id: string }; Returns: boolean }
      submit_booking_response: {
        Args: {
          _booking_token: string
          _slot_ids: string[]
          _student_name: string
          _student_phone: string
          _unavailable?: boolean
          _unavailable_note?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "trainer" | "student"
      assignment_status: "draft" | "confirmed"
      selection_status: "selected" | "unavailable" | "confirmed"
      student_response_status: "not_responded" | "responded" | "unavailable"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["trainer", "student"],
      assignment_status: ["draft", "confirmed"],
      selection_status: ["selected", "unavailable", "confirmed"],
      student_response_status: ["not_responded", "responded", "unavailable"],
    },
  },
} as const
