/**
 * Auto-generated Supabase Database Types for HomeBase
 * Generated from live schema on Ease AI Supabase project
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          household_id: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          household_id: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          household_id?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          alert_threshold: number
          amount: number
          category_id: string | null
          created_at: string
          household_id: string
          id: string
          is_active: boolean
          period: string
        }
        Insert: {
          alert_threshold?: number
          amount: number
          category_id?: string | null
          created_at?: string
          household_id: string
          id?: string
          is_active?: boolean
          period: string
        }
        Update: {
          alert_threshold?: number
          amount?: number
          category_id?: string | null
          created_at?: string
          household_id?: string
          id?: string
          is_active?: boolean
          period?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_log: {
        Row: {
          contact_id: string | null
          content: string | null
          context: string | null
          created_at: string
          household_id: string
          id: string
          sent_at: string | null
          sent_by: string
          status: string
          type: string
        }
        Insert: {
          contact_id?: string | null
          content?: string | null
          context?: string | null
          created_at?: string
          household_id: string
          id?: string
          sent_at?: string | null
          sent_by: string
          status?: string
          type: string
        }
        Update: {
          contact_id?: string | null
          content?: string | null
          context?: string | null
          created_at?: string
          household_id?: string
          id?: string
          sent_at?: string | null
          sent_by?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          household_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          relationship: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          household_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          relationship?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          relationship?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          assigned_to: string[] | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          household_id: string
          id: string
          location: string | null
          recurrence_rule: string | null
          reminders: Json | null
          starts_at: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          household_id: string
          id?: string
          location?: string | null
          recurrence_rule?: string | null
          reminders?: Json | null
          starts_at: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          household_id?: string
          id?: string
          location?: string | null
          recurrence_rule?: string | null
          reminders?: Json | null
          starts_at?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          color: string | null
          household_id: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          color?: string | null
          household_id: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          color?: string | null
          household_id?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          date: string
          household_id: string
          id: string
          notes: string | null
          ocr_data: Json | null
          receipt_url: string | null
          recorded_by: string
          source: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          date: string
          household_id: string
          id?: string
          notes?: string | null
          ocr_data?: Json | null
          receipt_url?: string | null
          recorded_by: string
          source?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          household_id?: string
          id?: string
          notes?: string | null
          ocr_data?: Json | null
          receipt_url?: string | null
          recorded_by?: string
          source?: string
          vendor?: string | null
        }
        Relationships: []
      }
      grocery_items: {
        Row: {
          added_by: string
          category: string | null
          created_at: string
          deals: Json | null
          id: string
          is_checked: boolean
          list_id: string
          name: string
          quantity: string | null
        }
        Insert: {
          added_by: string
          category?: string | null
          created_at?: string
          deals?: Json | null
          id?: string
          is_checked?: boolean
          list_id: string
          name: string
          quantity?: string | null
        }
        Update: {
          added_by?: string
          category?: string | null
          created_at?: string
          deals?: Json | null
          id?: string
          is_checked?: boolean
          list_id?: string
          name?: string
          quantity?: string | null
        }
        Relationships: []
      }
      grocery_lists: {
        Row: {
          created_at: string
          household_id: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          avatar_url: string | null
          display_name: string
          household_id: string
          id: string
          joined_at: string
          permissions: Json
          role: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          display_name: string
          household_id: string
          id?: string
          joined_at?: string
          permissions?: Json
          role: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          display_name?: string
          household_id?: string
          id?: string
          joined_at?: string
          permissions?: Json
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          settings: Json
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
          settings?: Json
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          settings?: Json
        }
        Relationships: []
      }
      maintenance_items: {
        Row: {
          asset_name: string | null
          category: string
          created_at: string
          description: string | null
          frequency_days: number | null
          household_id: string
          id: string
          last_completed_at: string | null
          next_due_at: string | null
          reminders_enabled: boolean
          season: string | null
          tips: Json | null
          title: string
        }
        Insert: {
          asset_name?: string | null
          category: string
          created_at?: string
          description?: string | null
          frequency_days?: number | null
          household_id: string
          id?: string
          last_completed_at?: string | null
          next_due_at?: string | null
          reminders_enabled?: boolean
          season?: string | null
          tips?: Json | null
          title: string
        }
        Update: {
          asset_name?: string | null
          category?: string
          created_at?: string
          description?: string | null
          frequency_days?: number | null
          household_id?: string
          id?: string
          last_completed_at?: string | null
          next_due_at?: string | null
          reminders_enabled?: boolean
          season?: string | null
          tips?: Json | null
          title?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          cook_time_min: number | null
          created_at: string
          description: string | null
          household_id: string | null
          id: string
          image_url: string | null
          ingredients: Json
          instructions: Json
          prep_time_min: number | null
          rating: number | null
          servings: number | null
          source_url: string | null
          tags: string[] | null
          times_cooked: number
          title: string
        }
        Insert: {
          cook_time_min?: number | null
          created_at?: string
          description?: string | null
          household_id?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          prep_time_min?: number | null
          rating?: number | null
          servings?: number | null
          source_url?: string | null
          tags?: string[] | null
          times_cooked?: number
          title: string
        }
        Update: {
          cook_time_min?: number | null
          created_at?: string
          description?: string | null
          household_id?: string | null
          id?: string
          image_url?: string | null
          ingredients?: Json
          instructions?: Json
          prep_time_min?: number | null
          rating?: number | null
          servings?: number | null
          source_url?: string | null
          tags?: string[] | null
          times_cooked?: number
          title?: string
        }
        Relationships: []
      }
      user_patterns: {
        Row: {
          confidence: number
          household_id: string
          id: string
          last_updated_at: string
          member_id: string | null
          pattern_data: Json
          pattern_type: string
        }
        Insert: {
          confidence?: number
          household_id: string
          id?: string
          last_updated_at?: string
          member_id?: string | null
          pattern_data?: Json
          pattern_type: string
        }
        Update: {
          confidence?: number
          household_id?: string
          id?: string
          last_updated_at?: string
          member_id?: string | null
          pattern_data?: Json
          pattern_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_household_with_member: {
        Args: {
          household_name: string
          member_display_name: string
          member_role?: string
        }
        Returns: Json
      }
      get_my_household_ids: { Args: never; Returns: string[] }
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
