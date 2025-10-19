/**
 * Application configuration
 * Centralized configuration management for the OpenMRS Pro application
 */

export const appConfig = {
  // Application metadata
  name: process.env.NEXT_PUBLIC_APP_NAME || 'OpenMRS Pro',
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  description: 'Professional Healthcare Management System',
  
  // Clinic information
  clinic: {
    name: process.env.NEXT_PUBLIC_CLINIC_NAME || 'Your Clinic Name',
    address: process.env.NEXT_PUBLIC_CLINIC_ADDRESS || 'Your Clinic Address',
    phone: process.env.NEXT_PUBLIC_CLINIC_PHONE || '',
    email: process.env.NEXT_PUBLIC_CLINIC_EMAIL || '',
  },
  
  // API configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
  },
  
  // Pagination defaults
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultPage: 1,
  },
  
  // User roles and permissions
  roles: {
    admin: 'Admin',
    doctor: 'Doctor',
    labTech: 'Lab Tech',
    pharmacist: 'Pharmacist',
    receptionist: 'Receptionist',
  },
  
  // Role hierarchy (higher number = more permissions)
  roleHierarchy: {
    'Admin': 5,
    'Doctor': 4,
    'Lab Tech': 3,
    'Pharmacist': 3,
    'Receptionist': 2,
  },
  
  // File upload configuration
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    storageBucket: process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'medical-documents',
  },
  
  // Date and time configuration
  dateTime: {
    defaultDateFormat: 'MMM dd, yyyy',
    defaultTimeFormat: 'HH:mm',
    defaultDateTimeFormat: 'MMM dd, yyyy - HH:mm',
    timezone: 'UTC',
  },
  
  // Validation rules
  validation: {
    medicalId: {
      minLength: 3,
      maxLength: 20,
      pattern: /^[A-Z0-9]+$/,
    },
    phoneNumber: {
      pattern: /^[\+]?[1-9][\d]{0,15}$/,
    },
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
  },
  
  // Business rules
  business: {
    // Appointment rules
    appointment: {
      defaultDuration: 30, // minutes
      maxDuration: 120, // minutes
      minAdvanceBooking: 1, // hours
      maxAdvanceBooking: 90, // days
      maxAppointmentsPerDay: 50,
    },
    
    // Lab rules
    lab: {
      maxTestsPerOrder: 20,
      defaultResultValidity: 30, // days
    },
    
    // Pharmacy rules
    pharmacy: {
      lowStockThreshold: 10,
      expiryWarningDays: 30,
      maxPrescriptionDuration: 90, // days
    },
    
    // Billing rules
    billing: {
      defaultTaxRate: 0.0,
      currency: 'USD',
      paymentTerms: 30, // days
      lateFeeRate: 0.02, // 2% per month
    },
  },
  
  // UI configuration
  ui: {
    theme: {
      default: 'light',
      primaryColor: '#2563eb',
      secondaryColor: '#64748b',
    },
    sidebar: {
      width: 256,
      collapsedWidth: 64,
    },
    table: {
      defaultPageSize: 10,
      pageSizeOptions: [10, 25, 50, 100],
    },
  },
  
  // Feature flags
  features: {
    enableAuditLogs: true,
    enableNotifications: true,
    enableRealTimeUpdates: true,
    enableAdvancedSearch: true,
    enableDataExport: true,
    enableBackup: true,
    enableMultiTenancy: false,
    enableApiDocumentation: true,
  },
  
  // Security configuration
  security: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    requireEmailVerification: false,
    requireStrongPasswords: true,
  },
  
  // Monitoring and logging
  monitoring: {
    enableErrorTracking: true,
    enablePerformanceMonitoring: true,
    logLevel: process.env.LOG_LEVEL || 'info',
    enableUserActivityLogging: true,
  },
  
  // External integrations
  integrations: {
    email: {
      enabled: !!process.env.SMTP_HOST,
      provider: 'smtp',
      fromAddress: process.env.SMTP_FROM || 'noreply@clinic.com',
    },
    sms: {
      enabled: false,
      provider: 'twilio',
    },
    backup: {
      enabled: true,
      frequency: 'daily',
      retention: 30, // days
    },
  },
} as const;

// Type definitions for configuration
export type AppConfig = typeof appConfig;
export type UserRole = keyof typeof appConfig.roles;
export type FeatureFlag = keyof typeof appConfig.features;

// Utility functions for configuration
export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return appConfig.features[feature];
};

export const getUserRoleLevel = (role: string): number => {
  return appConfig.roleHierarchy[role as keyof typeof appConfig.roleHierarchy] || 0;
};

export const hasPermission = (userRole: string, requiredRole: string): boolean => {
  const userLevel = getUserRoleLevel(userRole);
  const requiredLevel = getUserRoleLevel(requiredRole);
  return userLevel >= requiredLevel;
};

export const getConfigValue = <T>(path: string, defaultValue: T): T => {
  const keys = path.split('.');
  let value: any = appConfig;
  
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) {
      return defaultValue;
    }
  }
  
  return value as T;
};
