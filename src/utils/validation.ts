/**
 * Validation utilities for form validation and data integrity
 * Implements healthcare-specific validation rules
 */

import { z } from 'zod';
import { ValidationError } from '../types';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const phoneSchema = z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number');
export const medicalIdSchema = z.string().min(3, 'Medical ID must be at least 3 characters');
export const requiredStringSchema = z.string().min(1, 'This field is required');

// Patient validation schema
export const patientSchema = z.object({
  medical_id: medicalIdSchema,
  first_name: requiredStringSchema,
  last_name: requiredStringSchema,
  date_of_birth: z.string().refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 0 && age <= 150;
  }, 'Invalid date of birth'),
  gender: z.enum(['Male', 'Female', 'Other']),
  phone: phoneSchema.optional().or(z.literal('')),
  email: emailSchema.optional().or(z.literal('')),
  address: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: phoneSchema.optional().or(z.literal('')),
  blood_group: z.string().optional(),
  allergies: z.string().optional(),
});

// Appointment validation schema
export const appointmentSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  doctor_id: z.string().uuid('Invalid doctor ID'),
  appointment_date: z.string().refine((date) => {
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointmentDate >= today;
  }, 'Appointment date cannot be in the past'),
  reason: requiredStringSchema,
  notes: z.string().optional(),
});

// Visit validation schema
export const visitSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  doctor_id: z.string().uuid('Invalid doctor ID'),
  chief_complaint: z.string().optional(),
  vital_signs: z.object({
    blood_pressure_systolic: z.number().min(50).max(300).optional(),
    blood_pressure_diastolic: z.number().min(30).max(200).optional(),
    temperature: z.number().min(30).max(45).optional(),
    pulse: z.number().min(30).max(200).optional(),
    weight: z.number().min(0.5).max(500).optional(),
    height: z.number().min(30).max(250).optional(),
    oxygen_saturation: z.number().min(70).max(100).optional(),
  }).optional(),
  diagnosis: z.string().optional(),
  treatment_plan: z.string().optional(),
  notes: z.string().optional(),
});

// Prescription validation schema
export const prescriptionSchema = z.object({
  visit_id: z.string().uuid('Invalid visit ID'),
  patient_id: z.string().uuid('Invalid patient ID'),
  medication_name: requiredStringSchema,
  dosage: requiredStringSchema,
  frequency: requiredStringSchema,
  duration: requiredStringSchema,
  instructions: z.string().optional(),
});

// Lab order validation schema
export const labOrderSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  visit_id: z.string().uuid('Invalid visit ID').optional(),
  ordered_by: z.string().uuid('Invalid doctor ID'),
  notes: z.string().optional(),
  lab_tests: z.array(z.string().uuid('Invalid lab test ID')).min(1, 'At least one lab test is required'),
});

// Invoice validation schema
export const invoiceSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  visit_id: z.string().uuid('Invalid visit ID').optional(),
  invoice_date: z.string().optional(),
  due_date: z.string().optional(),
  items: z.array(z.object({
    description: requiredStringSchema,
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unit_price: z.number().min(0, 'Unit price must be positive'),
  })).min(1, 'At least one item is required'),
});

// Medication validation schema
export const medicationSchema = z.object({
  medication_name: requiredStringSchema,
  generic_name: z.string().optional(),
  brand_name: z.string().optional(),
  category: z.string().optional(),
  unit: z.enum(['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drop', 'Inhaler']),
  description: z.string().optional(),
  reorder_level: z.number().min(0, 'Reorder level must be non-negative'),
});

// User profile validation schema
export const profileSchema = z.object({
  full_name: requiredStringSchema,
  email: emailSchema,
  role: z.enum(['Admin', 'Doctor', 'Lab Tech', 'Pharmacist', 'Receptionist']),
  phone: phoneSchema.optional().or(z.literal('')),
});

/**
 * Generic validation function
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
} {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors: ValidationError[] = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return { success: false, errors: validationErrors };
    }
    return { success: false, errors: [{ field: 'general', message: 'Validation failed' }] };
  }
}

/**
 * Sanitize input data
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .substring(0, 1000); // Limit length
}

/**
 * Validate medical ID format
 */
export function validateMedicalId(medicalId: string): boolean {
  // Medical ID should be alphanumeric and 3-20 characters
  const medicalIdRegex = /^[A-Z0-9]{3,20}$/;
  return medicalIdRegex.test(medicalId.toUpperCase());
}

/**
 * Validate blood group
 */
export function validateBloodGroup(bloodGroup: string): boolean {
  const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  return validBloodGroups.includes(bloodGroup.toUpperCase());
}

/**
 * Validate vital signs ranges
 */
export function validateVitalSigns(vitals: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (vitals.blood_pressure_systolic && (vitals.blood_pressure_systolic < 50 || vitals.blood_pressure_systolic > 300)) {
    errors.push('Systolic blood pressure must be between 50-300 mmHg');
  }

  if (vitals.blood_pressure_diastolic && (vitals.blood_pressure_diastolic < 30 || vitals.blood_pressure_diastolic > 200)) {
    errors.push('Diastolic blood pressure must be between 30-200 mmHg');
  }

  if (vitals.temperature && (vitals.temperature < 30 || vitals.temperature > 45)) {
    errors.push('Temperature must be between 30-45°C');
  }

  if (vitals.pulse && (vitals.pulse < 30 || vitals.pulse > 200)) {
    errors.push('Pulse must be between 30-200 bpm');
  }

  if (vitals.weight && (vitals.weight < 0.5 || vitals.weight > 500)) {
    errors.push('Weight must be between 0.5-500 kg');
  }

  if (vitals.height && (vitals.height < 30 || vitals.height > 250)) {
    errors.push('Height must be between 30-250 cm');
  }

  if (vitals.oxygen_saturation && (vitals.oxygen_saturation < 70 || vitals.oxygen_saturation > 100)) {
    errors.push('Oxygen saturation must be between 70-100%');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(error => `${error.field}: ${error.message}`).join(', ');
}
