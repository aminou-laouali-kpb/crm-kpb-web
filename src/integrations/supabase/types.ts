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
      expense_templates: {
        Row: {
          active_from: string
          active_to: string | null
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          day_of_month: number
          description: string
          id: string
          is_active: boolean
          months_pattern: number[] | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          day_of_month?: number
          description: string
          id?: string
          is_active?: boolean
          months_pattern?: number[] | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          active_from?: string
          active_to?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          day_of_month?: number
          description?: string
          id?: string
          is_active?: boolean
          months_pattern?: number[] | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
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
      installment_reminders: {
        Row: {
          channel: string
          comment: string | null
          created_at: string
          id: string
          installment_id: string
          next_due_date: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          comment?: string | null
          created_at?: string
          id?: string
          installment_id: string
          next_due_date?: string | null
          user_id?: string
        }
        Update: {
          channel?: string
          comment?: string | null
          created_at?: string
          id?: string
          installment_id?: string
          next_due_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_reminders_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "payment_installments"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_deletion_requests: {
        Row: {
          id: string
          invoice_id: string
          invoice_number: string
          invoice_snapshot: Json
          reason: string
          requested_at: string
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          id?: string
          invoice_id: string
          invoice_number: string
          invoice_snapshot?: Json
          reason: string
          requested_at?: string
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          invoice_number?: string
          invoice_snapshot?: Json
          reason?: string
          requested_at?: string
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      invoice_sequences: {
        Row: {
          last_number: number
          updated_at: string
          year: number
        }
        Insert: {
          last_number?: number
          updated_at?: string
          year: number
        }
        Update: {
          last_number?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
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
          product_code: string | null
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
          product_code?: string | null
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
          product_code?: string | null
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
      payment_installments: {
        Row: {
          client_id: string | null
          client_name: string
          client_whatsapp: string | null
          closed_at: string | null
          closed_invoice_id: string | null
          closed_reason: string | null
          created_at: string
          created_by: string | null
          currency: string
          due_date: string
          id: string
          invoice_id: string | null
          last_reminder_at: string | null
          notes: string | null
          owner_user_id: string
          remaining_amount: number
          reminder_count: number
          sales_rep: string
          service: string
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          client_whatsapp?: string | null
          closed_at?: string | null
          closed_invoice_id?: string | null
          closed_reason?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date: string
          id?: string
          invoice_id?: string | null
          last_reminder_at?: string | null
          notes?: string | null
          owner_user_id: string
          remaining_amount?: number
          reminder_count?: number
          sales_rep: string
          service: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          client_whatsapp?: string | null
          closed_at?: string | null
          closed_invoice_id?: string | null
          closed_reason?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string
          id?: string
          invoice_id?: string | null
          last_reminder_at?: string | null
          notes?: string | null
          owner_user_id?: string
          remaining_amount?: number
          reminder_count?: number
          sales_rep?: string
          service?: string
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_installments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_installments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
      create_contract_request_from_invoice: {
        Args: { p_entity_key?: string; p_invoice_id: string }
        Returns: Json
      }
      get_invoice_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          last_status_change: string
          payment_type: string
          product_code: string | null
          receipt_url: string
          sales_representative: string
          service_description: string
          status: string
          user_id: string
        }[]
      }
      get_next_invoice_number: { Args: { p_year: number }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      peek_next_invoice_number: { Args: { p_year?: number }; Returns: string }
      request_invoice_deletion: {
        Args: { p_invoice_id: string; p_reason: string }
        Returns: Json
      }
      review_invoice_deletion: {
        Args: { p_approve: boolean; p_note?: string; p_request_id: string }
        Returns: Json
      }
      update_contract_request_client_info: {
        Args: { p_fields: Json; p_token: string }
        Returns: Json
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
      verify_invoice: { Args: { p_invoice_number: string }; Returns: Json }
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
