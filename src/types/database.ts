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
      activity_log_tags: {
        Row: {
          activity_log_id: string
          created_at: string
          created_by: string | null
          farm_id: string
          id: string
          tag_id: string
        }
        Insert: {
          activity_log_id: string
          created_at?: string
          created_by?: string | null
          farm_id: string
          id?: string
          tag_id: string
        }
        Update: {
          activity_log_id?: string
          created_at?: string
          created_by?: string | null
          farm_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_tags_creator_fkey"
            columns: ["farm_id", "created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["farm_id", "id"]
          },
          {
            foreignKeyName: "activity_log_tags_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_tags_log_fkey"
            columns: ["farm_id", "activity_log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["farm_id", "id"]
          },
          {
            foreignKeyName: "activity_log_tags_tag_fkey"
            columns: ["farm_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["farm_id", "id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          denial_reason: string | null
          employee_id: string
          ended_at: string
          farm_id: string
          field_id: string
          id: string
          note: string | null
          response_accuracy: number | null
          review_status: string
          started_at: string
          submitted_by: string | null
          summary: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          activity_date: string
          activity_type: string
          created_at?: string
          denial_reason?: string | null
          employee_id: string
          ended_at: string
          farm_id: string
          field_id: string
          id?: string
          note?: string | null
          response_accuracy?: number | null
          review_status?: string
          started_at: string
          submitted_by?: string | null
          summary: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          denial_reason?: string | null
          employee_id?: string
          ended_at?: string
          farm_id?: string
          field_id?: string
          id?: string
          note?: string | null
          response_accuracy?: number | null
          review_status?: string
          started_at?: string
          submitted_by?: string | null
          summary?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_employee_fkey"
            columns: ["farm_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["farm_id", "id"]
          },
          {
            foreignKeyName: "activity_logs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_field_fkey"
            columns: ["farm_id", "field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["farm_id", "id"]
          },
          {
            foreignKeyName: "activity_logs_submitter_fkey"
            columns: ["farm_id", "submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["farm_id", "id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          contact_email: string | null
          created_at: string
          farm_id: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          contact_email?: string | null
          created_at?: string
          farm_id: string
          full_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          contact_email?: string | null
          created_at?: string
          farm_id?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          created_at: string
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      fields: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fields_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          employee_id: string | null
          farm_id: string
          full_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          farm_id: string
          full_name: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          farm_id?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_employee_fkey"
            columns: ["farm_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["farm_id", "id"]
          },
          {
            foreignKeyName: "profiles_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          activity_log_id: string
          created_at: string
          duration_seconds: number | null
          farm_id: string
          id: string
          is_new: boolean
          recorded_at: string
          storage_bucket: string | null
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          activity_log_id: string
          created_at?: string
          duration_seconds?: number | null
          farm_id: string
          id?: string
          is_new?: boolean
          recorded_at: string
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          activity_log_id?: string
          created_at?: string
          duration_seconds?: number | null
          farm_id?: string
          id?: string
          is_new?: boolean
          recorded_at?: string
          storage_bucket?: string | null
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordings_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_log_fkey"
            columns: ["farm_id", "activity_log_id"]
            isOneToOne: false
            referencedRelation: "activity_logs"
            referencedColumns: ["farm_id", "id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          created_by: string | null
          farm_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          farm_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          farm_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_creator_fkey"
            columns: ["farm_id", "created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["farm_id", "id"]
          },
          {
            foreignKeyName: "tags_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      submit_recorded_activity: {
        Args: {
          p_activity_date: string
          p_activity_type: string
          p_duration_seconds: number
          p_ended_at: string
          p_field_id: string
          p_note: string
          p_started_at: string
          p_storage_path: string
          p_transcript: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
