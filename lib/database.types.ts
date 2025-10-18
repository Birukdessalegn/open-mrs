export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'Admin' | 'Doctor' | 'Lab Tech' | 'Pharmacist' | 'Receptionist'
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'Admin' | 'Doctor' | 'Lab Tech' | 'Pharmacist' | 'Receptionist'
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'Admin' | 'Doctor' | 'Lab Tech' | 'Pharmacist' | 'Receptionist'
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          medical_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          gender: 'Male' | 'Female' | 'Other'
          phone: string | null
          email: string | null
          address: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          blood_group: string | null
          allergies: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          medical_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          gender: 'Male' | 'Female' | 'Other'
          phone?: string | null
          email?: string | null
          address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          blood_group?: string | null
          allergies?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          medical_id?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string
          gender?: 'Male' | 'Female' | 'Other'
          phone?: string | null
          email?: string | null
          address?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          blood_group?: string | null
          allergies?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string | null
          appointment_date: string
          status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show'
          reason: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id?: string | null
          appointment_date: string
          status?: 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show'
          reason?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string | null
          appointment_date?: string
          status?: 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show'
          reason?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      visits: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string
          visit_date: string
          chief_complaint: string | null
          vital_signs: Json
          diagnosis: string | null
          treatment_plan: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id: string
          visit_date?: string
          chief_complaint?: string | null
          vital_signs?: Json
          diagnosis?: string | null
          treatment_plan?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string
          visit_date?: string
          chief_complaint?: string | null
          vital_signs?: Json
          diagnosis?: string | null
          treatment_plan?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      prescriptions: {
        Row: {
          id: string
          visit_id: string
          patient_id: string
          medication_name: string
          dosage: string
          frequency: string
          duration: string
          instructions: string | null
          created_at: string
        }
        Insert: {
          id?: string
          visit_id: string
          patient_id: string
          medication_name: string
          dosage: string
          frequency: string
          duration: string
          instructions?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          visit_id?: string
          patient_id?: string
          medication_name?: string
          dosage?: string
          frequency?: string
          duration?: string
          instructions?: string | null
          created_at?: string
        }
      }
      medical_documents: {
        Row: {
          id: string
          patient_id: string
          visit_id: string | null
          document_type: string
          file_url: string
          notes: string | null
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          visit_id?: string | null
          document_type: string
          file_url: string
          notes?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          visit_id?: string | null
          document_type?: string
          file_url?: string
          notes?: string | null
          uploaded_by?: string | null
          created_at?: string
        }
      }
      lab_tests: {
        Row: {
          id: string
          test_name: string
          test_code: string
          description: string | null
          price: number
          normal_range: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          test_name: string
          test_code: string
          description?: string | null
          price?: number
          normal_range?: string | null
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          test_name?: string
          test_code?: string
          description?: string | null
          price?: number
          normal_range?: string | null
          active?: boolean
          created_at?: string
        }
      }
      lab_orders: {
        Row: {
          id: string
          patient_id: string
          visit_id: string | null
          ordered_by: string
          order_date: string
          status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          visit_id?: string | null
          ordered_by: string
          order_date?: string
          status?: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          visit_id?: string | null
          ordered_by?: string
          order_date?: string
          status?: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
          notes?: string | null
          created_at?: string
        }
      }
      lab_order_items: {
        Row: {
          id: string
          lab_order_id: string
          lab_test_id: string
          result: string | null
          result_date: string | null
          performed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lab_order_id: string
          lab_test_id: string
          result?: string | null
          result_date?: string | null
          performed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lab_order_id?: string
          lab_test_id?: string
          result?: string | null
          result_date?: string | null
          performed_by?: string | null
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          service_name: string
          service_code: string
          description: string | null
          price: number
          category: 'Consultation' | 'Procedure' | 'Lab' | 'Medication'
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          service_name: string
          service_code: string
          description?: string | null
          price?: number
          category: 'Consultation' | 'Procedure' | 'Lab' | 'Medication'
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          service_name?: string
          service_code?: string
          description?: string | null
          price?: number
          category?: 'Consultation' | 'Procedure' | 'Lab' | 'Medication'
          active?: boolean
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          patient_id: string
          visit_id: string | null
          invoice_date: string
          due_date: string | null
          subtotal: number
          tax: number
          discount: number
          total_amount: number
          amount_paid: number
          status: 'Pending' | 'Paid' | 'Partially Paid' | 'Cancelled'
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          invoice_number: string
          patient_id: string
          visit_id?: string | null
          invoice_date?: string
          due_date?: string | null
          subtotal?: number
          tax?: number
          discount?: number
          total_amount?: number
          amount_paid?: number
          status?: 'Pending' | 'Paid' | 'Partially Paid' | 'Cancelled'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          invoice_number?: string
          patient_id?: string
          visit_id?: string | null
          invoice_date?: string
          due_date?: string | null
          subtotal?: number
          tax?: number
          discount?: number
          total_amount?: number
          amount_paid?: number
          status?: 'Pending' | 'Paid' | 'Partially Paid' | 'Cancelled'
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          service_id: string | null
          description: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          service_id?: string | null
          description: string
          quantity?: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          service_id?: string | null
          description?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          payment_date: string
          amount: number
          payment_method: 'Cash' | 'Card' | 'Insurance' | 'Mobile Money'
          reference_number: string | null
          received_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          payment_date?: string
          amount: number
          payment_method: 'Cash' | 'Card' | 'Insurance' | 'Mobile Money'
          reference_number?: string | null
          received_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          payment_date?: string
          amount?: number
          payment_method?: 'Cash' | 'Card' | 'Insurance' | 'Mobile Money'
          reference_number?: string | null
          received_by?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      medications: {
        Row: {
          id: string
          medication_name: string
          generic_name: string | null
          brand_name: string | null
          category: string | null
          unit: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Cream' | 'Drop' | 'Inhaler'
          description: string | null
          reorder_level: number
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          medication_name: string
          generic_name?: string | null
          brand_name?: string | null
          category?: string | null
          unit: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Cream' | 'Drop' | 'Inhaler'
          description?: string | null
          reorder_level?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          medication_name?: string
          generic_name?: string | null
          brand_name?: string | null
          category?: string | null
          unit?: 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Cream' | 'Drop' | 'Inhaler'
          description?: string | null
          reorder_level?: number
          active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      medication_stock: {
        Row: {
          id: string
          medication_id: string
          batch_number: string
          quantity: number
          unit_price: number
          selling_price: number
          expiry_date: string
          supplier: string | null
          received_date: string
          received_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          medication_id: string
          batch_number: string
          quantity?: number
          unit_price: number
          selling_price: number
          expiry_date: string
          supplier?: string | null
          received_date?: string
          received_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          medication_id?: string
          batch_number?: string
          quantity?: number
          unit_price?: number
          selling_price?: number
          expiry_date?: string
          supplier?: string | null
          received_date?: string
          received_by?: string | null
          created_at?: string
        }
      }
      stock_transactions: {
        Row: {
          id: string
          medication_id: string
          stock_id: string | null
          transaction_type: 'Purchase' | 'Sale' | 'Adjustment' | 'Expired'
          quantity: number
          transaction_date: string
          reference_id: string | null
          notes: string | null
          performed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          medication_id: string
          stock_id?: string | null
          transaction_type: 'Purchase' | 'Sale' | 'Adjustment' | 'Expired'
          quantity: number
          transaction_date?: string
          reference_id?: string | null
          notes?: string | null
          performed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          medication_id?: string
          stock_id?: string | null
          transaction_type?: 'Purchase' | 'Sale' | 'Adjustment' | 'Expired'
          quantity?: number
          transaction_date?: string
          reference_id?: string | null
          notes?: string | null
          performed_by?: string | null
          created_at?: string
        }
      }
    }
  }
}
