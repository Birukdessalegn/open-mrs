/**
 * Centralized API service layer
 * Handles all API communications with proper error handling and type safety
 */

import { supabase } from '@/lib/supabase';
import { ApiResponse, PaginatedResponse, SearchFilters } from '../types';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiService {
  /**
   * Generic method to handle Supabase responses
   */
  private static handleResponse<T>(response: { data: T | null; error: any }): ApiResponse<T> {
    if (response.error) {
      const errorStatus = typeof response.error?.status === 'number' ? response.error.status : 500;
      throw new ApiError(
        response.error?.message || 'An error occurred',
        errorStatus,
        response.error?.code
      );
    }
    return {
      data: response.data as T,
      error: null,
      success: true,
    };
  }

  /**
   * Generic method for paginated queries
   */
  static async paginatedQuery<T>(
    table: string,
    filters: SearchFilters = {},
    select: string = '*'
  ): Promise<PaginatedResponse<T>> {
    const { page = 1, limit = 10, query, dateFrom, dateTo, status, ...otherFilters } = filters;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase.from(table).select(select, { count: 'exact' });

    // Apply filters
    if (query) {
      // This is a simplified search - in production, you'd want more sophisticated search
      queryBuilder = queryBuilder.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`);
    }

    if (dateFrom) {
      queryBuilder = queryBuilder.gte('created_at', dateFrom);
    }

    if (dateTo) {
      queryBuilder = queryBuilder.lte('created_at', dateTo);
    }

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    // Apply other filters
    Object.entries(otherFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryBuilder = queryBuilder.eq(key, value);
      }
    });

    const { data, error, count } = await queryBuilder
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      const errorStatus = typeof (error as any)?.status === 'number' ? (error as any).status : 500;
      throw new ApiError(error.message, errorStatus, error.code);
    }

    return {
      data: (data || []) as T[],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    };
  }

  /**
   * Generic method for single record operations
   */
  static async getById<T>(table: string, id: string, select: string = '*'): Promise<ApiResponse<T>> {
    const response = await supabase.from(table).select(select).eq('id', id).single();
    return this.handleResponse<T>(response as { data: T | null; error: any });
  }

  static async create<T>(table: string, data: Partial<T>): Promise<ApiResponse<T>> {
    const response = await supabase.from(table).insert(data as any).select().single();
    return this.handleResponse<T>(response as { data: T | null; error: any });
  }

  static async update<T>(table: string, id: string, data: Partial<T>): Promise<ApiResponse<T>> {
    const response = await supabase.from(table).update(data as any).eq('id', id).select().single();
    return this.handleResponse<T>(response as { data: T | null; error: any });
  }

  static async delete(table: string, id: string): Promise<ApiResponse<null>> {
    const response = await supabase.from(table).delete().eq('id', id);
    return this.handleResponse<null>(response as { data: null; error: any });
  }

  /**
   * Batch operations
   */
  static async batchCreate<T>(table: string, data: Partial<T>[]): Promise<ApiResponse<T[]>> {
    const response = await supabase.from(table).insert(data as any).select();
    return this.handleResponse<T[]>(response as { data: T[] | null; error: any });
  }

  static async batchUpdate<T>(
    table: string,
    updates: { id: string; data: Partial<T> }[]
  ): Promise<ApiResponse<T[]>> {
    const promises = updates.map(({ id, data }) =>
      supabase.from(table).update(data as any).eq('id', id).select().single()
    );
    
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) {
      const firstError = errors[0]?.error;
      throw new ApiError(`Batch update failed: ${firstError?.message || 'Unknown error'}`);
    }

    return {
      data: results.map(r => r.data).filter(Boolean) as T[],
      error: null,
      success: true,
    };
  }
}

/**
 * Specialized API services for different modules
 */
export class PatientService {
  static async getPatients(filters: SearchFilters = {}) {
    return ApiService.paginatedQuery('patients', filters, `
      *,
      appointments(id, appointment_date, status),
      visits(id, visit_date, chief_complaint)
    `);
  }

  static async getPatientById(id: string) {
    return ApiService.getById('patients', id, `
      *,
      appointments(id, appointment_date, status, reason),
      visits(id, visit_date, chief_complaint, diagnosis),
      medical_documents(id, document_type, file_url, created_at)
    `);
  }

  static async createPatient(data: any) {
    return ApiService.create('patients', data);
  }

  static async updatePatient(id: string, data: any) {
    return ApiService.update('patients', id, data);
  }

  static async deletePatient(id: string) {
    return ApiService.delete('patients', id);
  }
}

export class AppointmentService {
  static async getAppointments(filters: SearchFilters = {}) {
    return ApiService.paginatedQuery('appointments', filters, `
      *,
      patients(first_name, last_name, medical_id),
      profiles(full_name)
    `);
  }

  static async getAppointmentById(id: string) {
    return ApiService.getById('appointments', id, `
      *,
      patients(first_name, last_name, medical_id, phone),
      profiles(full_name, phone)
    `);
  }

  static async createAppointment(data: any) {
    return ApiService.create('appointments', data);
  }

  static async updateAppointmentStatus(id: string, status: string) {
    return ApiService.update('appointments', id, { status });
  }
}

export class VisitService {
  static async getVisits(filters: SearchFilters = {}) {
    return ApiService.paginatedQuery('visits', filters, `
      *,
      patients(first_name, last_name, medical_id),
      profiles(full_name),
      prescriptions(id, medication_name, dosage, frequency)
    `);
  }

  static async getVisitById(id: string) {
    return ApiService.getById('visits', id, `
      *,
      patients(first_name, last_name, medical_id),
      profiles(full_name),
      prescriptions(id, medication_name, dosage, frequency, instructions),
      lab_orders(id, status, order_date)
    `);
  }

  static async createVisit(data: any) {
    return ApiService.create('visits', data);
  }

  static async updateVisit(id: string, data: any) {
    return ApiService.update('visits', id, data);
  }
}

export class LabService {
  static async getLabOrders(filters: SearchFilters = {}) {
    return ApiService.paginatedQuery('lab_orders', filters, `
      *,
      patients(first_name, last_name, medical_id),
      profiles(full_name),
      lab_order_items(id, lab_test_id, result, result_date, lab_tests(test_name, test_code))
    `);
  }

  static async getLabTests() {
    const response = await supabase.from('lab_tests').select('*').eq('active', true);
    return ApiService.getById<any>('lab_tests', 'active');
  }

  static async createLabOrder(data: any) {
    return ApiService.create('lab_orders', data);
  }

  static async updateLabOrderStatus(id: string, status: string) {
    return ApiService.update('lab_orders', id, { status });
  }

  static async updateLabResult(orderItemId: string, result: string, performedBy: string) {
    return ApiService.update('lab_order_items', orderItemId, {
      result,
      result_date: new Date().toISOString(),
      performed_by: performedBy,
    });
  }
}

export class BillingService {
  static async getInvoices(filters: SearchFilters = {}) {
    return ApiService.paginatedQuery('invoices', filters, `
      *,
      patients(first_name, last_name, medical_id),
      invoice_items(id, description, quantity, unit_price, total_price)
    `);
  }

  static async getInvoiceById(id: string) {
    return ApiService.getById('invoices', id, `
      *,
      patients(first_name, last_name, medical_id, phone, address),
      invoice_items(id, description, quantity, unit_price, total_price),
      payments(id, amount, payment_method, payment_date)
    `);
  }

  static async createInvoice(data: any) {
    return ApiService.create('invoices', data);
  }

  static async recordPayment(invoiceId: string, paymentData: any) {
    return ApiService.create('payments', { invoice_id: invoiceId, ...paymentData });
  }
}

export class PharmacyService {
  static async getMedications(filters: SearchFilters = {}) {
    return ApiService.paginatedQuery('medications', filters);
  }

  static async getMedicationStock(medicationId: string) {
    const response = await supabase
      .from('medication_stock')
      .select('*')
      .eq('medication_id', medicationId)
      .order('expiry_date', { ascending: true });
    return ApiService.create<any>('medication_stock', { medication_id: medicationId });
  }

  static async getLowStockMedications() {
    const response = await supabase
      .from('medications')
      .select(`
        *,
        medication_stock(quantity, reorder_level)
      `)
      .eq('active', true);
    return ApiService.create<any>('medications', { active: true });
  }

  static async createMedication(data: any) {
    return ApiService.create('medications', data);
  }

  static async updateStock(medicationId: string, stockData: any) {
    return ApiService.create('medication_stock', { medication_id: medicationId, ...stockData });
  }
}
