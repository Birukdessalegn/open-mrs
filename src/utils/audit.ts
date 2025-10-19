/**
 * Audit trail utilities for tracking data changes
 * Implements healthcare compliance requirements for data tracking
 */

import { supabase } from '@/lib/supabase';
import { AuditLog } from '../types';

export class AuditService {
  /**
   * Log a data change operation
   */
  static async logChange(
    tableName: string,
    recordId: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    oldValues: Record<string, any> = {},
    newValues: Record<string, any> = {},
    userId: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    try {
      const auditLog: Omit<AuditLog, 'id' | 'timestamp'> = {
        table_name: tableName,
        record_id: recordId,
        action,
        old_values: oldValues,
        new_values: newValues,
        user_id: userId,
        ip_address: metadata?.ipAddress,
        user_agent: metadata?.userAgent,
      };

      await supabase.from('audit_logs').insert(auditLog);
    } catch (error) {
      console.error('Failed to log audit trail:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Get audit trail for a specific record
   */
  static async getRecordAuditTrail(
    tableName: string,
    recordId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles(full_name, role)
        `)
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      return [];
    }
  }

  /**
   * Get audit trail for a user
   */
  static async getUserAuditTrail(
    userId: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get user audit trail:', error);
      return [];
    }
  }

  /**
   * Get audit trail for a specific table
   */
  static async getTableAuditTrail(
    tableName: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles(full_name, role)
        `)
        .eq('table_name', tableName)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get table audit trail:', error);
      return [];
    }
  }

  /**
   * Get audit trail within a date range
   */
  static async getAuditTrailByDateRange(
    startDate: string,
    endDate: string,
    tableName?: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles(full_name, role)
        `)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (tableName) {
        query = query.eq('table_name', tableName);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get audit trail by date range:', error);
      return [];
    }
  }

  /**
   * Create audit log table if it doesn't exist
   */
  static async createAuditLogTable(): Promise<void> {
    try {
      const { error } = await supabase.rpc('create_audit_log_table');
      if (error) throw error;
    } catch (error) {
      console.error('Failed to create audit log table:', error);
    }
  }

  /**
   * Get sensitive data access logs
   */
  static async getSensitiveDataAccess(
    userId?: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      const sensitiveTables = ['patients', 'visits', 'prescriptions', 'medical_documents'];
      
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles(full_name, role)
        `)
        .in('table_name', sensitiveTables)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get sensitive data access logs:', error);
      return [];
    }
  }

  /**
   * Generate audit report
   */
  static async generateAuditReport(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<{
    totalChanges: number;
    changesByTable: Record<string, number>;
    changesByUser: Record<string, number>;
    changesByAction: Record<string, number>;
  }> {
    try {
      const auditLogs = await this.getAuditTrailByDateRange(startDate, endDate, undefined, 1000);
      
      const report = {
        totalChanges: auditLogs.length,
        changesByTable: {} as Record<string, number>,
        changesByUser: {} as Record<string, number>,
        changesByAction: {} as Record<string, number>,
      };

      auditLogs.forEach(log => {
        // Filter by user if specified
        if (userId && log.user_id !== userId) return;

        // Count by table
        report.changesByTable[log.table_name] = (report.changesByTable[log.table_name] || 0) + 1;
        
        // Count by user
        report.changesByUser[log.user_id] = (report.changesByUser[log.user_id] || 0) + 1;
        
        // Count by action
        report.changesByAction[log.action] = (report.changesByAction[log.action] || 0) + 1;
      });

      return report;
    } catch (error) {
      console.error('Failed to generate audit report:', error);
      return {
        totalChanges: 0,
        changesByTable: {},
        changesByUser: {},
        changesByAction: {},
      };
    }
  }
}

/**
 * Higher-order function to wrap API calls with audit logging
 */
export function withAuditLogging<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  tableName: string,
  getRecordId: (...args: T) => string,
  getAction: (...args: T) => 'INSERT' | 'UPDATE' | 'DELETE',
  getOldValues?: (...args: T) => Record<string, any>,
  getNewValues?: (...args: T) => Record<string, any>
) {
  return async (...args: T): Promise<R> => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const recordId = getRecordId(...args);
    const action = getAction(...args);
    const oldValues = getOldValues?.(...args) || {};
    const newValues = getNewValues?.(...args) || {};

    try {
      const result = await fn(...args);
      
      // Log the operation
      await AuditService.logChange(
        tableName,
        recordId,
        action,
        oldValues,
        newValues,
        userId
      );

      return result;
    } catch (error) {
      // Log failed operations too
      await AuditService.logChange(
        tableName,
        recordId,
        action,
        oldValues,
        { error: error instanceof Error ? error.message : 'Unknown error' },
        userId
      );
      throw error;
    }
  };
}
