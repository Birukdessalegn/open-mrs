/**
 * Core type definitions for OpenMRS Pro
 * Centralized type definitions for better maintainability
 */

export type UserRole = 'Admin' | 'Doctor' | 'Lab Tech' | 'Pharmacist' | 'Receptionist';

export type Gender = 'Male' | 'Female' | 'Other';

export type AppointmentStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';

export type LabOrderStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export type InvoiceStatus = 'Pending' | 'Paid' | 'Partially Paid' | 'Cancelled';

export type PaymentMethod = 'Cash' | 'Card' | 'Insurance' | 'Mobile Money';

export type MedicationUnit = 'Tablet' | 'Capsule' | 'Syrup' | 'Injection' | 'Cream' | 'Drop' | 'Inhaler';

export type ServiceCategory = 'Consultation' | 'Procedure' | 'Lab' | 'Medication';

export type StockTransactionType = 'Purchase' | 'Sale' | 'Adjustment' | 'Expired';

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
}

// Audit trail types
export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  user_id: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

// Dashboard types
export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  pendingLabOrders: number;
  monthlyRevenue: number;
  activeVisits: number;
  lowStockMedications: number;
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  role?: UserRole;
  page?: number;
  limit?: number;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  user_id: string;
}

// Export all database types
export * from '../../lib/database.types';