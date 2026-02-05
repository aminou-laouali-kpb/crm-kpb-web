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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          accessed_at: string
          action: string
          id: string
          metadata: Json | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          accessed_at?: string
          action: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          accessed_at?: string
          action?: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          admin_id: string
          budgeted_amount: number
          category_id: string | null
          created_at: string
          id: string
          month: number
          updated_at: string
          year: number
        }
        Insert: {
          admin_id: string
          budgeted_amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          month: number
          updated_at?: string
          year: number
        }
        Update: {
          admin_id?: string
          budgeted_amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          month?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          admin_id: string
          amount: number
          category_id: string | null
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_email: string
          client_first_name: string
          client_last_name: string
          client_whatsapp: string
          created_at: string
          currency: string
          id: string
          invoice_date: string
          invoice_number: string
          last_status_change: string
          payment_type: string
          sales_representative: Database["public"]["Enums"]["sales_rep"]
          service_description: string
          status: Database["public"]["Enums"]["invoice_status"]
          template_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          client_email: string
          client_first_name: string
          client_last_name: string
          client_whatsapp: string
          created_at?: string
          currency: string
          id?: string
          invoice_date: string
          invoice_number: string
          last_status_change?: string
          payment_type: string
          sales_representative: Database["public"]["Enums"]["sales_rep"]
          service_description: string
          status?: Database["public"]["Enums"]["invoice_status"]
          template_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_email?: string
          client_first_name?: string
          client_last_name?: string
          client_whatsapp?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          last_status_change?: string
          payment_type?: string
          sales_representative?: Database["public"]["Enums"]["sales_rep"]
          service_description?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          template_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planned_income: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          description: string
          due_date: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          recurrence_type: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string
          description: string
          due_date: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          recurrence_type?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          recurrence_type?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_rep_points: {
        Row: {
          created_at: string | null
          id: string
          month: number
          net_sales: number
          points: number
          position: number
          sales_rep: string
          total_commission: number
          total_sales: number
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          net_sales?: number
          points?: number
          position: number
          sales_rep: string
          total_commission?: number
          total_sales?: number
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          net_sales?: number
          points?: number
          position?: number
          sales_rep?: string
          total_commission?: number
          total_sales?: number
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_audit_log: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      get_invoice_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          last_status_change: string
          payment_type: string
          sales_representative: string
          service_description: string
          status: string
          user_id: string
        }[]
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
      app_role: "admin" | "sales_rep" | "comptable"
      invoice_status:
        | "generated"
        | "sent"
        | "awaiting_payment"
        | "to_follow_up"
        | "paid"
      sales_rep: "Josphin" | "Nadia" | "Donald" | "Richard"
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
      app_role: ["admin", "sales_rep", "comptable"],
      invoice_status: [
        "generated",
        "sent",
        "awaiting_payment",
        "to_follow_up",
        "paid",
      ],
      sales_rep: ["Josphin", "Nadia", "Donald", "Richard"],
    },
  },
} as const
