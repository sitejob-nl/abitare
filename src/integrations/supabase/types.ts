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
      communication_log: {
        Row: {
          body_preview: string | null
          created_at: string
          customer_id: string | null
          direction: Database["public"]["Enums"]["communication_direction"]
          division_id: string | null
          external_message_id: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          sent_at: string
          sent_by: string | null
          subject: string | null
          ticket_id: string | null
          type: Database["public"]["Enums"]["communication_type"]
        }
        Insert: {
          body_preview?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["communication_direction"]
          division_id?: string | null
          external_message_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
          ticket_id?: string | null
          type?: Database["public"]["Enums"]["communication_type"]
        }
        Update: {
          body_preview?: string | null
          created_at?: string
          customer_id?: string | null
          direction?: Database["public"]["Enums"]["communication_direction"]
          division_id?: string | null
          external_message_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          sent_at?: string
          sent_by?: string | null
          subject?: string | null
          ticket_id?: string | null
          type?: Database["public"]["Enums"]["communication_type"]
        }
        Relationships: [
          {
            foreignKeyName: "communication_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_log_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_planning_preferences: {
        Row: {
          created_at: string
          id: string
          order_id: string
          preferred_date_1: string | null
          preferred_date_2: string | null
          preferred_date_3: string | null
          remarks: string | null
          submitted_at: string
          time_preference: string | null
          token_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          preferred_date_1?: string | null
          preferred_date_2?: string | null
          preferred_date_3?: string | null
          remarks?: string | null
          submitted_at?: string
          time_preference?: string | null
          token_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          preferred_date_1?: string | null
          preferred_date_2?: string | null
          preferred_date_3?: string | null
          remarks?: string | null
          submitted_at?: string
          time_preference?: string | null
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_planning_preferences_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_planning_preferences_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_planning_preferences_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "customer_portal_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_accessed_at: string | null
          order_id: string | null
          quote_id: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          order_id?: string | null
          quote_id?: string | null
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          order_id?: string | null
          quote_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_tokens_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_portal_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_portal_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_portal_tokens_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          accepts_marketing: boolean | null
          assistant_id: string | null
          city: string | null
          coc_number: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          customer_number: number
          customer_type: Database["public"]["Enums"]["customer_type"]
          delivery_city: string | null
          delivery_floor: string | null
          delivery_has_elevator: boolean | null
          delivery_postal_code: string | null
          delivery_street_address: string | null
          division_id: string | null
          email: string | null
          exact_account_id: string | null
          first_name: string | null
          id: string
          last_name: string
          mobile: string | null
          notes: string | null
          phone: string | null
          phone_2: string | null
          postal_code: string | null
          referral_reward_given: boolean | null
          referral_reward_type: string | null
          referral_reward_value: number | null
          referred_by_customer_id: string | null
          salesperson_id: string | null
          salutation: string | null
          street_address: string | null
          updated_at: string | null
          vat_number: string | null
        }
        Insert: {
          accepts_marketing?: boolean | null
          assistant_id?: string | null
          city?: string | null
          coc_number?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          customer_number?: number
          customer_type?: Database["public"]["Enums"]["customer_type"]
          delivery_city?: string | null
          delivery_floor?: string | null
          delivery_has_elevator?: boolean | null
          delivery_postal_code?: string | null
          delivery_street_address?: string | null
          division_id?: string | null
          email?: string | null
          exact_account_id?: string | null
          first_name?: string | null
          id?: string
          last_name: string
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          phone_2?: string | null
          postal_code?: string | null
          referral_reward_given?: boolean | null
          referral_reward_type?: string | null
          referral_reward_value?: number | null
          referred_by_customer_id?: string | null
          salesperson_id?: string | null
          salutation?: string | null
          street_address?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Update: {
          accepts_marketing?: boolean | null
          assistant_id?: string | null
          city?: string | null
          coc_number?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          customer_number?: number
          customer_type?: Database["public"]["Enums"]["customer_type"]
          delivery_city?: string | null
          delivery_floor?: string | null
          delivery_has_elevator?: boolean | null
          delivery_postal_code?: string | null
          delivery_street_address?: string | null
          division_id?: string | null
          email?: string | null
          exact_account_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          phone_2?: string | null
          postal_code?: string | null
          referral_reward_given?: boolean | null
          referral_reward_type?: string | null
          referral_reward_value?: number | null
          referred_by_customer_id?: string | null
          salesperson_id?: string | null
          salutation?: string | null
          street_address?: string | null
          updated_at?: string | null
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_referred_by_customer_id_fkey"
            columns: ["referred_by_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_groups: {
        Row: {
          code: string
          created_at: string | null
          default_discount_percent: number | null
          id: string
          name: string
          supplier_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          default_discount_percent?: number | null
          id?: string
          name: string
          supplier_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          default_discount_percent?: number | null
          id?: string
          name?: string
          supplier_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_groups_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      divisions: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          postal_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          postal_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          postal_code?: string | null
        }
        Relationships: []
      }
      exact_online_connections: {
        Row: {
          access_token: string | null
          connected_at: string | null
          connected_by: string | null
          created_at: string | null
          division_id: string | null
          exact_division: number | null
          id: string
          is_active: boolean | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string | null
          webhooks_enabled: boolean | null
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          division_id?: string | null
          exact_division?: number | null
          id?: string
          is_active?: boolean | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          webhooks_enabled?: boolean | null
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          division_id?: string | null
          exact_division?: number | null
          id?: string
          is_active?: boolean | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          webhooks_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "exact_online_connections_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: true
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      exact_webhook_logs: {
        Row: {
          action: string
          connection_id: string | null
          created_at: string | null
          endpoint: string | null
          entity_key: string | null
          error_message: string | null
          exact_division: number | null
          id: string
          processed: boolean | null
          processed_at: string | null
          topic: string
        }
        Insert: {
          action: string
          connection_id?: string | null
          created_at?: string | null
          endpoint?: string | null
          entity_key?: string | null
          error_message?: string | null
          exact_division?: number | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          topic: string
        }
        Update: {
          action?: string
          connection_id?: string | null
          created_at?: string | null
          endpoint?: string | null
          entity_key?: string | null
          error_message?: string | null
          exact_division?: number | null
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "exact_webhook_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "exact_online_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string
          division_id: string | null
          error_details: Json | null
          errors: number | null
          file_name: string | null
          id: string
          imported_by: string | null
          inserted: number | null
          metadata: Json | null
          skipped: number | null
          source: string
          supplier_id: string | null
          total_rows: number | null
          updated: number | null
        }
        Insert: {
          created_at?: string
          division_id?: string | null
          error_details?: Json | null
          errors?: number | null
          file_name?: string | null
          id?: string
          imported_by?: string | null
          inserted?: number | null
          metadata?: Json | null
          skipped?: number | null
          source?: string
          supplier_id?: string | null
          total_rows?: number | null
          updated?: number | null
        }
        Update: {
          created_at?: string
          division_id?: string | null
          error_details?: Json | null
          errors?: number | null
          file_name?: string | null
          id?: string
          imported_by?: string | null
          inserted?: number | null
          metadata?: Json | null
          skipped?: number | null
          source?: string
          supplier_id?: string | null
          total_rows?: number | null
          updated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      installation_rates: {
        Row: {
          code: string
          created_at: string | null
          default_price: number | null
          id: string
          is_active: boolean | null
          name: string
          unit: string | null
          vat_rate: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          default_price?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          unit?: string | null
          vat_rate?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          default_price?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          unit?: string | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      microsoft_connections: {
        Row: {
          access_token: string
          connected_at: string
          created_at: string
          id: string
          is_active: boolean
          microsoft_email: string | null
          microsoft_user_id: string | null
          refresh_token: string
          scopes: string[]
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          microsoft_email?: string | null
          microsoft_user_id?: string | null
          refresh_token: string
          scopes: string[]
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          microsoft_email?: string | null
          microsoft_user_id?: string | null
          refresh_token?: string
          scopes?: string[]
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_checklist_items: {
        Row: {
          checked: boolean
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          label: string
          order_id: string
          sort_order: number
        }
        Insert: {
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          label: string
          order_id: string
          sort_order?: number
        }
        Update: {
          checked?: boolean
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          label?: string
          order_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_checklist_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_checklist_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_documents: {
        Row: {
          created_at: string | null
          document_type: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          order_id: string | null
          title: string | null
          uploaded_by: string | null
          visible_to_customer: boolean | null
          visible_to_installer: boolean | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          order_id?: string | null
          title?: string | null
          uploaded_by?: string | null
          visible_to_customer?: boolean | null
          visible_to_installer?: boolean | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          order_id?: string | null
          title?: string | null
          uploaded_by?: string | null
          visible_to_customer?: boolean | null
          visible_to_installer?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          article_code: string | null
          configuration: Json | null
          cost_price: number | null
          created_at: string | null
          delivered_at: string | null
          description: string
          discount_percentage: number | null
          expected_delivery: string | null
          group_title: string | null
          id: string
          is_delivered: boolean | null
          is_group_header: boolean | null
          is_ordered: boolean | null
          line_total: number | null
          order_id: string | null
          ordered_at: string | null
          product_id: string | null
          quantity: number | null
          quote_line_id: string | null
          section_id: string | null
          section_type: string | null
          sort_order: number | null
          supplier_id: string | null
          unit: string | null
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          article_code?: string | null
          configuration?: Json | null
          cost_price?: number | null
          created_at?: string | null
          delivered_at?: string | null
          description: string
          discount_percentage?: number | null
          expected_delivery?: string | null
          group_title?: string | null
          id?: string
          is_delivered?: boolean | null
          is_group_header?: boolean | null
          is_ordered?: boolean | null
          line_total?: number | null
          order_id?: string | null
          ordered_at?: string | null
          product_id?: string | null
          quantity?: number | null
          quote_line_id?: string | null
          section_id?: string | null
          section_type?: string | null
          sort_order?: number | null
          supplier_id?: string | null
          unit?: string | null
          unit_price: number
          vat_rate?: number | null
        }
        Update: {
          article_code?: string | null
          configuration?: Json | null
          cost_price?: number | null
          created_at?: string | null
          delivered_at?: string | null
          description?: string
          discount_percentage?: number | null
          expected_delivery?: string | null
          group_title?: string | null
          id?: string
          is_delivered?: boolean | null
          is_group_header?: boolean | null
          is_ordered?: boolean | null
          line_total?: number | null
          order_id?: string | null
          ordered_at?: string | null
          product_id?: string | null
          quantity?: number | null
          quote_line_id?: string | null
          section_id?: string | null
          section_type?: string | null
          sort_order?: number | null
          supplier_id?: string | null
          unit?: string | null
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_quote_line_id_fkey"
            columns: ["quote_line_id"]
            isOneToOne: false
            referencedRelation: "quote_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "order_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          note_type: string | null
          order_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_type?: string | null
          order_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          note_type?: string | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_sections: {
        Row: {
          color_id: string | null
          column_height_mm: number | null
          configuration: Json | null
          corpus_color: string | null
          countertop_height_mm: number | null
          countertop_thickness_mm: number | null
          created_at: string | null
          description: string | null
          discount_amount: number | null
          discount_description: string | null
          discount_percentage: number | null
          drawer_color: string | null
          front_color: string | null
          front_number: string | null
          handle_number: string | null
          hinge_color: string | null
          id: string
          order_id: string
          plinth_color: string | null
          price_group_id: string | null
          quote_section_id: string | null
          range_id: string | null
          section_type: string
          sort_order: number | null
          subtotal: number | null
          title: string | null
          workbench_color: string | null
          workbench_edge: string | null
          workbench_material: string | null
        }
        Insert: {
          color_id?: string | null
          column_height_mm?: number | null
          configuration?: Json | null
          corpus_color?: string | null
          countertop_height_mm?: number | null
          countertop_thickness_mm?: number | null
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_description?: string | null
          discount_percentage?: number | null
          drawer_color?: string | null
          front_color?: string | null
          front_number?: string | null
          handle_number?: string | null
          hinge_color?: string | null
          id?: string
          order_id: string
          plinth_color?: string | null
          price_group_id?: string | null
          quote_section_id?: string | null
          range_id?: string | null
          section_type: string
          sort_order?: number | null
          subtotal?: number | null
          title?: string | null
          workbench_color?: string | null
          workbench_edge?: string | null
          workbench_material?: string | null
        }
        Update: {
          color_id?: string | null
          column_height_mm?: number | null
          configuration?: Json | null
          corpus_color?: string | null
          countertop_height_mm?: number | null
          countertop_thickness_mm?: number | null
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_description?: string | null
          discount_percentage?: number | null
          drawer_color?: string | null
          front_color?: string | null
          front_number?: string | null
          handle_number?: string | null
          hinge_color?: string | null
          id?: string
          order_id?: string
          plinth_color?: string | null
          price_group_id?: string | null
          quote_section_id?: string | null
          range_id?: string | null
          section_type?: string
          sort_order?: number | null
          subtotal?: number | null
          title?: string | null
          workbench_color?: string | null
          workbench_edge?: string | null
          workbench_material?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_sections_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_sections_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_sections_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_sections_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_sections_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["price_group_id"]
          },
          {
            foreignKeyName: "order_sections_quote_section_id_fkey"
            columns: ["quote_section_id"]
            isOneToOne: false
            referencedRelation: "quote_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_sections_range_id_fkey"
            columns: ["range_id"]
            isOneToOne: false
            referencedRelation: "product_ranges"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          notes: string | null
          order_id: string | null
          overridden_by: string | null
          override_reason: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id?: string | null
          overridden_by?: string | null
          override_reason?: string | null
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          actual_delivery_date: string | null
          actual_installation_date: string | null
          amount_paid: number | null
          assistant_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          customer_notes: string | null
          delivery_city: string | null
          delivery_method: string | null
          delivery_notes: string | null
          delivery_postal_code: string | null
          delivery_street_address: string | null
          deposit_invoice_sent: boolean
          deposit_reminder_date: string | null
          deposit_required: boolean
          discount_amount: number | null
          division_id: string | null
          exact_customer_id: string | null
          exact_invoice_id: string | null
          exact_sales_order_id: string | null
          exact_sales_order_number: string | null
          expected_delivery_date: string | null
          expected_installation_date: string | null
          id: string
          installation_city: string | null
          installation_postal_code: string | null
          installation_street_address: string | null
          installer_id: string | null
          internal_notes: string | null
          invoice_city: string | null
          invoice_postal_code: string | null
          invoice_street_address: string | null
          is_standalone_invoice: boolean | null
          margin_amount: number | null
          margin_percentage: number | null
          order_confirmation_sent_at: string | null
          order_date: string | null
          order_number: number
          outlook_event_id: string | null
          payment_condition: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          project_id: string | null
          quote_id: string | null
          requires_elevator: boolean | null
          salesperson_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal_montage: number | null
          subtotal_products: number | null
          total_cost_price: number | null
          total_excl_vat: number | null
          total_incl_vat: number | null
          total_vat: number | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          actual_installation_date?: string | null
          amount_paid?: number | null
          assistant_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          customer_notes?: string | null
          delivery_city?: string | null
          delivery_method?: string | null
          delivery_notes?: string | null
          delivery_postal_code?: string | null
          delivery_street_address?: string | null
          deposit_invoice_sent?: boolean
          deposit_reminder_date?: string | null
          deposit_required?: boolean
          discount_amount?: number | null
          division_id?: string | null
          exact_customer_id?: string | null
          exact_invoice_id?: string | null
          exact_sales_order_id?: string | null
          exact_sales_order_number?: string | null
          expected_delivery_date?: string | null
          expected_installation_date?: string | null
          id?: string
          installation_city?: string | null
          installation_postal_code?: string | null
          installation_street_address?: string | null
          installer_id?: string | null
          internal_notes?: string | null
          invoice_city?: string | null
          invoice_postal_code?: string | null
          invoice_street_address?: string | null
          is_standalone_invoice?: boolean | null
          margin_amount?: number | null
          margin_percentage?: number | null
          order_confirmation_sent_at?: string | null
          order_date?: string | null
          order_number?: number
          outlook_event_id?: string | null
          payment_condition?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          project_id?: string | null
          quote_id?: string | null
          requires_elevator?: boolean | null
          salesperson_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal_montage?: number | null
          subtotal_products?: number | null
          total_cost_price?: number | null
          total_excl_vat?: number | null
          total_incl_vat?: number | null
          total_vat?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          actual_installation_date?: string | null
          amount_paid?: number | null
          assistant_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          customer_notes?: string | null
          delivery_city?: string | null
          delivery_method?: string | null
          delivery_notes?: string | null
          delivery_postal_code?: string | null
          delivery_street_address?: string | null
          deposit_invoice_sent?: boolean
          deposit_reminder_date?: string | null
          deposit_required?: boolean
          discount_amount?: number | null
          division_id?: string | null
          exact_customer_id?: string | null
          exact_invoice_id?: string | null
          exact_sales_order_id?: string | null
          exact_sales_order_number?: string | null
          expected_delivery_date?: string | null
          expected_installation_date?: string | null
          id?: string
          installation_city?: string | null
          installation_postal_code?: string | null
          installation_street_address?: string | null
          installer_id?: string | null
          internal_notes?: string | null
          invoice_city?: string | null
          invoice_postal_code?: string | null
          invoice_street_address?: string | null
          is_standalone_invoice?: boolean | null
          margin_amount?: number | null
          margin_percentage?: number | null
          order_confirmation_sent_at?: string | null
          order_date?: string | null
          order_number?: number
          outlook_event_id?: string | null
          payment_condition?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          project_id?: string | null
          quote_id?: string | null
          requires_elevator?: boolean | null
          salesperson_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal_montage?: number | null
          subtotal_products?: number | null
          total_cost_price?: number | null
          total_excl_vat?: number | null
          total_incl_vat?: number | null
          total_vat?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      pims_image_queue: {
        Row: {
          article_code: string
          batch_id: string | null
          created_at: string
          error_message: string | null
          id: string
          image_index: number
          image_url: string
          media_type: string | null
          processed_at: string | null
          product_id: string
          status: string
          supplier_id: string
        }
        Insert: {
          article_code: string
          batch_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          image_index?: number
          image_url: string
          media_type?: string | null
          processed_at?: string | null
          product_id: string
          status?: string
          supplier_id: string
        }
        Update: {
          article_code?: string
          batch_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          image_index?: number
          image_url?: string
          media_type?: string | null
          processed_at?: string | null
          product_id?: string
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pims_image_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pims_image_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pims_image_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pims_image_queue_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      plinth_options: {
        Row: {
          code: string
          created_at: string | null
          height_mm: number | null
          id: string
          is_active: boolean | null
          material: string | null
          name: string
          price_per_meter: number | null
          supplier_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          height_mm?: number | null
          id?: string
          is_active?: boolean | null
          material?: string | null
          name: string
          price_per_meter?: number | null
          supplier_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          height_mm?: number | null
          id?: string
          is_active?: boolean | null
          material?: string | null
          name?: string
          price_per_meter?: number | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plinth_options_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      price_group_colors: {
        Row: {
          color_code: string
          color_name: string
          color_type: string | null
          created_at: string | null
          finish: string | null
          hex_color: string | null
          id: string
          is_available: boolean | null
          material_type: string | null
          price_group_id: string | null
          sort_order: number | null
          supplier_id: string | null
        }
        Insert: {
          color_code: string
          color_name: string
          color_type?: string | null
          created_at?: string | null
          finish?: string | null
          hex_color?: string | null
          id?: string
          is_available?: boolean | null
          material_type?: string | null
          price_group_id?: string | null
          sort_order?: number | null
          supplier_id?: string | null
        }
        Update: {
          color_code?: string
          color_name?: string
          color_type?: string | null
          created_at?: string | null
          finish?: string | null
          hex_color?: string | null
          id?: string
          is_available?: boolean | null
          material_type?: string | null
          price_group_id?: string | null
          sort_order?: number | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_group_colors_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_group_colors_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["price_group_id"]
          },
          {
            foreignKeyName: "price_group_colors_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      price_groups: {
        Row: {
          code: string
          collection: string | null
          created_at: string | null
          has_gola_system: boolean | null
          id: string
          is_glass: boolean | null
          material_description: string | null
          material_type: string | null
          name: string
          sort_order: number | null
          supplier_id: string | null
          thickness_mm: number | null
        }
        Insert: {
          code: string
          collection?: string | null
          created_at?: string | null
          has_gola_system?: boolean | null
          id?: string
          is_glass?: boolean | null
          material_description?: string | null
          material_type?: string | null
          name: string
          sort_order?: number | null
          supplier_id?: string | null
          thickness_mm?: number | null
        }
        Update: {
          code?: string
          collection?: string | null
          created_at?: string | null
          has_gola_system?: boolean | null
          id?: string
          is_glass?: boolean | null
          material_description?: string | null
          material_type?: string | null
          name?: string
          sort_order?: number | null
          supplier_id?: string | null
          thickness_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "price_groups_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          code: string
          id: string
          is_active: boolean | null
          kitchen_group: string | null
          name: string
          parent_id: string | null
          sort_order: number | null
          supplier_id: string | null
        }
        Insert: {
          code: string
          id?: string
          is_active?: boolean | null
          kitchen_group?: string | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          supplier_id?: string | null
        }
        Update: {
          code?: string
          id?: string
          is_active?: boolean | null
          kitchen_group?: string | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_colors: {
        Row: {
          code: string
          color_type: string | null
          hex_color: string | null
          id: string
          is_active: boolean | null
          name: string
          range_id: string | null
        }
        Insert: {
          code: string
          color_type?: string | null
          hex_color?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          range_id?: string | null
        }
        Update: {
          code?: string
          color_type?: string | null
          hex_color?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          range_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_colors_range_id_fkey"
            columns: ["range_id"]
            isOneToOne: false
            referencedRelation: "product_ranges"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          media_type: string | null
          product_id: string
          sort_order: number | null
          source: string | null
          storage_path: string
          type: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_type?: string | null
          product_id: string
          sort_order?: number | null
          source?: string | null
          storage_path: string
          type?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          media_type?: string | null
          product_id?: string
          sort_order?: number | null
          source?: string | null
          storage_path?: string
          type?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          created_at: string | null
          id: string
          price: number
          price_group_id: string | null
          product_id: string | null
          range_id: string | null
          valid_from: string | null
          valid_until: string | null
          variant_2_code: string | null
          variant_2_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          price: number
          price_group_id?: string | null
          product_id?: string | null
          range_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variant_2_code?: string | null
          variant_2_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          price?: number
          price_group_id?: string | null
          product_id?: string | null
          range_id?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variant_2_code?: string | null
          variant_2_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["price_group_id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_range_id_fkey"
            columns: ["range_id"]
            isOneToOne: false
            referencedRelation: "product_ranges"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ranges: {
        Row: {
          available_price_groups: string[] | null
          code: string
          collection: string | null
          description: string | null
          door_type: string | null
          id: string
          is_active: boolean | null
          is_handleless: boolean | null
          name: string | null
          price_group: number | null
          supplier_id: string | null
          type: string | null
        }
        Insert: {
          available_price_groups?: string[] | null
          code: string
          collection?: string | null
          description?: string | null
          door_type?: string | null
          id?: string
          is_active?: boolean | null
          is_handleless?: boolean | null
          name?: string | null
          price_group?: number | null
          supplier_id?: string | null
          type?: string | null
        }
        Update: {
          available_price_groups?: string[] | null
          code?: string
          collection?: string | null
          description?: string | null
          door_type?: string | null
          id?: string
          is_active?: boolean | null
          is_handleless?: boolean | null
          name?: string | null
          price_group?: number | null
          supplier_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_ranges_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          article_code: string
          base_price: number | null
          book_price: number | null
          catalog_code: string | null
          category_id: string | null
          color_basic: string | null
          color_main: string | null
          connection_power_w: number | null
          construction_type: string | null
          cost_price: number | null
          created_at: string | null
          current_a: number | null
          datasheet_url: string | null
          depth_mm: number | null
          depth_open_door_mm: number | null
          description: string | null
          discount_group: string | null
          discount_group_id: string | null
          ean_code: string | null
          energy_class: string | null
          energy_consumption_kwh: number | null
          height_mm: number | null
          id: string
          image_url: string | null
          installation_type: string | null
          is_active: boolean | null
          kitchen_group: string | null
          manufacturer_product_id: string | null
          name: string
          niche_depth_mm: number | null
          niche_height_max_mm: number | null
          niche_height_min_mm: number | null
          niche_width_max_mm: number | null
          niche_width_min_mm: number | null
          noise_class: string | null
          noise_db: number | null
          norm_hours: number | null
          pims_last_synced: string | null
          pricing_unit: Database["public"]["Enums"]["pricing_unit"] | null
          product_family: string | null
          product_series: string | null
          product_status: string | null
          retail_price: number | null
          sku: string | null
          specifications: Json | null
          subcategory: string | null
          supplier_id: string | null
          type_code: string | null
          type_name_nl: string | null
          unit: string | null
          updated_at: string | null
          user_override: Json | null
          vat_rate: number | null
          voltage_v: number | null
          water_consumption_l: number | null
          weight_gross_kg: number | null
          weight_net_kg: number | null
          width_mm: number | null
        }
        Insert: {
          article_code: string
          base_price?: number | null
          book_price?: number | null
          catalog_code?: string | null
          category_id?: string | null
          color_basic?: string | null
          color_main?: string | null
          connection_power_w?: number | null
          construction_type?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_a?: number | null
          datasheet_url?: string | null
          depth_mm?: number | null
          depth_open_door_mm?: number | null
          description?: string | null
          discount_group?: string | null
          discount_group_id?: string | null
          ean_code?: string | null
          energy_class?: string | null
          energy_consumption_kwh?: number | null
          height_mm?: number | null
          id?: string
          image_url?: string | null
          installation_type?: string | null
          is_active?: boolean | null
          kitchen_group?: string | null
          manufacturer_product_id?: string | null
          name: string
          niche_depth_mm?: number | null
          niche_height_max_mm?: number | null
          niche_height_min_mm?: number | null
          niche_width_max_mm?: number | null
          niche_width_min_mm?: number | null
          noise_class?: string | null
          noise_db?: number | null
          norm_hours?: number | null
          pims_last_synced?: string | null
          pricing_unit?: Database["public"]["Enums"]["pricing_unit"] | null
          product_family?: string | null
          product_series?: string | null
          product_status?: string | null
          retail_price?: number | null
          sku?: string | null
          specifications?: Json | null
          subcategory?: string | null
          supplier_id?: string | null
          type_code?: string | null
          type_name_nl?: string | null
          unit?: string | null
          updated_at?: string | null
          user_override?: Json | null
          vat_rate?: number | null
          voltage_v?: number | null
          water_consumption_l?: number | null
          weight_gross_kg?: number | null
          weight_net_kg?: number | null
          width_mm?: number | null
        }
        Update: {
          article_code?: string
          base_price?: number | null
          book_price?: number | null
          catalog_code?: string | null
          category_id?: string | null
          color_basic?: string | null
          color_main?: string | null
          connection_power_w?: number | null
          construction_type?: string | null
          cost_price?: number | null
          created_at?: string | null
          current_a?: number | null
          datasheet_url?: string | null
          depth_mm?: number | null
          depth_open_door_mm?: number | null
          description?: string | null
          discount_group?: string | null
          discount_group_id?: string | null
          ean_code?: string | null
          energy_class?: string | null
          energy_consumption_kwh?: number | null
          height_mm?: number | null
          id?: string
          image_url?: string | null
          installation_type?: string | null
          is_active?: boolean | null
          kitchen_group?: string | null
          manufacturer_product_id?: string | null
          name?: string
          niche_depth_mm?: number | null
          niche_height_max_mm?: number | null
          niche_height_min_mm?: number | null
          niche_width_max_mm?: number | null
          niche_width_min_mm?: number | null
          noise_class?: string | null
          noise_db?: number | null
          norm_hours?: number | null
          pims_last_synced?: string | null
          pricing_unit?: Database["public"]["Enums"]["pricing_unit"] | null
          product_family?: string | null
          product_series?: string | null
          product_status?: string | null
          retail_price?: number | null
          sku?: string | null
          specifications?: Json | null
          subcategory?: string | null
          supplier_id?: string | null
          type_code?: string | null
          type_name_nl?: string | null
          unit?: string | null
          updated_at?: string | null
          user_override?: Json | null
          vat_rate?: number | null
          voltage_v?: number | null
          water_consumption_l?: number | null
          weight_gross_kg?: number | null
          weight_net_kg?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_discount_group_id_fkey"
            columns: ["discount_group_id"]
            isOneToOne: false
            referencedRelation: "discount_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          division_id: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          division_id?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          division_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          division_id: string | null
          id: string
          name: string | null
          project_number: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          division_id?: string | null
          id?: string
          name?: string | null
          project_number?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          division_id?: string | null
          id?: string
          name?: string | null
          project_number?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          article_code: string | null
          color_override: string | null
          configuration: Json | null
          created_at: string | null
          description: string
          discount_percentage: number | null
          extra_description: string | null
          group_title: string | null
          height_mm: number | null
          id: string
          is_group_header: boolean | null
          line_total: number | null
          parent_line_id: string | null
          price_type: string | null
          product_id: string | null
          quantity: number | null
          quote_id: string | null
          range_override_id: string | null
          section_id: string | null
          sort_order: number | null
          sub_line_number: string | null
          unit: string | null
          unit_price: number
          vat_rate: number | null
          width_mm: number | null
        }
        Insert: {
          article_code?: string | null
          color_override?: string | null
          configuration?: Json | null
          created_at?: string | null
          description: string
          discount_percentage?: number | null
          extra_description?: string | null
          group_title?: string | null
          height_mm?: number | null
          id?: string
          is_group_header?: boolean | null
          line_total?: number | null
          parent_line_id?: string | null
          price_type?: string | null
          product_id?: string | null
          quantity?: number | null
          quote_id?: string | null
          range_override_id?: string | null
          section_id?: string | null
          sort_order?: number | null
          sub_line_number?: string | null
          unit?: string | null
          unit_price: number
          vat_rate?: number | null
          width_mm?: number | null
        }
        Update: {
          article_code?: string | null
          color_override?: string | null
          configuration?: Json | null
          created_at?: string | null
          description?: string
          discount_percentage?: number | null
          extra_description?: string | null
          group_title?: string | null
          height_mm?: number | null
          id?: string
          is_group_header?: boolean | null
          line_total?: number | null
          parent_line_id?: string | null
          price_type?: string | null
          product_id?: string | null
          quantity?: number | null
          quote_id?: string | null
          range_override_id?: string | null
          section_id?: string | null
          sort_order?: number | null
          sub_line_number?: string | null
          unit?: string | null
          unit_price?: number
          vat_rate?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_parent_line_id_fkey"
            columns: ["parent_line_id"]
            isOneToOne: false
            referencedRelation: "quote_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_range_override_id_fkey"
            columns: ["range_override_id"]
            isOneToOne: false
            referencedRelation: "product_ranges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "quote_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_sections: {
        Row: {
          color_id: string | null
          column_height_mm: number | null
          configuration: Json | null
          corpus_color: string | null
          countertop_height_mm: number | null
          countertop_thickness_mm: number | null
          created_at: string | null
          description: string | null
          discount_amount: number | null
          discount_description: string | null
          discount_percentage: number | null
          drawer_color: string | null
          front_color: string | null
          front_number: string | null
          handle_number: string | null
          hinge_color: string | null
          id: string
          model_code: string | null
          model_name: string | null
          plinth_color: string | null
          price_group_id: string | null
          quote_id: string | null
          range_id: string | null
          section_type: string
          sort_order: number | null
          subtotal: number | null
          supplier_id: string | null
          title: string | null
          workbench_color: string | null
          workbench_edge: string | null
          workbench_material: string | null
        }
        Insert: {
          color_id?: string | null
          column_height_mm?: number | null
          configuration?: Json | null
          corpus_color?: string | null
          countertop_height_mm?: number | null
          countertop_thickness_mm?: number | null
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_description?: string | null
          discount_percentage?: number | null
          drawer_color?: string | null
          front_color?: string | null
          front_number?: string | null
          handle_number?: string | null
          hinge_color?: string | null
          id?: string
          model_code?: string | null
          model_name?: string | null
          plinth_color?: string | null
          price_group_id?: string | null
          quote_id?: string | null
          range_id?: string | null
          section_type: string
          sort_order?: number | null
          subtotal?: number | null
          supplier_id?: string | null
          title?: string | null
          workbench_color?: string | null
          workbench_edge?: string | null
          workbench_material?: string | null
        }
        Update: {
          color_id?: string | null
          column_height_mm?: number | null
          configuration?: Json | null
          corpus_color?: string | null
          countertop_height_mm?: number | null
          countertop_thickness_mm?: number | null
          created_at?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_description?: string | null
          discount_percentage?: number | null
          drawer_color?: string | null
          front_color?: string | null
          front_number?: string | null
          handle_number?: string | null
          hinge_color?: string | null
          id?: string
          model_code?: string | null
          model_name?: string | null
          plinth_color?: string | null
          price_group_id?: string | null
          quote_id?: string | null
          range_id?: string | null
          section_type?: string
          sort_order?: number | null
          subtotal?: number | null
          supplier_id?: string | null
          title?: string | null
          workbench_color?: string | null
          workbench_edge?: string | null
          workbench_material?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_sections_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_sections_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_sections_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["price_group_id"]
          },
          {
            foreignKeyName: "quote_sections_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_sections_range_id_fkey"
            columns: ["range_id"]
            isOneToOne: false
            referencedRelation: "product_ranges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_sections_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          category: string | null
          closing_text: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          default_color_id: string | null
          default_corpus_color_id: string | null
          default_price_group_id: string | null
          default_range_id: string | null
          default_supplier_id: string | null
          discount_amount: number | null
          discount_description: string | null
          discount_percentage: number | null
          division_id: string | null
          id: string
          internal_notes: string | null
          introduction_text: string | null
          parent_quote_id: string | null
          payment_condition: string | null
          payment_terms_description: string | null
          project_id: string | null
          quote_date: string | null
          quote_number: number
          reference: string | null
          requires_kooiaap: boolean | null
          requires_transport: boolean | null
          revision_number: number
          salesperson_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"] | null
          subtotal_montage: number | null
          subtotal_products: number | null
          total_excl_vat: number | null
          total_incl_vat: number | null
          total_vat: number | null
          updated_at: string | null
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          category?: string | null
          closing_text?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          default_color_id?: string | null
          default_corpus_color_id?: string | null
          default_price_group_id?: string | null
          default_range_id?: string | null
          default_supplier_id?: string | null
          discount_amount?: number | null
          discount_description?: string | null
          discount_percentage?: number | null
          division_id?: string | null
          id?: string
          internal_notes?: string | null
          introduction_text?: string | null
          parent_quote_id?: string | null
          payment_condition?: string | null
          payment_terms_description?: string | null
          project_id?: string | null
          quote_date?: string | null
          quote_number?: number
          reference?: string | null
          requires_kooiaap?: boolean | null
          requires_transport?: boolean | null
          revision_number?: number
          salesperson_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          subtotal_montage?: number | null
          subtotal_products?: number | null
          total_excl_vat?: number | null
          total_incl_vat?: number | null
          total_vat?: number | null
          updated_at?: string | null
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          category?: string | null
          closing_text?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          default_color_id?: string | null
          default_corpus_color_id?: string | null
          default_price_group_id?: string | null
          default_range_id?: string | null
          default_supplier_id?: string | null
          discount_amount?: number | null
          discount_description?: string | null
          discount_percentage?: number | null
          division_id?: string | null
          id?: string
          internal_notes?: string | null
          introduction_text?: string | null
          parent_quote_id?: string | null
          payment_condition?: string | null
          payment_terms_description?: string | null
          project_id?: string | null
          quote_date?: string | null
          quote_number?: number
          reference?: string | null
          requires_kooiaap?: boolean | null
          requires_transport?: boolean | null
          revision_number?: number
          salesperson_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"] | null
          subtotal_montage?: number | null
          subtotal_products?: number | null
          total_excl_vat?: number | null
          total_incl_vat?: number | null
          total_vat?: number | null
          updated_at?: string | null
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_default_color_id_fkey"
            columns: ["default_color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_default_corpus_color_id_fkey"
            columns: ["default_corpus_color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_default_price_group_id_fkey"
            columns: ["default_price_group_id"]
            isOneToOne: false
            referencedRelation: "price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_default_price_group_id_fkey"
            columns: ["default_price_group_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["price_group_id"]
          },
          {
            foreignKeyName: "quotes_default_range_id_fkey"
            columns: ["default_range_id"]
            isOneToOne: false
            referencedRelation: "product_ranges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_default_supplier_id_fkey"
            columns: ["default_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_parent_quote_id_fkey"
            columns: ["parent_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          referred_customer_id: string | null
          referring_customer_id: string | null
          reward_description: string | null
          reward_type: string | null
          reward_value: number | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          referred_customer_id?: string | null
          referring_customer_id?: string | null
          reward_description?: string | null
          reward_type?: string | null
          reward_value?: number | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          referred_customer_id?: string | null
          referring_customer_id?: string | null
          reward_description?: string | null
          reward_type?: string | null
          reward_value?: number | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referred_customer_id_fkey"
            columns: ["referred_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referring_customer_id_fkey"
            columns: ["referring_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_budgets: {
        Row: {
          bonus_percentage: number | null
          created_at: string | null
          id: string
          remaining_amount: number | null
          total_budget: number
          used_amount: number | null
          year: number
        }
        Insert: {
          bonus_percentage?: number | null
          created_at?: string | null
          id?: string
          remaining_amount?: number | null
          total_budget: number
          used_amount?: number | null
          year: number
        }
        Update: {
          bonus_percentage?: number | null
          created_at?: string | null
          id?: string
          remaining_amount?: number | null
          total_budget?: number
          used_amount?: number | null
          year?: number
        }
        Relationships: []
      }
      service_ticket_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_ticket_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ticket_assignees_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ticket_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ticket_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_ticket_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          note_type: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_type?: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_ticket_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      service_ticket_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status:
            | Database["public"]["Enums"]["service_ticket_status"]
            | null
          id: string
          notes: string | null
          ticket_id: string
          to_status: Database["public"]["Enums"]["service_ticket_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["service_ticket_status"]
            | null
          id?: string
          notes?: string | null
          ticket_id: string
          to_status: Database["public"]["Enums"]["service_ticket_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["service_ticket_status"]
            | null
          id?: string
          notes?: string | null
          ticket_id?: string
          to_status?: Database["public"]["Enums"]["service_ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "service_ticket_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_ticket_status_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "service_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tickets: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          division_id: string | null
          id: string
          order_id: string | null
          planned_date: string | null
          priority: Database["public"]["Enums"]["service_ticket_priority"]
          project_id: string | null
          quote_id: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["service_ticket_status"]
          subject: string
          submitter_email: string
          submitter_name: string
          submitter_phone: string | null
          ticket_number: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          division_id?: string | null
          id?: string
          order_id?: string | null
          planned_date?: string | null
          priority?: Database["public"]["Enums"]["service_ticket_priority"]
          project_id?: string | null
          quote_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["service_ticket_status"]
          subject: string
          submitter_email: string
          submitter_name: string
          submitter_phone?: string | null
          ticket_number?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          division_id?: string | null
          id?: string
          order_id?: string | null
          planned_date?: string | null
          priority?: Database["public"]["Enums"]["service_ticket_priority"]
          project_id?: string | null
          quote_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["service_ticket_status"]
          subject?: string
          submitter_email?: string
          submitter_name?: string
          submitter_phone?: string | null
          ticket_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tickets_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      service_transactions: {
        Row: {
          amount: number
          approved_by: string | null
          budget_id: string | null
          created_at: string | null
          customer_id: string | null
          description: string
          id: string
          order_id: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          budget_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description: string
          id?: string
          order_id?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          budget_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string
          id?: string
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_transactions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "service_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stosa_colors: {
        Row: {
          code: string
          color_type: string
          hex_color: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          code: string
          color_type: string
          hex_color?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          color_type?: string
          hex_color?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      stosa_front_types: {
        Row: {
          code: string
          id: string
          is_active: boolean | null
          model_code: string
          name: string
          price_groups: string[] | null
        }
        Insert: {
          code: string
          id?: string
          is_active?: boolean | null
          model_code: string
          name: string
          price_groups?: string[] | null
        }
        Update: {
          code?: string
          id?: string
          is_active?: boolean | null
          model_code?: string
          name?: string
          price_groups?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "stosa_front_types_model_code_fkey"
            columns: ["model_code"]
            isOneToOne: false
            referencedRelation: "stosa_models"
            referencedColumns: ["code"]
          },
        ]
      }
      stosa_models: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      subcontractor_orders: {
        Row: {
          commission_amount: number | null
          commission_paid_at: string | null
          commission_percentage: number | null
          commission_status: string | null
          cost_amount: number | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          id: string
          notes: string | null
          order_amount: number | null
          order_id: string | null
          status: string | null
          subcontractor_id: string | null
          updated_at: string | null
          work_type: string | null
        }
        Insert: {
          commission_amount?: number | null
          commission_paid_at?: string | null
          commission_percentage?: number | null
          commission_status?: string | null
          cost_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          order_amount?: number | null
          order_id?: string | null
          status?: string | null
          subcontractor_id?: string | null
          updated_at?: string | null
          work_type?: string | null
        }
        Update: {
          commission_amount?: number | null
          commission_paid_at?: string | null
          commission_percentage?: number | null
          commission_status?: string | null
          cost_amount?: number | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          order_amount?: number | null
          order_id?: string | null
          status?: string | null
          subcontractor_id?: string | null
          updated_at?: string | null
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_orders_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          contact_person: string | null
          created_at: string | null
          default_commission_percentage: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          specialty: string | null
        }
        Insert: {
          contact_person?: string | null
          created_at?: string | null
          default_commission_percentage?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          specialty?: string | null
        }
        Update: {
          contact_person?: string | null
          created_at?: string | null
          default_commission_percentage?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          specialty?: string | null
        }
        Relationships: []
      }
      supplier_discounts: {
        Row: {
          created_at: string | null
          description: string | null
          discount_group: string
          discount_percent: number | null
          id: string
          supplier_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_group: string
          discount_percent?: number | null
          id?: string
          supplier_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_group?: string
          discount_percent?: number | null
          id?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_discounts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_order_lines: {
        Row: {
          availability_checked_at: string | null
          availability_qty: number | null
          availability_status: string | null
          created_at: string | null
          ean_code: string | null
          id: string
          lead_time_days: number | null
          order_line_id: string | null
          product_id: string | null
          quantity: number
          status: string | null
          supplier_order_id: string | null
          unit_price: number | null
        }
        Insert: {
          availability_checked_at?: string | null
          availability_qty?: number | null
          availability_status?: string | null
          created_at?: string | null
          ean_code?: string | null
          id?: string
          lead_time_days?: number | null
          order_line_id?: string | null
          product_id?: string | null
          quantity?: number
          status?: string | null
          supplier_order_id?: string | null
          unit_price?: number | null
        }
        Update: {
          availability_checked_at?: string | null
          availability_qty?: number | null
          availability_status?: string | null
          created_at?: string | null
          ean_code?: string | null
          id?: string
          lead_time_days?: number | null
          order_line_id?: string | null
          product_id?: string | null
          quantity?: number
          status?: string | null
          supplier_order_id?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_order_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "installer_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_lines_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_order_lines_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_orders: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          exact_purchase_order_id: string | null
          expected_delivery_date: string | null
          external_order_id: string | null
          id: string
          notes: string | null
          order_id: string | null
          sent_at: string | null
          status: string | null
          supplier_id: string | null
          total_amount: number | null
          updated_at: string | null
          xml_request: string | null
          xml_response: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          exact_purchase_order_id?: string | null
          expected_delivery_date?: string | null
          external_order_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          sent_at?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          xml_request?: string | null
          xml_response?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          exact_purchase_order_id?: string | null
          expected_delivery_date?: string | null
          external_order_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          sent_at?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          xml_request?: string | null
          xml_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          code: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          exact_supplier_id: string | null
          has_price_groups: boolean | null
          id: string
          is_active: boolean | null
          lead_time_weeks: number | null
          name: string
          pims_aliases: string[] | null
          points_to_eur: number | null
          price_factor: number | null
          price_system: string | null
          supplier_type: string | null
          tradeplace_enabled: boolean | null
          tradeplace_endpoint: string | null
          tradeplace_gln: string | null
          tradeplace_tp_id: string | null
        }
        Insert: {
          code: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          exact_supplier_id?: string | null
          has_price_groups?: boolean | null
          id?: string
          is_active?: boolean | null
          lead_time_weeks?: number | null
          name: string
          pims_aliases?: string[] | null
          points_to_eur?: number | null
          price_factor?: number | null
          price_system?: string | null
          supplier_type?: string | null
          tradeplace_enabled?: boolean | null
          tradeplace_endpoint?: string | null
          tradeplace_gln?: string | null
          tradeplace_tp_id?: string | null
        }
        Update: {
          code?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          exact_supplier_id?: string | null
          has_price_groups?: boolean | null
          id?: string
          is_active?: boolean | null
          lead_time_weeks?: number | null
          name?: string
          pims_aliases?: string[] | null
          points_to_eur?: number | null
          price_factor?: number | null
          price_system?: string | null
          supplier_type?: string | null
          tradeplace_enabled?: boolean | null
          tradeplace_endpoint?: string | null
          tradeplace_gln?: string | null
          tradeplace_tp_id?: string | null
        }
        Relationships: []
      }
      tradeplace_settings: {
        Row: {
          created_at: string | null
          id: string
          is_configured: boolean | null
          last_sync_at: string | null
          retailer_gln: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_configured?: boolean | null
          last_sync_at?: string | null
          retailer_gln?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_configured?: boolean | null
          last_sync_at?: string | null
          retailer_gln?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          access_token: string
          display_phone: string | null
          id: string
          phone_number_id: string
          updated_at: string | null
          waba_id: string | null
        }
        Insert: {
          access_token: string
          display_phone?: string | null
          id?: string
          phone_number_id: string
          updated_at?: string | null
          waba_id?: string | null
        }
        Update: {
          access_token?: string
          display_phone?: string | null
          id?: string
          phone_number_id?: string
          updated_at?: string | null
          waba_id?: string | null
        }
        Relationships: []
      }
      work_report_damages: {
        Row: {
          created_at: string
          description: string
          id: string
          measurements: string | null
          order_line_id: string | null
          photo_urls: string[]
          position: string | null
          work_report_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          measurements?: string | null
          order_line_id?: string | null
          photo_urls?: string[]
          position?: string | null
          work_report_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          measurements?: string | null
          order_line_id?: string | null
          photo_urls?: string[]
          position?: string | null
          work_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_report_damages_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "installer_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_report_damages_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_report_damages_work_report_id_fkey"
            columns: ["work_report_id"]
            isOneToOne: false
            referencedRelation: "work_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      work_report_photos: {
        Row: {
          caption: string | null
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          photo_type: Database["public"]["Enums"]["work_report_photo_type"]
          uploaded_by: string | null
          work_report_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          photo_type?: Database["public"]["Enums"]["work_report_photo_type"]
          uploaded_by?: string | null
          work_report_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          photo_type?: Database["public"]["Enums"]["work_report_photo_type"]
          uploaded_by?: string | null
          work_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_report_photos_work_report_id_fkey"
            columns: ["work_report_id"]
            isOneToOne: false
            referencedRelation: "work_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      work_report_tasks: {
        Row: {
          created_at: string
          description: string
          id: string
          is_completed: boolean
          sort_order: number
          work_report_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          work_report_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          work_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_report_tasks_work_report_id_fkey"
            columns: ["work_report_id"]
            isOneToOne: false
            referencedRelation: "work_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      work_reports: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_name_signed: string | null
          customer_signature: string | null
          division_id: string | null
          end_time: string | null
          has_damage: boolean | null
          id: string
          installer_id: string
          internal_notes: string | null
          materials_used: string | null
          order_id: string | null
          report_number: number
          signed_at: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["work_report_status"]
          total_hours: number | null
          updated_at: string
          work_date: string
          work_description: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_name_signed?: string | null
          customer_signature?: string | null
          division_id?: string | null
          end_time?: string | null
          has_damage?: boolean | null
          id?: string
          installer_id: string
          internal_notes?: string | null
          materials_used?: string | null
          order_id?: string | null
          report_number?: number
          signed_at?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["work_report_status"]
          total_hours?: number | null
          updated_at?: string
          work_date?: string
          work_description?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_name_signed?: string | null
          customer_signature?: string | null
          division_id?: string | null
          end_time?: string | null
          has_damage?: boolean | null
          id?: string
          installer_id?: string
          internal_notes?: string | null
          materials_used?: string | null
          order_id?: string | null
          report_number?: number
          signed_at?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["work_report_status"]
          total_hours?: number | null
          updated_at?: string
          work_date?: string
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reports_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      worktop_materials: {
        Row: {
          code: string
          created_at: string | null
          edge_type: string | null
          id: string
          is_active: boolean | null
          material_type: string | null
          name: string
          price_per_meter: number | null
          supplier_id: string | null
          thickness_mm: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          edge_type?: string | null
          id?: string
          is_active?: boolean | null
          material_type?: string | null
          name: string
          price_per_meter?: number | null
          supplier_id?: string | null
          thickness_mm?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          edge_type?: string | null
          id?: string
          is_active?: boolean | null
          material_type?: string | null
          name?: string
          price_per_meter?: number | null
          supplier_id?: string | null
          thickness_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "worktop_materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      worktop_operations: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          price_type: string | null
          supplier_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          price_type?: string | null
          supplier_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          price_type?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worktop_operations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      installer_order_lines: {
        Row: {
          article_code: string | null
          configuration: Json | null
          delivered_at: string | null
          description: string | null
          expected_delivery: string | null
          group_title: string | null
          id: string | null
          is_delivered: boolean | null
          is_group_header: boolean | null
          is_ordered: boolean | null
          order_id: string | null
          ordered_at: string | null
          product_id: string | null
          quantity: number | null
          quote_line_id: string | null
          section_id: string | null
          section_type: string | null
          sort_order: number | null
          supplier_id: string | null
          unit: string | null
        }
        Insert: {
          article_code?: string | null
          configuration?: Json | null
          delivered_at?: string | null
          description?: string | null
          expected_delivery?: string | null
          group_title?: string | null
          id?: string | null
          is_delivered?: boolean | null
          is_group_header?: boolean | null
          is_ordered?: boolean | null
          order_id?: string | null
          ordered_at?: string | null
          product_id?: string | null
          quantity?: number | null
          quote_line_id?: string | null
          section_id?: string | null
          section_type?: string | null
          sort_order?: number | null
          supplier_id?: string | null
          unit?: string | null
        }
        Update: {
          article_code?: string | null
          configuration?: Json | null
          delivered_at?: string | null
          description?: string | null
          expected_delivery?: string | null
          group_title?: string | null
          id?: string | null
          is_delivered?: boolean | null
          is_group_header?: boolean | null
          is_ordered?: boolean | null
          order_id?: string | null
          ordered_at?: string | null
          product_id?: string | null
          quantity?: number | null
          quote_line_id?: string | null
          section_id?: string | null
          section_type?: string | null
          sort_order?: number | null
          supplier_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "installer_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_quote_line_id_fkey"
            columns: ["quote_line_id"]
            isOneToOne: false
            referencedRelation: "quote_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "order_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      installer_orders: {
        Row: {
          actual_delivery_date: string | null
          actual_installation_date: string | null
          assistant_id: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_notes: string | null
          delivery_method: string | null
          delivery_notes: string | null
          division_id: string | null
          expected_delivery_date: string | null
          expected_installation_date: string | null
          id: string | null
          installer_id: string | null
          order_date: string | null
          order_number: number | null
          quote_id: string | null
          requires_elevator: boolean | null
          salesperson_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          actual_installation_date?: string | null
          assistant_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          delivery_method?: string | null
          delivery_notes?: string | null
          division_id?: string | null
          expected_delivery_date?: string | null
          expected_installation_date?: string | null
          id?: string | null
          installer_id?: string | null
          order_date?: string | null
          order_number?: number | null
          quote_id?: string | null
          requires_elevator?: boolean | null
          salesperson_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          actual_installation_date?: string | null
          assistant_id?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          delivery_method?: string | null
          delivery_notes?: string | null
          division_id?: string | null
          expected_delivery_date?: string | null
          expected_installation_date?: string | null
          id?: string | null
          installer_id?: string | null
          order_date?: string | null
          order_number?: number | null
          quote_id?: string | null
          requires_elevator?: boolean | null
          salesperson_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_config_options: {
        Row: {
          kitchen_group: string | null
          max_price: number | null
          min_price: number | null
          pricing_unit: Database["public"]["Enums"]["pricing_unit"] | null
          supplier_id: string | null
          type_code: string | null
          type_name_nl: string | null
          variants: number | null
          width_mm: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products_by_width: {
        Row: {
          kitchen_group: string | null
          max_price: number | null
          min_price: number | null
          product_count: number | null
          supplier_id: string | null
          type_code: string | null
          type_name_nl: string | null
          width_mm: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products_full: {
        Row: {
          article_code: string | null
          base_price: number | null
          book_price: number | null
          catalog_code: string | null
          category_code: string | null
          category_id: string | null
          category_kitchen_group: string | null
          category_name: string | null
          color_basic: string | null
          color_main: string | null
          connection_power_w: number | null
          construction_type: string | null
          cost_price: number | null
          created_at: string | null
          current_a: number | null
          datasheet_url: string | null
          default_discount_percent: number | null
          depth_mm: number | null
          depth_open_door_mm: number | null
          description: string | null
          discount_group: string | null
          discount_group_code: string | null
          discount_group_id: string | null
          discount_group_name: string | null
          ean_code: string | null
          energy_class: string | null
          energy_consumption_kwh: number | null
          height_mm: number | null
          id: string | null
          image_url: string | null
          installation_type: string | null
          is_active: boolean | null
          kitchen_group: string | null
          manufacturer_product_id: string | null
          name: string | null
          niche_depth_mm: number | null
          niche_height_max_mm: number | null
          niche_height_min_mm: number | null
          niche_width_max_mm: number | null
          niche_width_min_mm: number | null
          noise_class: string | null
          noise_db: number | null
          norm_hours: number | null
          pims_last_synced: string | null
          pricing_unit: Database["public"]["Enums"]["pricing_unit"] | null
          product_family: string | null
          product_series: string | null
          product_status: string | null
          retail_price: number | null
          sku: string | null
          specifications: Json | null
          subcategory: string | null
          supplier_id: string | null
          supplier_name: string | null
          type_code: string | null
          type_name_nl: string | null
          unit: string | null
          updated_at: string | null
          user_override: Json | null
          vat_rate: number | null
          voltage_v: number | null
          water_consumption_l: number | null
          weight_gross_kg: number | null
          weight_net_kg: number | null
          width_mm: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_discount_group_id_fkey"
            columns: ["discount_group_id"]
            isOneToOne: false
            referencedRelation: "discount_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products_with_price_groups: {
        Row: {
          article_code: string | null
          id: string | null
          is_glass: boolean | null
          name: string | null
          price: number | null
          price_group_code: string | null
          price_group_id: string | null
          price_group_name: string | null
          supplier_id: string | null
          supplier_name: string | null
          valid_from: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_price_group_colors: {
        Row: {
          collection: string | null
          color_code: string | null
          color_name: string | null
          color_type: string | null
          finish: string | null
          hex_color: string | null
          id: string | null
          material_type: string | null
          price_group_code: string | null
          price_group_id: string | null
          price_group_name: string | null
          sort_order: number | null
          supplier_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_group_colors_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_group_colors_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["price_group_id"]
          },
          {
            foreignKeyName: "price_groups_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_product_prices_full: {
        Row: {
          article_code: string | null
          collection: string | null
          depth_mm: number | null
          discount_group: string | null
          height_mm: number | null
          material_type: string | null
          points_to_eur: number | null
          price: number | null
          price_factor: number | null
          price_group_code: string | null
          price_group_id: string | null
          price_group_name: string | null
          price_id: string | null
          price_system: string | null
          product_id: string | null
          product_name: string | null
          range_id: string | null
          supplier_code: string | null
          supplier_name: string | null
          valid_from: string | null
          valid_until: string | null
          variant_2_code: string | null
          variant_2_name: string | null
          width_mm: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_price_group_id_fkey"
            columns: ["price_group_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["price_group_id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_price_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_range_id_fkey"
            columns: ["range_id"]
            isOneToOne: false
            referencedRelation: "product_ranges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bulk_adjust_price: {
        Args: { p_factor: number; p_ids: string[] }
        Returns: undefined
      }
      calc_selling_price: {
        Args: { p_catalog_price: number; p_supplier_id: string }
        Returns: number
      }
      calculate_product_price: {
        Args: {
          _area_m2?: number
          _length_mm?: number
          _price_group_id: string
          _product_id: string
          _quantity: number
        }
        Returns: number
      }
      generate_quote_reference: {
        Args: { p_category?: string; p_customer_name: string }
        Returns: string
      }
      get_matching_products_by_width: {
        Args: {
          _kitchen_groups?: string[]
          _supplier_id: string
          _width_mm: number
        }
        Returns: {
          article_code: string
          kitchen_group: string
          max_price: number
          min_price: number
          name: string
          pricing_unit: Database["public"]["Enums"]["pricing_unit"]
          product_id: string
          type_code: string
          type_name_nl: string
        }[]
      }
      get_product_price: {
        Args: { p_price_group_id: string; p_product_id: string }
        Returns: number
      }
      get_product_price_by_code: {
        Args: {
          p_article_code: string
          p_price_group_code: string
          p_supplier_id: string
        }
        Returns: number
      }
      get_products_by_price_group: {
        Args: { p_price_group_id: string }
        Returns: string[]
      }
      get_related_products: {
        Args: { _product_id: string }
        Returns: {
          article_code: string
          kitchen_group: string
          name: string
          product_id: string
          relation_type: string
          type_code: string
          type_name_nl: string
        }[]
      }
      get_user_division_id: { Args: { _user_id: string }; Returns: string }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "verkoper"
        | "assistent"
        | "monteur"
        | "werkvoorbereiding"
        | "administratie"
      communication_direction: "inbound" | "outbound"
      communication_type: "email" | "whatsapp" | "note"
      customer_type: "particulier" | "zakelijk"
      order_status:
        | "nieuw"
        | "bestel_klaar"
        | "controle"
        | "besteld"
        | "in_productie"
        | "levering_gepland"
        | "geleverd"
        | "montage_gepland"
        | "gemonteerd"
        | "nazorg"
        | "afgerond"
      payment_status: "open" | "deels_betaald" | "betaald"
      pricing_unit: "STUK" | "ML" | "M2" | "SET"
      quote_status:
        | "concept"
        | "verstuurd"
        | "bekeken"
        | "vervallen"
        | "geaccepteerd"
        | "afgewezen"
      service_ticket_priority: "laag" | "normaal" | "hoog" | "urgent"
      service_ticket_status:
        | "nieuw"
        | "in_behandeling"
        | "wacht_op_klant"
        | "wacht_op_onderdelen"
        | "klaar_voor_planning"
        | "ingepland"
        | "afgerond"
        | "geannuleerd"
      work_report_photo_type: "voor" | "tijdens" | "na" | "schade"
      work_report_status: "concept" | "ingediend" | "goedgekeurd"
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
      app_role: [
        "admin",
        "manager",
        "verkoper",
        "assistent",
        "monteur",
        "werkvoorbereiding",
        "administratie",
      ],
      communication_direction: ["inbound", "outbound"],
      communication_type: ["email", "whatsapp", "note"],
      customer_type: ["particulier", "zakelijk"],
      order_status: [
        "nieuw",
        "bestel_klaar",
        "controle",
        "besteld",
        "in_productie",
        "levering_gepland",
        "geleverd",
        "montage_gepland",
        "gemonteerd",
        "nazorg",
        "afgerond",
      ],
      payment_status: ["open", "deels_betaald", "betaald"],
      pricing_unit: ["STUK", "ML", "M2", "SET"],
      quote_status: [
        "concept",
        "verstuurd",
        "bekeken",
        "vervallen",
        "geaccepteerd",
        "afgewezen",
      ],
      service_ticket_priority: ["laag", "normaal", "hoog", "urgent"],
      service_ticket_status: [
        "nieuw",
        "in_behandeling",
        "wacht_op_klant",
        "wacht_op_onderdelen",
        "klaar_voor_planning",
        "ingepland",
        "afgerond",
        "geannuleerd",
      ],
      work_report_photo_type: ["voor", "tijdens", "na", "schade"],
      work_report_status: ["concept", "ingediend", "goedgekeurd"],
    },
  },
} as const
