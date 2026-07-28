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
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
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
      clients: {
        Row: {
          adresse: string | null
          created_at: string
          created_by: string | null
          date_naissance: string | null
          email: string
          first_name: string
          id: string
          is_minor: boolean
          last_name: string
          lieu_naissance: string | null
          nationalite: string | null
          piece_identite: string | null
          representant_legal_lien: string | null
          representant_legal_nom: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          created_by?: string | null
          date_naissance?: string | null
          email: string
          first_name: string
          id?: string
          is_minor?: boolean
          last_name: string
          lieu_naissance?: string | null
          nationalite?: string | null
          piece_identite?: string | null
          representant_legal_lien?: string | null
          representant_legal_nom?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          adresse?: string | null
          created_at?: string
          created_by?: string | null
          date_naissance?: string | null
          email?: string
          first_name?: string
          id?: string
          is_minor?: boolean
          last_name?: string
          lieu_naissance?: string | null
          nationalite?: string | null
          piece_identite?: string | null
          representant_legal_lien?: string | null
          representant_legal_nom?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      contract_signatures: {
        Row: {
          bon_de_commande: Json | null
          client_id: string
          contract_hash: string
          created_at: string
          engagement_id: string | null
          id: string
          pdf_url: string | null
          read_and_agreed: boolean
          rendered_body: string
          signed_at: string | null
          signer_email: string | null
          signer_ip: unknown
          signer_name: string | null
          template_version: string
          user_agent: string | null
        }
        Insert: {
          bon_de_commande?: Json | null
          client_id: string
          contract_hash: string
          created_at?: string
          engagement_id?: string | null
          id?: string
          pdf_url?: string | null
          read_and_agreed?: boolean
          rendered_body: string
          signed_at?: string | null
          signer_email?: string | null
          signer_ip?: unknown
          signer_name?: string | null
          template_version: string
          user_agent?: string | null
        }
        Update: {
          bon_de_commande?: Json | null
          client_id?: string
          contract_hash?: string
          created_at?: string
          engagement_id?: string | null
          id?: string
          pdf_url?: string | null
          read_and_agreed?: boolean
          rendered_body?: string
          signed_at?: string | null
          signer_email?: string | null
          signer_ip?: unknown
          signer_name?: string | null
          template_version?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          body_md: string
          created_at: string
          id: string
          is_active: boolean
          version: string
        }
        Insert: {
          body_md: string
          created_at?: string
          id?: string
          is_active?: boolean
          version: string
        }
        Update: {
          body_md?: string
          created_at?: string
          id?: string
          is_active?: boolean
          version?: string
        }
        Relationships: []
      }
      engagements: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          devise: string
          duree_mois: number
          echeancier: string | null
          etablissements_cibles: string | null
          frais_inscription: number
          id: string
          objectif: string
          prestations_incluses: string[]
          prix_total: number
          programme: string
          sales_rep: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          devise?: string
          duree_mois?: number
          echeancier?: string | null
          etablissements_cibles?: string | null
          frais_inscription?: number
          id?: string
          objectif: string
          prestations_incluses?: string[]
          prix_total: number
          programme: string
          sales_rep?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          devise?: string
          duree_mois?: number
          echeancier?: string | null
          etablissements_cibles?: string | null
          frais_inscription?: number
          id?: string
          objectif?: string
          prestations_incluses?: string[]
          prix_total?: number
          programme?: string
          sales_rep?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          client_id: string | null
          client_last_name: string
          client_whatsapp: string
          created_at: string
          currency: string
          id: string
          invoice_date: string
          invoice_number: string
          last_status_change: string
          payment_type: string
          receipt_url: string | null
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
          client_id?: string | null
          client_last_name: string
          client_whatsapp: string
          created_at?: string
          currency: string
          id?: string
          invoice_date: string
          invoice_number: string
          last_status_change?: string
          payment_type: string
          receipt_url?: string | null
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
          client_id?: string | null
          client_last_name?: string
          client_whatsapp?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          last_status_change?: string
          payment_type?: string
          receipt_url?: string | null
          sales_representative?: Database["public"]["Enums"]["sales_rep"]
          service_description?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          template_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
          receipt_url: string
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
      upsert_client_from_invoice: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_whatsapp: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "sales_rep" | "comptable" | "commercial"
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
      app_role: ["admin", "sales_rep", "comptable", "commercial"],
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
