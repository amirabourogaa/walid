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
      applications: {
        Row: {
          application_number: string
          assigned_employee: string | null
          client_id: string | null
          client_name: string
          created_at: string | null
          created_by: string | null
          deadline: string | null
          documents_required: number | null
          documents_submitted: number | null
          embassy: string
          expected_date: string | null
          id: string
          progress: number | null
          status: string
          submitted_date: string
          timeline: Json | null
          updated_at: string | null
          visa_type: string
        }
        Insert: {
          application_number: string
          assigned_employee?: string | null
          client_id?: string | null
          client_name: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          documents_required?: number | null
          documents_submitted?: number | null
          embassy: string
          expected_date?: string | null
          id?: string
          progress?: number | null
          status?: string
          submitted_date: string
          timeline?: Json | null
          updated_at?: string | null
          visa_type: string
        }
        Update: {
          application_number?: string
          assigned_employee?: string | null
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          documents_required?: number | null
          documents_submitted?: number | null
          embassy?: string
          expected_date?: string | null
          id?: string
          progress?: number | null
          status?: string
          submitted_date?: string
          timeline?: Json | null
          updated_at?: string | null
          visa_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          id: string
          reminder_date: string
          reminder_type: string
          sent: boolean | null
          sent_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          reminder_date: string
          reminder_type: string
          sent?: boolean | null
          sent_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          reminder_date?: string
          reminder_type?: string
          sent?: boolean | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string
          client_id: string | null
          client_name: string
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          location: string
          notes: string | null
          status: string
          time: string
          updated_at: string | null
        }
        Insert: {
          appointment_type: string
          client_id?: string | null
          client_name: string
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          location: string
          notes?: string | null
          status?: string
          time: string
          updated_at?: string | null
        }
        Update: {
          appointment_type?: string
          client_id?: string | null
          client_name?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          location?: string
          notes?: string | null
          status?: string
          time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      caisses: {
        Row: {
          created_at: string
          emplacement: string | null
          id: string
          montants: Json
          nom: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          emplacement?: string | null
          id?: string
          montants?: Json
          nom: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          emplacement?: string | null
          id?: string
          montants?: Json
          nom?: string
          updated_at?: string
        }
        Relationships: []
      }
      caisses_archive: {
        Row: {
          archive_month: number
          archive_year: number
          archived_at: string
          created_at: string
          emplacement: string | null
          financial_summary: Json
          id: string
          montants: Json
          nom: string
          original_caisse_id: string
        }
        Insert: {
          archive_month: number
          archive_year: number
          archived_at?: string
          created_at: string
          emplacement?: string | null
          financial_summary?: Json
          id?: string
          montants?: Json
          nom: string
          original_caisse_id: string
        }
        Update: {
          archive_month?: number
          archive_year?: number
          archived_at?: string
          created_at?: string
          emplacement?: string | null
          financial_summary?: Json
          id?: string
          montants?: Json
          nom?: string
          original_caisse_id?: string
        }
        Relationships: []
      }
      caisses_daily_history: {
        Row: {
          caisse_id: string
          created_at: string
          history_date: string
          id: string
          montants_debut_journee: Json
          montants_fin_journee: Json
          transactions_summary: Json
        }
        Insert: {
          caisse_id: string
          created_at?: string
          history_date: string
          id?: string
          montants_debut_journee?: Json
          montants_fin_journee?: Json
          transactions_summary?: Json
        }
        Update: {
          caisse_id?: string
          created_at?: string
          history_date?: string
          id?: string
          montants_debut_journee?: Json
          montants_fin_journee?: Json
          transactions_summary?: Json
        }
        Relationships: []
      }
      client_activity_log: {
        Row: {
          action_description: string
          action_type: string
          client_id: string
          created_at: string
          field_changed: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action_description: string
          action_type: string
          client_id: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action_description?: string
          action_type?: string
          client_id?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          created_at: string
          deadline: string | null
          employee_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          created_at?: string
          deadline?: string | null
          employee_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          created_at?: string
          deadline?: string | null
          employee_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      client_data_access_log: {
        Row: {
          accessed_fields: string[] | null
          action: string
          client_id: string
          id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          accessed_fields?: string[] | null
          action: string
          client_id: string
          id?: string
          timestamp?: string
          user_id: string
        }
        Update: {
          accessed_fields?: string[] | null
          action?: string
          client_id?: string
          id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      client_folders: {
        Row: {
          archived_at: string | null
          client_id: string
          completion_date: string | null
          created_at: string
          destination_country: string | null
          folder_name: string
          folder_path: string
          full_name: string
          id: string
          is_archived: boolean | null
          passport_number: string | null
          service_type: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          completion_date?: string | null
          created_at?: string
          destination_country?: string | null
          folder_name: string
          folder_path: string
          full_name: string
          id?: string
          is_archived?: boolean | null
          passport_number?: string | null
          service_type?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          completion_date?: string | null
          created_at?: string
          destination_country?: string | null
          folder_name?: string
          folder_path?: string
          full_name?: string
          id?: string
          is_archived?: boolean | null
          passport_number?: string | null
          service_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_folders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          amount: number | null
          assigned_employee: string | null
          assigned_employee_id: string | null
          china_visa_type: string | null
          client_id_number: string | null
          company_name: string | null
          created_at: string | null
          currency: string | null
          destination_country: string | null
          documents_urls: string[] | null
          email: string | null
          embassy_receipt_date: string | null
          entry_status: string | null
          full_name: string
          id: string
          invoice_status: string | null
          nationality: string | null
          notes: string | null
          passport_expiry_date: string | null
          passport_number: string | null
          passport_photo_url: string | null
          passport_status: string | null
          personal_photo_url: string | null
          profession: string | null
          progress: Json | null
          qr_code_data: string | null
          service_type: string | null
          status: Database["public"]["Enums"]["client_status"] | null
          submission_date: string | null
          submitted_by: string | null
          summary: string | null
          tax_id: string | null
          updated_at: string | null
          visa_end_date: string | null
          visa_start_date: string | null
          visa_tracking_status: string | null
          visa_type: string | null
          whatsapp_number: string | null
        }
        Insert: {
          amount?: number | null
          assigned_employee?: string | null
          assigned_employee_id?: string | null
          china_visa_type?: string | null
          client_id_number?: string | null
          company_name?: string | null
          created_at?: string | null
          currency?: string | null
          destination_country?: string | null
          documents_urls?: string[] | null
          email?: string | null
          embassy_receipt_date?: string | null
          entry_status?: string | null
          full_name: string
          id?: string
          invoice_status?: string | null
          nationality?: string | null
          notes?: string | null
          passport_expiry_date?: string | null
          passport_number?: string | null
          passport_photo_url?: string | null
          passport_status?: string | null
          personal_photo_url?: string | null
          profession?: string | null
          progress?: Json | null
          qr_code_data?: string | null
          service_type?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          submission_date?: string | null
          submitted_by?: string | null
          summary?: string | null
          tax_id?: string | null
          updated_at?: string | null
          visa_end_date?: string | null
          visa_start_date?: string | null
          visa_tracking_status?: string | null
          visa_type?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          amount?: number | null
          assigned_employee?: string | null
          assigned_employee_id?: string | null
          china_visa_type?: string | null
          client_id_number?: string | null
          company_name?: string | null
          created_at?: string | null
          currency?: string | null
          destination_country?: string | null
          documents_urls?: string[] | null
          email?: string | null
          embassy_receipt_date?: string | null
          entry_status?: string | null
          full_name?: string
          id?: string
          invoice_status?: string | null
          nationality?: string | null
          notes?: string | null
          passport_expiry_date?: string | null
          passport_number?: string | null
          passport_photo_url?: string | null
          passport_status?: string | null
          personal_photo_url?: string | null
          profession?: string | null
          progress?: Json | null
          qr_code_data?: string | null
          service_type?: string | null
          status?: Database["public"]["Enums"]["client_status"] | null
          submission_date?: string | null
          submitted_by?: string | null
          summary?: string | null
          tax_id?: string | null
          updated_at?: string | null
          visa_end_date?: string | null
          visa_start_date?: string | null
          visa_tracking_status?: string | null
          visa_type?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["user_id"]
          },
        ]
      }
      comptes_bancaires: {
        Row: {
          code_secret: string | null
          created_at: string
          id: string
          montants: Json
          nom_banque: string
          type_compte: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          code_secret?: string | null
          created_at?: string
          id?: string
          montants?: Json
          nom_banque: string
          type_compte?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          code_secret?: string | null
          created_at?: string
          id?: string
          montants?: Json
          nom_banque?: string
          type_compte?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: []
      }
      comptes_bancaires_archive: {
        Row: {
          archive_month: number
          archive_year: number
          archived_at: string
          created_at: string
          financial_summary: Json
          id: string
          montants: Json
          nom_banque: string
          original_compte_id: string
          type_compte: Database["public"]["Enums"]["account_type"]
        }
        Insert: {
          archive_month: number
          archive_year: number
          archived_at?: string
          created_at: string
          financial_summary?: Json
          id?: string
          montants?: Json
          nom_banque: string
          original_compte_id: string
          type_compte: Database["public"]["Enums"]["account_type"]
        }
        Update: {
          archive_month?: number
          archive_year?: number
          archived_at?: string
          created_at?: string
          financial_summary?: Json
          id?: string
          montants?: Json
          nom_banque?: string
          original_compte_id?: string
          type_compte?: Database["public"]["Enums"]["account_type"]
        }
        Relationships: []
      }
      employee_notifications: {
        Row: {
          client_id: string
          created_at: string
          employee_id: string
          id: string
          message: string
          notification_type: string
          read: boolean
          read_at: string | null
          title: string
        }
        Insert: {
          client_id: string
          created_at?: string
          employee_id: string
          id?: string
          message: string
          notification_type: string
          read?: boolean
          read_at?: string | null
          title: string
        }
        Update: {
          client_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          message?: string
          notification_type?: string
          read?: boolean
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          profile_synced: boolean | null
          updated_at: string | null
          user_id: string | null
          workload: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          profile_synced?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          workload?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          profile_synced?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          workload?: number | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_email: string | null
          client_id: string | null
          client_name: string
          client_tax_id: string | null
          client_whatsapp: string | null
          collection_source_id: string | null
          collection_source_type: string | null
          created_at: string | null
          currency: string
          discount_amount: number | null
          due_date: string | null
          flight_arrival_city: string | null
          flight_departure_city: string | null
          flight_departure_date: string | null
          flight_return_date: string | null
          flight_traveler_name: string | null
          hotel_checkin_date: string | null
          hotel_checkout_date: string | null
          hotel_city: string | null
          hotel_guest_name: string | null
          hotel_name: string | null
          hotel_room_type: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          payment_mode: string | null
          retenue_source_amount: number | null
          retenue_source_rate: number | null
          services: Json
          status: string
          subtotal: number
          timbre_fiscal: number | null
          total_amount: number
          tva_amount: number | null
          tva_rate: number | null
          updated_at: string | null
        }
        Insert: {
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_tax_id?: string | null
          client_whatsapp?: string | null
          collection_source_id?: string | null
          collection_source_type?: string | null
          created_at?: string | null
          currency?: string
          discount_amount?: number | null
          due_date?: string | null
          flight_arrival_city?: string | null
          flight_departure_city?: string | null
          flight_departure_date?: string | null
          flight_return_date?: string | null
          flight_traveler_name?: string | null
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          hotel_city?: string | null
          hotel_guest_name?: string | null
          hotel_name?: string | null
          hotel_room_type?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          payment_mode?: string | null
          retenue_source_amount?: number | null
          retenue_source_rate?: number | null
          services?: Json
          status?: string
          subtotal?: number
          timbre_fiscal?: number | null
          total_amount?: number
          tva_amount?: number | null
          tva_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_tax_id?: string | null
          client_whatsapp?: string | null
          collection_source_id?: string | null
          collection_source_type?: string | null
          created_at?: string | null
          currency?: string
          discount_amount?: number | null
          due_date?: string | null
          flight_arrival_city?: string | null
          flight_departure_city?: string | null
          flight_departure_date?: string | null
          flight_return_date?: string | null
          flight_traveler_name?: string | null
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          hotel_city?: string | null
          hotel_guest_name?: string | null
          hotel_name?: string | null
          hotel_room_type?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          payment_mode?: string | null
          retenue_source_amount?: number | null
          retenue_source_rate?: number | null
          services?: Json
          status?: string
          subtotal?: number
          timbre_fiscal?: number | null
          total_amount?: number
          tva_amount?: number | null
          tva_rate?: number | null
          updated_at?: string | null
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
      invoices_archive: {
        Row: {
          archived_at: string
          client_address: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_tax_id: string | null
          client_whatsapp: string | null
          collection_source_id: string | null
          collection_source_type: string | null
          created_at: string | null
          currency: string
          discount_amount: number | null
          due_date: string | null
          fiscal_year: number
          flight_arrival_city: string | null
          flight_departure_city: string | null
          flight_departure_date: string | null
          flight_return_date: string | null
          flight_traveler_name: string | null
          hotel_checkin_date: string | null
          hotel_checkout_date: string | null
          hotel_city: string | null
          hotel_guest_name: string | null
          hotel_name: string | null
          hotel_room_type: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          original_invoice_id: string
          payment_mode: string | null
          retenue_source_amount: number | null
          retenue_source_rate: number | null
          services: Json
          status: string
          subtotal: number
          timbre_fiscal: number | null
          total_amount: number
          tva_amount: number | null
          tva_rate: number | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_tax_id?: string | null
          client_whatsapp?: string | null
          collection_source_id?: string | null
          collection_source_type?: string | null
          created_at?: string | null
          currency?: string
          discount_amount?: number | null
          due_date?: string | null
          fiscal_year: number
          flight_arrival_city?: string | null
          flight_departure_city?: string | null
          flight_departure_date?: string | null
          flight_return_date?: string | null
          flight_traveler_name?: string | null
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          hotel_city?: string | null
          hotel_guest_name?: string | null
          hotel_name?: string | null
          hotel_room_type?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          original_invoice_id: string
          payment_mode?: string | null
          retenue_source_amount?: number | null
          retenue_source_rate?: number | null
          services?: Json
          status?: string
          subtotal?: number
          timbre_fiscal?: number | null
          total_amount?: number
          tva_amount?: number | null
          tva_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_tax_id?: string | null
          client_whatsapp?: string | null
          collection_source_id?: string | null
          collection_source_type?: string | null
          created_at?: string | null
          currency?: string
          discount_amount?: number | null
          due_date?: string | null
          fiscal_year?: number
          flight_arrival_city?: string | null
          flight_departure_city?: string | null
          flight_departure_date?: string | null
          flight_return_date?: string | null
          flight_traveler_name?: string | null
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          hotel_city?: string | null
          hotel_guest_name?: string | null
          hotel_name?: string | null
          hotel_room_type?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          original_invoice_id?: string
          payment_mode?: string | null
          retenue_source_amount?: number | null
          retenue_source_rate?: number | null
          services?: Json
          status?: string
          subtotal?: number
          timbre_fiscal?: number | null
          total_amount?: number
          tva_amount?: number | null
          tva_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices_history: {
        Row: {
          action: string
          created_at: string
          data: Json
          id: string
          invoice_id: string
          modified_at: string
          modified_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          data: Json
          id?: string
          invoice_id: string
          modified_at?: string
          modified_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          data?: Json
          id?: string
          invoice_id?: string
          modified_at?: string
          modified_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          categorie: Database["public"]["Enums"]["transaction_category"]
          created_at: string
          created_by: string | null
          date_transaction: string
          description: string | null
          devise: Database["public"]["Enums"]["currency_type"]
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          mode_paiement: Database["public"]["Enums"]["payment_method"]
          montant: number
          source_id: string | null
          source_type: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          categorie: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          created_by?: string | null
          date_transaction?: string
          description?: string | null
          devise: Database["public"]["Enums"]["currency_type"]
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          mode_paiement: Database["public"]["Enums"]["payment_method"]
          montant: number
          source_id?: string | null
          source_type?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          categorie?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          created_by?: string | null
          date_transaction?: string
          description?: string | null
          devise?: Database["public"]["Enums"]["currency_type"]
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          mode_paiement?: Database["public"]["Enums"]["payment_method"]
          montant?: number
          source_id?: string | null
          source_type?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: []
      }
      transactions_archive: {
        Row: {
          archive_file_path: string | null
          archive_month: number
          archive_year: number
          archived_at: string
          categorie: Database["public"]["Enums"]["transaction_category"]
          created_at: string
          created_by: string | null
          date_transaction: string
          description: string | null
          devise: string
          id: string
          mode_paiement: Database["public"]["Enums"]["payment_method"]
          montant: number
          original_transaction_id: string
          source_id: string | null
          source_type: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          archive_file_path?: string | null
          archive_month: number
          archive_year: number
          archived_at?: string
          categorie: Database["public"]["Enums"]["transaction_category"]
          created_at: string
          created_by?: string | null
          date_transaction: string
          description?: string | null
          devise: string
          id?: string
          mode_paiement: Database["public"]["Enums"]["payment_method"]
          montant: number
          original_transaction_id: string
          source_id?: string | null
          source_type?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Update: {
          archive_file_path?: string | null
          archive_month?: number
          archive_year?: number
          archived_at?: string
          categorie?: Database["public"]["Enums"]["transaction_category"]
          created_at?: string
          created_by?: string | null
          date_transaction?: string
          description?: string | null
          devise?: string
          id?: string
          mode_paiement?: Database["public"]["Enums"]["payment_method"]
          montant?: number
          original_transaction_id?: string
          source_id?: string | null
          source_type?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: []
      }
      transactions_history: {
        Row: {
          action: string
          created_at: string
          data: Json
          id: string
          modified_at: string
          modified_by: string | null
          transaction_id: string
        }
        Insert: {
          action: string
          created_at?: string
          data: Json
          id?: string
          modified_at?: string
          modified_by?: string | null
          transaction_id: string
        }
        Update: {
          action?: string
          created_at?: string
          data?: Json
          id?: string
          modified_at?: string
          modified_by?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_history_modified_by_fkey"
            columns: ["modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      whatsapp_files: {
        Row: {
          assigned_folder: string | null
          client_id: string | null
          created_at: string | null
          file_url: string
          id: string
          mode: string | null
          phone: string | null
          processed: boolean | null
          updated_at: string | null
        }
        Insert: {
          assigned_folder?: string | null
          client_id?: string | null
          created_at?: string | null
          file_url: string
          id?: string
          mode?: string | null
          phone?: string | null
          processed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          assigned_folder?: string | null
          client_id?: string | null
          created_at?: string | null
          file_url?: string
          id?: string
          mode?: string | null
          phone?: string | null
          processed?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_history: {
        Row: {
          client_id: string
          created_at: string
          id: string
          sent_at: string
          user_id: string | null
          visa_status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          sent_at?: string
          user_id?: string | null
          visa_status: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          sent_at?: string
          user_id?: string | null
          visa_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_orphaned_profiles: { Args: never; Returns: undefined }
      create_employee_account: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_password: string
        }
        Returns: string
      }
      get_next_client_id_number: { Args: never; Returns: string }
      get_next_invoice_number: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_manager: { Args: { user_id: string }; Returns: boolean }
      is_employee: { Args: { user_id: string }; Returns: boolean }
      log_client_data_access: {
        Args: {
          p_accessed_fields: string[]
          p_action: string
          p_client_id: string
        }
        Returns: undefined
      }
      normalize_country_name: { Args: { country: string }; Returns: string }
      save_caisse_daily_snapshot: {
        Args: { p_caisse_id: string; p_date?: string }
        Returns: undefined
      }
    }
    Enums: {
      account_type: "courant" | "epargne" | "autre"
      app_role: "admin" | "manager" | "employee" | "client"
      client_status:
        | "جديد"
        | "قيد المعالجة"
        | "اكتملت العملية"
        | "مرفوضة"
        | "اكتملت_العملية"
      currency_type: "TND" | "EUR" | "USD" | "DLY"
      payment_method:
        | "espece"
        | "cheque"
        | "virement"
        | "carte_bancaire"
        | "traite"
      transaction_category:
        | "loyer"
        | "steg"
        | "sonede"
        | "internet"
        | "mobile"
        | "bon_cadeau"
        | "fournisseur"
        | "ambassade"
        | "transport"
        | "salaire"
        | "cnss"
        | "finance"
        | "autre"
        | "avance_salaire"
      transaction_type: "entree" | "sortie"
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
      account_type: ["courant", "epargne", "autre"],
      app_role: ["admin", "manager", "employee", "client"],
      client_status: [
        "جديد",
        "قيد المعالجة",
        "اكتملت العملية",
        "مرفوضة",
        "اكتملت_العملية",
      ],
      currency_type: ["TND", "EUR", "USD", "DLY"],
      payment_method: [
        "espece",
        "cheque",
        "virement",
        "carte_bancaire",
        "traite",
      ],
      transaction_category: [
        "loyer",
        "steg",
        "sonede",
        "internet",
        "mobile",
        "bon_cadeau",
        "fournisseur",
        "ambassade",
        "transport",
        "salaire",
        "cnss",
        "finance",
        "autre",
        "avance_salaire",
      ],
      transaction_type: ["entree", "sortie"],
    },
  },
} as const
