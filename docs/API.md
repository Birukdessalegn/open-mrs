# OpenMRS Pro API Documentation

This document provides comprehensive API documentation for the OpenMRS Pro healthcare management system.

## Table of Contents

- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## Authentication

The API uses Supabase authentication with JWT tokens. All API requests require a valid authentication token.

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Getting a Token

```typescript
// Login to get a token
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const token = data.session?.access_token;
```

## API Endpoints

### Base URL
```
/api/v1
```

### Patients

#### GET /patients
Get a list of patients with optional filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search term for name or medical ID
- `status` (string): Filter by status
- `date_from` (string): Filter by creation date from
- `date_to` (string): Filter by creation date to

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "medical_id": "MED001",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1990-01-01",
      "gender": "Male",
      "phone": "+1234567890",
      "email": "john@example.com",
      "address": "123 Main St",
      "emergency_contact_name": "Jane Doe",
      "emergency_contact_phone": "+1234567891",
      "blood_group": "O+",
      "allergies": "Penicillin",
      "created_at": "2023-01-01T00:00:00Z",
      "updated_at": "2023-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10,
  "hasMore": true
}
```

#### POST /patients
Create a new patient.

**Request Body:**
```json
{
  "medical_id": "MED001",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-01-01",
  "gender": "Male",
  "phone": "+1234567890",
  "email": "john@example.com",
  "address": "123 Main St",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "+1234567891",
  "blood_group": "O+",
  "allergies": "Penicillin"
}
```

#### GET /patients/:id
Get a specific patient by ID.

#### PUT /patients/:id
Update a patient.

#### DELETE /patients/:id
Delete a patient.

### Appointments

#### GET /appointments
Get a list of appointments.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `patient_id` (string): Filter by patient ID
- `doctor_id` (string): Filter by doctor ID
- `status` (string): Filter by status
- `date_from` (string): Filter by date from
- `date_to` (string): Filter by date to

#### POST /appointments
Create a new appointment.

**Request Body:**
```json
{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "appointment_date": "2023-01-01T10:00:00Z",
  "reason": "Annual checkup",
  "notes": "Patient requested morning appointment"
}
```

### Visits

#### GET /visits
Get a list of patient visits.

#### POST /visits
Create a new visit record.

**Request Body:**
```json
{
  "patient_id": "uuid",
  "doctor_id": "uuid",
  "chief_complaint": "Headache and fever",
  "vital_signs": {
    "blood_pressure_systolic": 120,
    "blood_pressure_diastolic": 80,
    "temperature": 37.5,
    "pulse": 72,
    "weight": 70,
    "height": 175,
    "oxygen_saturation": 98
  },
  "diagnosis": "Viral infection",
  "treatment_plan": "Rest and fluids",
  "notes": "Patient responds well to treatment"
}
```

### Laboratory

#### GET /lab-tests
Get available laboratory tests.

#### GET /lab-orders
Get laboratory orders.

#### POST /lab-orders
Create a new lab order.

**Request Body:**
```json
{
  "patient_id": "uuid",
  "visit_id": "uuid",
  "ordered_by": "uuid",
  "notes": "Routine blood work",
  "lab_tests": ["uuid1", "uuid2"]
}
```

#### PUT /lab-orders/:id/status
Update lab order status.

**Request Body:**
```json
{
  "status": "Completed"
}
```

#### PUT /lab-order-items/:id/result
Update lab test result.

**Request Body:**
```json
{
  "result": "Normal",
  "performed_by": "uuid"
}
```

### Billing

#### GET /invoices
Get invoices.

#### POST /invoices
Create a new invoice.

**Request Body:**
```json
{
  "patient_id": "uuid",
  "visit_id": "uuid",
  "due_date": "2023-02-01",
  "items": [
    {
      "description": "Consultation",
      "quantity": 1,
      "unit_price": 100.00
    }
  ]
}
```

#### POST /invoices/:id/payments
Record a payment.

**Request Body:**
```json
{
  "amount": 100.00,
  "payment_method": "Cash",
  "reference_number": "REF001",
  "notes": "Full payment received"
}
```

### Pharmacy

#### GET /medications
Get medications.

#### POST /medications
Create a new medication.

#### GET /medications/:id/stock
Get medication stock levels.

#### POST /medications/:id/stock
Add stock to medication.

**Request Body:**
```json
{
  "batch_number": "BATCH001",
  "quantity": 100,
  "unit_price": 5.00,
  "selling_price": 7.50,
  "expiry_date": "2024-12-31",
  "supplier": "Pharma Corp"
}
```

### Audit Logs

#### GET /audit-logs
Get audit logs (Admin only).

**Query Parameters:**
- `table_name` (string): Filter by table name
- `user_id` (string): Filter by user ID
- `action` (string): Filter by action type
- `date_from` (string): Filter by date from
- `date_to` (string): Filter by date to

## Data Models

### Patient
```typescript
interface Patient {
  id: string;
  medical_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_group?: string;
  allergies?: string;
  created_at: string;
  updated_at: string;
}
```

### Appointment
```typescript
interface Appointment {
  id: string;
  patient_id: string;
  doctor_id?: string;
  appointment_date: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';
  reason?: string;
  notes?: string;
  created_at: string;
}
```

### Visit
```typescript
interface Visit {
  id: string;
  patient_id: string;
  doctor_id: string;
  visit_date: string;
  chief_complaint?: string;
  vital_signs?: VitalSigns;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface VitalSigns {
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  temperature?: number;
  pulse?: number;
  weight?: number;
  height?: number;
  oxygen_saturation?: number;
}
```

## Error Handling

The API returns standard HTTP status codes and error messages.

### Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

### Validation Errors
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authenticated users**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Examples

### JavaScript/TypeScript
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Get patients
const { data: patients, error } = await supabase
  .from('patients')
  .select('*')
  .range(0, 9);

// Create appointment
const { data: appointment, error } = await supabase
  .from('appointments')
  .insert({
    patient_id: 'uuid',
    doctor_id: 'uuid',
    appointment_date: '2023-01-01T10:00:00Z',
    reason: 'Annual checkup'
  })
  .select()
  .single();
```

### cURL
```bash
# Get patients
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     "https://your-app.com/api/patients"

# Create patient
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"medical_id":"MED001","first_name":"John","last_name":"Doe"}' \
     "https://your-app.com/api/patients"
```

### Python
```python
import requests

headers = {
    'Authorization': 'Bearer <token>',
    'Content-Type': 'application/json'
}

# Get patients
response = requests.get(
    'https://your-app.com/api/patients',
    headers=headers
)

patients = response.json()

# Create appointment
appointment_data = {
    'patient_id': 'uuid',
    'doctor_id': 'uuid',
    'appointment_date': '2023-01-01T10:00:00Z',
    'reason': 'Annual checkup'
}

response = requests.post(
    'https://your-app.com/api/appointments',
    headers=headers,
    json=appointment_data
)
```

## Webhooks

The API supports webhooks for real-time notifications:

### Available Events
- `patient.created`
- `patient.updated`
- `appointment.scheduled`
- `appointment.completed`
- `visit.created`
- `lab_order.completed`
- `invoice.created`
- `payment.received`

### Webhook Payload
```json
{
  "event": "patient.created",
  "data": {
    "id": "uuid",
    "medical_id": "MED001",
    "first_name": "John",
    "last_name": "Doe"
  },
  "timestamp": "2023-01-01T00:00:00Z"
}
```

## SDKs and Libraries

Official SDKs are available for:
- JavaScript/TypeScript
- Python
- PHP
- Java

Community libraries are available for:
- Ruby
- Go
- C#

For more information, visit the [SDK documentation](https://docs.openmrs-pro.com/sdks).
