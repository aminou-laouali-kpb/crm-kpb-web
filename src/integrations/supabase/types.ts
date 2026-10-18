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
      contract_rate_limit_events: {
        Row: {
          created_at: string
          id: number
          identifier: string
          scope: string
        }
        Insert: {
          created_at?: string
          id?: never
          identifier: string
          scope: string
        }
        Update: {
          created_at?: string
          id?: never
          identifier?: string
          scope?: string
        }
        Relationships: []
      }
      contract_signature_requests: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          engagement_id: string | null
          entity_key: string
          expires_at: string
          id: string
          invoice_id: string | null
          last_reminded_at: string | null
          opened_at: string | null
          prefill: Json
          reminder_count: number
          signature_id: string | null
          signed_at: string | null
          status: string
          template_version: string
          token: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          engagement_id?: string | null
          entity_key: string
          expires_at?: string
          id?: string
          invoice_id?: string | null
          last_reminded_at?: string | null
          opened_at?: string | null
          prefill: Json
          reminder_count?: number
          signature_id?: string | null
          signed_at?: string | null
          status?: string
          template_version: string
          token: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          engagement_id?: string | null
          entity_key?: string
          expires_at?: string
          id?: string
          invoice_id?: string | null
          last_reminded_at?: string | null
          opened_at?: string | null
          prefill?: Json
          reminder_count?: number
          signature_id?: string | null
          signed_at?: string | null
          status?: string
          template_version?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signature_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signature_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_contract_status"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contract_signature_requests_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signature_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signature_requests_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "contract_signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signature_requests_signature_id_fkey"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "v_contract_status"
            referencedColumns: ["signature_id"]
          },
          {
            foreignKeyName: "contract_signature_requests_template_version_fkey"
            columns: ["template_version"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["version"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          bon_de_commande: Json | null
          client_id: string
          contract_hash: string
          created_at: string
          engagement_id: string | null
          entity_key: string | null
          id: string
          pdf_url: string | null
          read_and_agreed: boolean
          refund_policy_accepted: boolean | null
          rendered_body: string
          request_id: string | null
          signature_image: string | null
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
          entity_key?: string | null
          id?: string
          pdf_url?: string | null
          read_and_agreed?: boolean
          refund_policy_accepted?: boolean | null
          rendered_body: string
          request_id?: string | null
          signature_image?: string | null
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
          entity_key?: string | null
          id?: string
          pdf_url?: string | null
          read_and_agreed?: boolean
          refund_policy_accepted?: boolean | null
          rendered_body?: string
          request_id?: string | null
          signature_image?: string | null
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
            foreignKeyName: "contract_signatures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_contract_status"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "contract_signatures_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "contract_signature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "v_contract_status"
            referencedColumns: ["request_id"]
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
      contract_token_access_logs: {
        Row: {
          created_at: string
          id: number
          ip: string | null
          outcome: string
          token_hint: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          ip?: string | null
          outcome: string
          token_hint?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          ip?: string | null
          outcome?: string
          token_hint?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      dossier_collaborators: {
        Row: {
          dossier_id: string
          user_id: string
        }
        Insert: {
          dossier_id: string
          user_id: string
        }
        Update: {
          dossier_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_collaborators_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_collaborators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      dossier_events: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string
          dossier_id: string
          edited_at: string | null
          edited_by: string | null
          from_stage: string | null
          id: string
          meta: Json
          to_stage: string | null
          type: string
          work_date: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          dossier_id: string
          edited_at?: string | null
          edited_by?: string | null
          from_stage?: string | null
          id?: string
          meta?: Json
          to_stage?: string | null
          type: string
          work_date: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          dossier_id?: string
          edited_at?: string | null
          edited_by?: string | null
          from_stage?: string | null
          id?: string
          meta?: Json
          to_stage?: string | null
          type?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "dossier_events_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_stages: {
        Row: {
          code: string
          label: string
          phase: string
          short_label: string
          sort_order: number
        }
        Insert: {
          code: string
          label: string
          phase: string
          short_label: string
          sort_order: number
        }
        Update: {
          code?: string
          label?: string
          phase?: string
          short_label?: string
          sort_order?: number
        }
        Relationships: []
      }
      dossiers: {
        Row: {
          admission_result: string | null
          assigned_to: string | null
          blocked_reason: string | null
          client_id: string | null
          closed_at: string | null
          closure_outcome: string | null
          contract_status: string
          created_at: string
          created_by: string | null
          destination_country: string | null
          id: string
          includes_visa: boolean
          invoice_id: string | null
          is_blocked: boolean
          last_update_at: string | null
          last_update_work_date: string | null
          next_action: string | null
          next_action_due: string | null
          origin: string
          payment_status: string
          procedure_type: string | null
          reference: string | null
          sales_rep: string | null
          service_description: string | null
          stage: string
          stage_changed_at: string
          status: string
          student_email: string | null
          student_first_name: string
          student_last_name: string
          student_whatsapp: string | null
          target_date: string | null
          updated_at: string
          visa_result: string | null
        }
        Insert: {
          admission_result?: string | null
          assigned_to?: string | null
          blocked_reason?: string | null
          client_id?: string | null
          closed_at?: string | null
          closure_outcome?: string | null
          contract_status?: string
          created_at?: string
          created_by?: string | null
          destination_country?: string | null
          id?: string
          includes_visa?: boolean
          invoice_id?: string | null
          is_blocked?: boolean
          last_update_at?: string | null
          last_update_work_date?: string | null
          next_action?: string | null
          next_action_due?: string | null
          origin?: string
          payment_status?: string
          procedure_type?: string | null
          reference?: string | null
          sales_rep?: string | null
          service_description?: string | null
          stage?: string
          stage_changed_at?: string
          status?: string
          student_email?: string | null
          student_first_name: string
          student_last_name: string
          student_whatsapp?: string | null
          target_date?: string | null
          updated_at?: string
          visa_result?: string | null
        }
        Update: {
          admission_result?: string | null
          assigned_to?: string | null
          blocked_reason?: string | null
          client_id?: string | null
          closed_at?: string | null
          closure_outcome?: string | null
          contract_status?: string
          created_at?: string
          created_by?: string | null
          destination_country?: string | null
          id?: string
          includes_visa?: boolean
          invoice_id?: string | null
          is_blocked?: boolean
          last_update_at?: string | null
          last_update_work_date?: string | null
          next_action?: string | null
          next_action_due?: string | null
          origin?: string
          payment_status?: string
          procedure_type?: string | null
          reference?: string | null
          sales_rep?: string | null
          service_description?: string | null
          stage?: string
          stage_changed_at?: string
          status?: string
          student_email?: string | null
          student_first_name?: string
          student_last_name?: string
          student_whatsapp?: string | null
          target_date?: string | null
          updated_at?: string
          visa_result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dossiers_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dossiers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_contract_status"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "dossiers_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossiers_procedure_type_fkey"
            columns: ["procedure_type"]
            isOneToOne: false
            referencedRelation: "procedure_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "dossiers_stage_fkey"
            columns: ["stage"]
            isOneToOne: false
            referencedRelation: "dossier_stages"
            referencedColumns: ["code"]
          },
        ]
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
          invoice_id: string | null
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
          invoice_id?: string | null
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
          invoice_id?: string | null
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
          {
            foreignKeyName: "engagements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_contract_status"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "engagements_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
          destination_country: string | null
          id: string
          includes_visa: boolean
          invoice_date: string
          invoice_number: string
          last_status_change: string
          payment_type: string
          procedure_type: string | null
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
          destination_country?: string | null
          id?: string
          includes_visa?: boolean
          invoice_date: string
          invoice_number: string
          last_status_change?: string
          payment_type: string
          procedure_type?: string | null
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
          destination_country?: string | null
          id?: string
          includes_visa?: boolean
          invoice_date?: string
          invoice_number?: string
          last_status_change?: string
          payment_type?: string
          procedure_type?: string | null
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
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_contract_status"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "invoices_procedure_type_fkey"
            columns: ["procedure_type"]
            isOneToOne: false
            referencedRelation: "procedure_types"
            referencedColumns: ["code"]
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
            foreignKeyName: "payment_installments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_contract_status"
            referencedColumns: ["client_id"]
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
      procedure_types: {
        Row: {
          active: boolean
          code: string
          created_at: string
          default_assignee_id: string | null
          default_collaborator_ids: string[]
          label: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          default_assignee_id?: string | null
          default_collaborator_ids?: string[]
          label: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          default_assignee_id?: string | null
          default_collaborator_ids?: string[]
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "procedure_types_default_assignee_id_fkey"
            columns: ["default_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          is_active: boolean
          procedure_scope: string[] | null
          sales_rep_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          is_active?: boolean
          procedure_scope?: string[] | null
          sales_rep_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          is_active?: boolean
          procedure_scope?: string[] | null
          sales_rep_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
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
      sales_reps: {
        Row: {
          active: boolean
          created_at: string | null
          email: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          updated_at?: string | null
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
      v_contract_status: {
        Row: {
          client_created_by: string | null
          client_id: string | null
          email: string | null
          engagement_id: string | null
          entity_key: string | null
          expires_at: string | null
          link_created_at: string | null
          nom: string | null
          opened_at: string | null
          pdf_url: string | null
          prenom: string | null
          request_created_by: string | null
          request_id: string | null
          request_status: string | null
          request_token: string | null
          signature_id: string | null
          signed_at: string | null
          signer_ip: unknown
          signer_name: string | null
          statut_lisible: string | null
          telephone: string | null
          template_version: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signature_requests_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _create_contract_request_from_invoice_impl: {
        Args: { p_entity_key?: string; p_invoice_id: string }
        Returns: Json
      }
      _dossier_log: {
        Args: {
          p_body: string
          p_dossier_id: string
          p_from_stage?: string
          p_meta?: Json
          p_to_stage?: string
          p_type: string
        }
        Returns: string
      }
      _dossier_require_comment: {
        Args: { p_comment: string }
        Returns: undefined
      }
      _dossier_set_collaborators: {
        Args: { p_dossier_id: string; p_user_ids: string[] }
        Returns: undefined
      }
      _ensure_dossier_for_invoice: {
        Args: { p_invoice_id: string }
        Returns: string
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_active: boolean
          last_sign_in_at: string
          procedure_scope: string[]
          roles: string[]
          sales_rep_id: string
          sales_rep_name: string
          user_id: string
        }[]
      }
      admin_update_user_access: {
        Args: {
          p_full_name: string
          p_is_active: boolean
          p_procedure_scope: string[]
          p_roles: string[]
          p_sales_rep_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      attach_signature_pdf: {
        Args: { p_pdf_url: string; p_signature_id: string }
        Returns: undefined
      }
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
        Args: {
          p_entity_key?: string
          p_force_new?: boolean
          p_invoice_id: string
        }
        Returns: Json
      }
      create_manual_dossier: {
        Args: {
          p_assigned_to: string
          p_destination_country: string
          p_email: string
          p_first_name: string
          p_includes_visa: boolean
          p_last_name: string
          p_note: string
          p_procedure_type: string
          p_whatsapp: string
        }
        Returns: string
      }
      create_signature_request: {
        Args: {
          p_client_id: string
          p_engagement_id: string
          p_entity?: Json
          p_entity_key: string
        }
        Returns: Json
      }
      dossier_add_entry: {
        Args: {
          p_body: string
          p_dossier_id: string
          p_next_action?: string
          p_next_action_due?: string
          p_type: string
        }
        Returns: string
      }
      dossier_assign: {
        Args: {
          p_assigned_to: string
          p_collaborators: string[]
          p_comment?: string
          p_dossier_id: string
        }
        Returns: undefined
      }
      dossier_can_edit: {
        Args: { _dossier_id: string; _uid: string }
        Returns: boolean
      }
      dossier_change_stage: {
        Args: {
          p_comment: string
          p_dossier_id: string
          p_result?: string
          p_stage: string
        }
        Returns: undefined
      }
      dossier_is_processor: { Args: { _uid: string }; Returns: boolean }
      dossier_set_blocked: {
        Args: { p_blocked: boolean; p_dossier_id: string; p_reason: string }
        Returns: undefined
      }
      dossier_set_status: {
        Args: {
          p_comment: string
          p_dossier_id: string
          p_outcome: string
          p_status: string
        }
        Returns: undefined
      }
      dossier_update_info: {
        Args: { p_dossier_id: string; p_fields: Json }
        Returns: undefined
      }
      dossier_visible: {
        Args: {
          _assigned_to: string
          _dossier_id: string
          _procedure_type: string
          _uid: string
        }
        Returns: boolean
      }
      dossier_work_date: { Args: never; Returns: string }
      enforce_contract_rate_limit: {
        Args: {
          p_identifier: string
          p_limit: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: undefined
      }
      generate_signing_token: { Args: never; Returns: string }
      get_contract_followups: {
        Args: { p_include_signed?: boolean }
        Returns: {
          amount: number
          client_email: string
          client_first_name: string
          client_last_name: string
          client_whatsapp: string
          contract_state: string
          currency: string
          expires_at: string
          invoice_created_at: string
          invoice_id: string
          invoice_number: string
          invoice_status: string
          last_reminded_at: string
          opened_at: string
          owner_user_id: string
          reminder_count: number
          request_id: string
          sales_representative: string
          sent_at: string
          signed_at: string
          token: string
        }[]
      }
      get_contract_request_context: { Args: { p_token: string }; Returns: Json }
      get_invoice_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          last_status_change: string
          payment_type: string
          product_code: string
          receipt_url: string
          sales_representative: string
          service_description: string
          status: string
          user_id: string
        }[]
      }
      get_my_access: { Args: never; Returns: Json }
      get_next_invoice_number: { Args: { p_year: number }; Returns: string }
      get_public_contract_pdf_path: {
        Args: { p_token: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_paid_invoices_as_dossiers: {
        Args: { p_since: string }
        Returns: number
      }
      invoice_contract_state: {
        Args: { p_invoice_id: string }
        Returns: string
      }
      list_dossier_team: {
        Args: never
        Returns: {
          email: string
          full_name: string
          procedure_scope: string[]
          roles: string[]
          user_id: string
        }[]
      }
      log_contract_reminder: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      log_contract_token_access: {
        Args: {
          p_ip?: string
          p_outcome: string
          p_token_hint: string
          p_user_agent?: string
        }
        Returns: undefined
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
      submit_contract_request_signature: {
        Args: {
          p_contract_hash: string
          p_read_and_agreed: boolean
          p_refund_policy_accepted?: boolean
          p_rendered_body: string
          p_signature_image: string
          p_signer_ip?: string
          p_signer_name: string
          p_token: string
          p_user_agent?: string
        }
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
      app_role:
        | "admin"
        | "sales_rep"
        | "comptable"
        | "commercial"
        | "agent"
        | "contractuel"
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
      app_role: [
        "admin",
        "sales_rep",
        "comptable",
        "commercial",
        "agent",
        "contractuel",
      ],
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
