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
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          id: string
          trainer_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          trainer_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      points: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
          week_start: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
          week_start: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
          week_start?: string
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
      student_selections: {
        Row: {
          created_at: string
          id: string
          schedule_id: string
          slot_id: string | null
          status: Database["public"]["Enums"]["selection_status"]
          student_name: string
          student_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          schedule_id: string
          slot_id?: string | null
          status?: Database["public"]["Enums"]["selection_status"]
          student_name: string
          student_user_id: string
        }
        Update: {
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
      student_rosters: {
        Row: {
          created_at: string
          id: string
          memo: string | null
          remaining_sessions: number
          status: string
          student_email: string
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
          student_email: string
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
          student_email?: string
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
      time_slots: {
        Row: {
          capacity: number
          day_of_week: number
          hour: number
          id: string
          is_closed: boolean
          schedule_id: string
        }
        Insert: {
          capacity?: number
          day_of_week: number
          hour: number
          id?: string
          is_closed?: boolean
          schedule_id: string
        }
        Update: {
          capacity?: number
          day_of_week?: number
          hour?: number
          id?: string
          is_closed?: boolean
          schedule_id?: string
        }
        Relationships: [
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
          created_at: string
          id: string
          trainer_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          trainer_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          trainer_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedules_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_week_points: {
        Args: { _user_id: string; _week_start: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "trainer" | "student"
      selection_status: "selected" | "unavailable" | "confirmed"
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
      app_role: ["trainer", "student"],
      selection_status: ["selected", "unavailable", "confirmed"],
    },
  },
} as const
