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
      companies: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          language: string
          logo_url: string | null
          name: string
          phone: string | null
          plan: Database["public"]["Enums"]["company_plan"]
          status: Database["public"]["Enums"]["company_status"]
          timezone: string
          trial_end: string
          trial_start: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          language?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["company_plan"]
          status?: Database["public"]["Enums"]["company_status"]
          timezone?: string
          trial_end?: string
          trial_start?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          language?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["company_plan"]
          status?: Database["public"]["Enums"]["company_status"]
          timezone?: string
          trial_end?: string
          trial_start?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_access_at: string | null
          position: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_access_at?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_access_at?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_attachments: {
        Row: {
          company_id: string
          created_at: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["crm_entity_kind"]
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["crm_entity_kind"]
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_kind?: Database["public"]["Enums"]["crm_entity_kind"]
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_companies: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          segment: string | null
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          segment?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          segment?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          crm_company_id: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_custom_field_values: {
        Row: {
          company_id: string
          created_at: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["crm_entity_kind"]
          field_id: string
          id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          company_id: string
          created_at?: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["crm_entity_kind"]
          field_id: string
          id?: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_kind?: Database["public"]["Enums"]["crm_entity_kind"]
          field_id?: string
          id?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_custom_field_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crm_custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_custom_fields: {
        Row: {
          applies_to: Database["public"]["Enums"]["crm_entity_kind"][]
          archived: boolean
          company_id: string
          created_at: string
          field_type: Database["public"]["Enums"]["crm_custom_field_type"]
          id: string
          key: string
          label: string
          options: Json
          position: number
          required: boolean
          updated_at: string
        }
        Insert: {
          applies_to?: Database["public"]["Enums"]["crm_entity_kind"][]
          archived?: boolean
          company_id: string
          created_at?: string
          field_type?: Database["public"]["Enums"]["crm_custom_field_type"]
          id?: string
          key: string
          label: string
          options?: Json
          position?: number
          required?: boolean
          updated_at?: string
        }
        Update: {
          applies_to?: Database["public"]["Enums"]["crm_entity_kind"][]
          archived?: boolean
          company_id?: string
          created_at?: string
          field_type?: Database["public"]["Enums"]["crm_custom_field_type"]
          id?: string
          key?: string
          label?: string
          options?: Json
          position?: number
          required?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_custom_fields_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_customer_tags: {
        Row: {
          company_id: string
          customer_id: string
          tag_id: string
        }
        Insert: {
          company_id: string
          customer_id: string
          tag_id: string
        }
        Update: {
          company_id?: string
          customer_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_customer_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_customer_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_customers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          created_by: string | null
          crm_company_id: string | null
          document: string | null
          email: string | null
          id: string
          job_title: string | null
          name: string
          notes: string | null
          original_lead_id: string | null
          owner_id: string | null
          phone: string | null
          state: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          document?: string | null
          email?: string | null
          id?: string
          job_title?: string | null
          name: string
          notes?: string | null
          original_lead_id?: string | null
          owner_id?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          document?: string | null
          email?: string | null
          id?: string
          job_title?: string | null
          name?: string
          notes?: string | null
          original_lead_id?: string | null
          owner_id?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_customers_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_customers_original_lead_id_fkey"
            columns: ["original_lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deal_tags: {
        Row: {
          company_id: string
          deal_id: string
          tag_id: string
        }
        Insert: {
          company_id: string
          deal_id: string
          tag_id: string
        }
        Update: {
          company_id?: string
          deal_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_deal_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_tags_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deal_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          closed_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          crm_company_id: string | null
          customer_id: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          loss_reason_id: string | null
          number: string
          owner_id: string | null
          pipeline_id: string
          position: number
          probability: number
          stage_id: string
          status: Database["public"]["Enums"]["crm_deal_status"]
          title: string
          updated_at: string
          value: number
          win_reason_id: string | null
        }
        Insert: {
          closed_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          customer_id?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          loss_reason_id?: string | null
          number: string
          owner_id?: string | null
          pipeline_id: string
          position?: number
          probability?: number
          stage_id: string
          status?: Database["public"]["Enums"]["crm_deal_status"]
          title: string
          updated_at?: string
          value?: number
          win_reason_id?: string | null
        }
        Update: {
          closed_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          customer_id?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          loss_reason_id?: string | null
          number?: string
          owner_id?: string | null
          pipeline_id?: string
          position?: number
          probability?: number
          stage_id?: string
          status?: Database["public"]["Enums"]["crm_deal_status"]
          title?: string
          updated_at?: string
          value?: number
          win_reason_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_loss_reason_id_fkey"
            columns: ["loss_reason_id"]
            isOneToOne: false
            referencedRelation: "crm_loss_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_win_reason_id_fkey"
            columns: ["win_reason_id"]
            isOneToOne: false
            referencedRelation: "crm_win_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_sources: {
        Row: {
          archived: boolean
          color: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_sources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_tags: {
        Row: {
          company_id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          company_id: string
          lead_id: string
          tag_id: string
        }
        Update: {
          company_id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          archived: boolean
          city: string | null
          company_id: string
          company_text: string | null
          converted_customer_id: string | null
          created_at: string
          created_by: string | null
          crm_company_id: string | null
          document: string | null
          email: string | null
          estimated_value: number | null
          id: string
          job_title: string | null
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          source_id: string | null
          state: string | null
          status: Database["public"]["Enums"]["crm_lead_status"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          archived?: boolean
          city?: string | null
          company_id: string
          company_text?: string | null
          converted_customer_id?: string | null
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          document?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          job_title?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          archived?: boolean
          city?: string | null
          company_id?: string
          company_text?: string | null
          converted_customer_id?: string | null
          created_at?: string
          created_by?: string | null
          crm_company_id?: string | null
          document?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          job_title?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          source_id?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["crm_lead_status"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_converted_customer_fk"
            columns: ["converted_customer_id"]
            isOneToOne: false
            referencedRelation: "crm_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_crm_company_id_fkey"
            columns: ["crm_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "crm_lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_loss_reasons: {
        Row: {
          archived: boolean
          company_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          company_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_loss_reasons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_notes: {
        Row: {
          author_id: string | null
          company_id: string
          content: string
          created_at: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["crm_entity_kind"]
          id: string
        }
        Insert: {
          author_id?: string | null
          company_id: string
          content: string
          created_at?: string
          entity_id: string
          entity_kind: Database["public"]["Enums"]["crm_entity_kind"]
          id?: string
        }
        Update: {
          author_id?: string | null
          company_id?: string
          content?: string
          created_at?: string
          entity_id?: string
          entity_kind?: Database["public"]["Enums"]["crm_entity_kind"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          archived: boolean
          color: string | null
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipelines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          company_id: string
          conversion_rules: Json
          created_at: string
          currency: string
          date_format: string
          deal_counter: number
          deal_prefix: string
          default_deal_value: number
          default_owner_id: string | null
          default_pipeline_id: string | null
          module_label: string
          required_fields: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          company_id: string
          conversion_rules?: Json
          created_at?: string
          currency?: string
          date_format?: string
          deal_counter?: number
          deal_prefix?: string
          default_deal_value?: number
          default_owner_id?: string | null
          default_pipeline_id?: string | null
          module_label?: string
          required_fields?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          conversion_rules?: Json
          created_at?: string
          currency?: string
          date_format?: string
          deal_counter?: number
          deal_prefix?: string
          default_deal_value?: number
          default_owner_id?: string | null
          default_pipeline_id?: string | null
          module_label?: string
          required_fields?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_settings_default_pipeline_id_fkey"
            columns: ["default_pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["crm_stage_kind"]
          name: string
          pipeline_id: string
          position: number
          probability: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["crm_stage_kind"]
          name: string
          pipeline_id: string
          position?: number
          probability?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["crm_stage_kind"]
          name?: string
          pipeline_id?: string
          position?: number
          probability?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          archived: boolean
          color: string
          company_id: string
          created_at: string
          id: string
          name: string
          suggested: boolean
          updated_at: string
        }
        Insert: {
          archived?: boolean
          color?: string
          company_id: string
          created_at?: string
          id?: string
          name: string
          suggested?: boolean
          updated_at?: string
        }
        Update: {
          archived?: boolean
          color?: string
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          suggested?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_timeline_events: {
        Row: {
          actor_id: string | null
          company_id: string
          created_at: string
          data: Json
          description: string | null
          entity_id: string
          entity_kind: Database["public"]["Enums"]["crm_entity_kind"]
          event_type: string
          id: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          company_id: string
          created_at?: string
          data?: Json
          description?: string | null
          entity_id: string
          entity_kind: Database["public"]["Enums"]["crm_entity_kind"]
          event_type: string
          id?: string
          title: string
        }
        Update: {
          actor_id?: string | null
          company_id?: string
          created_at?: string
          data?: Json
          description?: string | null
          entity_id?: string
          entity_kind?: Database["public"]["Enums"]["crm_entity_kind"]
          event_type?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_timeline_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_win_reasons: {
        Row: {
          archived: boolean
          company_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          company_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_win_reasons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_company_id: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_company_id?: string | null
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_company_id?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_company_id_fkey"
            columns: ["current_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_company_with_owner: {
        Args: { p_email?: string; p_name: string; p_phone?: string }
        Returns: string
      }
      crm_convert_lead_to_customer: {
        Args: { _lead_id: string }
        Returns: string
      }
      crm_move_deal: {
        Args: { _deal_id: string; _position?: number; _stage_id: string }
        Returns: undefined
      }
      crm_next_deal_number: { Args: { _company_id: string }; Returns: string }
      get_company_role: {
        Args: { _company_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_platform_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "master" | "admin" | "manager" | "seller" | "agent" | "user"
      company_plan: "trial" | "starter" | "pro" | "enterprise"
      company_status:
        | "trial"
        | "active"
        | "trial_expired"
        | "suspended"
        | "cancelled"
      crm_custom_field_type:
        | "text"
        | "number"
        | "date"
        | "time"
        | "select"
        | "multiselect"
        | "checkbox"
        | "url"
        | "email"
        | "phone"
        | "currency"
      crm_deal_status: "open" | "won" | "lost"
      crm_entity_kind: "lead" | "customer" | "company" | "contact" | "deal"
      crm_lead_status: "new" | "working" | "converted" | "archived" | "lost"
      crm_stage_kind: "initial" | "open" | "won" | "lost"
      member_status: "active" | "invited" | "suspended"
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
      app_role: ["master", "admin", "manager", "seller", "agent", "user"],
      company_plan: ["trial", "starter", "pro", "enterprise"],
      company_status: [
        "trial",
        "active",
        "trial_expired",
        "suspended",
        "cancelled",
      ],
      crm_custom_field_type: [
        "text",
        "number",
        "date",
        "time",
        "select",
        "multiselect",
        "checkbox",
        "url",
        "email",
        "phone",
        "currency",
      ],
      crm_deal_status: ["open", "won", "lost"],
      crm_entity_kind: ["lead", "customer", "company", "contact", "deal"],
      crm_lead_status: ["new", "working", "converted", "archived", "lost"],
      crm_stage_kind: ["initial", "open", "won", "lost"],
      member_status: ["active", "invited", "suspended"],
    },
  },
} as const
