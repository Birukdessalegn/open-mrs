/*
  # Healthcare Platform Database Schema

  ## Overview
  Complete database schema for a digital health platform serving primary healthcare clinics.
  Includes EMR, billing, inventory, laboratory, and user management.

  ## New Tables

  ### 1. User Management
  - `profiles` - Extended user information with role-based access
    - `id` (uuid, references auth.users)
    - `email` (text)
    - `full_name` (text)
    - `role` (text) - Admin, Doctor, Lab Tech, Pharmacist, Receptionist
    - `phone` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 2. Patient Management
  - `patients` - Patient demographic and contact information
    - `id` (uuid, primary key)
    - `medical_id` (text, unique)
    - `first_name` (text)
    - `last_name` (text)
    - `date_of_birth` (date)
    - `gender` (text)
    - `phone` (text)
    - `email` (text)
    - `address` (text)
    - `emergency_contact_name` (text)
    - `emergency_contact_phone` (text)
    - `blood_group` (text)
    - `allergies` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `appointments` - Appointment scheduling
    - `id` (uuid, primary key)
    - `patient_id` (uuid, references patients)
    - `doctor_id` (uuid, references profiles)
    - `appointment_date` (timestamptz)
    - `status` (text) - Scheduled, Completed, Cancelled, No Show
    - `reason` (text)
    - `notes` (text)
    - `created_at` (timestamptz)

  ### 3. Clinical & EMR
  - `visits` - Patient visit records
    - `id` (uuid, primary key)
    - `patient_id` (uuid, references patients)
    - `doctor_id` (uuid, references profiles)
    - `visit_date` (timestamptz)
    - `chief_complaint` (text)
    - `vital_signs` (jsonb) - BP, temp, pulse, weight, height
    - `diagnosis` (text)
    - `treatment_plan` (text)
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `prescriptions` - Medication prescriptions
    - `id` (uuid, primary key)
    - `visit_id` (uuid, references visits)
    - `patient_id` (uuid, references patients)
    - `medication_name` (text)
    - `dosage` (text)
    - `frequency` (text)
    - `duration` (text)
    - `instructions` (text)
    - `created_at` (timestamptz)

  - `medical_documents` - Lab results, scans, reports
    - `id` (uuid, primary key)
    - `patient_id` (uuid, references patients)
    - `visit_id` (uuid, references visits, nullable)
    - `document_type` (text)
    - `file_url` (text)
    - `notes` (text)
    - `uploaded_by` (uuid, references profiles)
    - `created_at` (timestamptz)

  ### 4. Laboratory
  - `lab_tests` - Lab test catalog
    - `id` (uuid, primary key)
    - `test_name` (text)
    - `test_code` (text, unique)
    - `description` (text)
    - `price` (decimal)
    - `normal_range` (text)
    - `active` (boolean)
    - `created_at` (timestamptz)

  - `lab_orders` - Lab test orders
    - `id` (uuid, primary key)
    - `patient_id` (uuid, references patients)
    - `visit_id` (uuid, references visits, nullable)
    - `ordered_by` (uuid, references profiles)
    - `order_date` (timestamptz)
    - `status` (text) - Pending, In Progress, Completed, Cancelled
    - `notes` (text)
    - `created_at` (timestamptz)

  - `lab_order_items` - Individual tests in an order
    - `id` (uuid, primary key)
    - `lab_order_id` (uuid, references lab_orders)
    - `lab_test_id` (uuid, references lab_tests)
    - `result` (text)
    - `result_date` (timestamptz)
    - `performed_by` (uuid, references profiles)
    - `created_at` (timestamptz)

  ### 5. Billing & Revenue
  - `services` - Billable services catalog
    - `id` (uuid, primary key)
    - `service_name` (text)
    - `service_code` (text, unique)
    - `description` (text)
    - `price` (decimal)
    - `category` (text) - Consultation, Procedure, Lab, Medication
    - `active` (boolean)
    - `created_at` (timestamptz)

  - `invoices` - Patient invoices
    - `id` (uuid, primary key)
    - `invoice_number` (text, unique)
    - `patient_id` (uuid, references patients)
    - `visit_id` (uuid, references visits, nullable)
    - `invoice_date` (timestamptz)
    - `due_date` (date)
    - `subtotal` (decimal)
    - `tax` (decimal)
    - `discount` (decimal)
    - `total_amount` (decimal)
    - `amount_paid` (decimal)
    - `status` (text) - Pending, Paid, Partially Paid, Cancelled
    - `created_by` (uuid, references profiles)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `invoice_items` - Line items in invoice
    - `id` (uuid, primary key)
    - `invoice_id` (uuid, references invoices)
    - `service_id` (uuid, references services, nullable)
    - `description` (text)
    - `quantity` (integer)
    - `unit_price` (decimal)
    - `total_price` (decimal)
    - `created_at` (timestamptz)

  - `payments` - Payment transactions
    - `id` (uuid, primary key)
    - `invoice_id` (uuid, references invoices)
    - `payment_date` (timestamptz)
    - `amount` (decimal)
    - `payment_method` (text) - Cash, Card, Insurance, Mobile Money
    - `reference_number` (text)
    - `received_by` (uuid, references profiles)
    - `notes` (text)
    - `created_at` (timestamptz)

  ### 6. Pharmacy & Inventory
  - `medications` - Medicine inventory catalog
    - `id` (uuid, primary key)
    - `medication_name` (text)
    - `generic_name` (text)
    - `brand_name` (text)
    - `category` (text)
    - `unit` (text) - Tablet, Capsule, Syrup, Injection
    - `description` (text)
    - `reorder_level` (integer)
    - `active` (boolean)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `medication_stock` - Stock batches
    - `id` (uuid, primary key)
    - `medication_id` (uuid, references medications)
    - `batch_number` (text)
    - `quantity` (integer)
    - `unit_price` (decimal)
    - `selling_price` (decimal)
    - `expiry_date` (date)
    - `supplier` (text)
    - `received_date` (date)
    - `received_by` (uuid, references profiles)
    - `created_at` (timestamptz)

  - `stock_transactions` - Stock movements
    - `id` (uuid, primary key)
    - `medication_id` (uuid, references medications)
    - `stock_id` (uuid, references medication_stock)
    - `transaction_type` (text) - Purchase, Sale, Adjustment, Expired
    - `quantity` (integer)
    - `transaction_date` (timestamptz)
    - `reference_id` (uuid) - invoice_id or other reference
    - `notes` (text)
    - `performed_by` (uuid, references profiles)
    - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Create policies for role-based access control
  - Authenticated users can only access data based on their role
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('Admin', 'Doctor', 'Lab Tech', 'Pharmacist', 'Receptionist')),
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_id text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text CHECK (gender IN ('Male', 'Female', 'Other')),
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  blood_group text,
  allergies text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES profiles ON DELETE SET NULL,
  appointment_date timestamptz NOT NULL,
  status text DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No Show')),
  reason text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create visits table
CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES profiles ON DELETE SET NULL NOT NULL,
  visit_date timestamptz DEFAULT now(),
  chief_complaint text,
  vital_signs jsonb DEFAULT '{}',
  diagnosis text,
  treatment_plan text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES visits ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients ON DELETE CASCADE NOT NULL,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  duration text NOT NULL,
  instructions text,
  created_at timestamptz DEFAULT now()
);

-- Create medical_documents table
CREATE TABLE IF NOT EXISTS medical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients ON DELETE CASCADE NOT NULL,
  visit_id uuid REFERENCES visits ON DELETE CASCADE,
  document_type text NOT NULL,
  file_url text NOT NULL,
  notes text,
  uploaded_by uuid REFERENCES profiles ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create lab_tests table
CREATE TABLE IF NOT EXISTS lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL,
  test_code text UNIQUE NOT NULL,
  description text,
  price decimal(10,2) NOT NULL DEFAULT 0,
  normal_range text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create lab_orders table
CREATE TABLE IF NOT EXISTS lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients ON DELETE CASCADE NOT NULL,
  visit_id uuid REFERENCES visits ON DELETE SET NULL,
  ordered_by uuid REFERENCES profiles ON DELETE SET NULL NOT NULL,
  order_date timestamptz DEFAULT now(),
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create lab_order_items table
CREATE TABLE IF NOT EXISTS lab_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id uuid REFERENCES lab_orders ON DELETE CASCADE NOT NULL,
  lab_test_id uuid REFERENCES lab_tests ON DELETE RESTRICT NOT NULL,
  result text,
  result_date timestamptz,
  performed_by uuid REFERENCES profiles ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  service_code text UNIQUE NOT NULL,
  description text,
  price decimal(10,2) NOT NULL DEFAULT 0,
  category text CHECK (category IN ('Consultation', 'Procedure', 'Lab', 'Medication')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  patient_id uuid REFERENCES patients ON DELETE CASCADE NOT NULL,
  visit_id uuid REFERENCES visits ON DELETE SET NULL,
  invoice_date timestamptz DEFAULT now(),
  due_date date,
  subtotal decimal(10,2) DEFAULT 0,
  tax decimal(10,2) DEFAULT 0,
  discount decimal(10,2) DEFAULT 0,
  total_amount decimal(10,2) DEFAULT 0,
  amount_paid decimal(10,2) DEFAULT 0,
  status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Partially Paid', 'Cancelled')),
  created_by uuid REFERENCES profiles ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices ON DELETE CASCADE NOT NULL,
  service_id uuid REFERENCES services ON DELETE SET NULL,
  description text NOT NULL,
  quantity integer DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices ON DELETE CASCADE NOT NULL,
  payment_date timestamptz DEFAULT now(),
  amount decimal(10,2) NOT NULL,
  payment_method text CHECK (payment_method IN ('Cash', 'Card', 'Insurance', 'Mobile Money')),
  reference_number text,
  received_by uuid REFERENCES profiles ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_name text NOT NULL,
  generic_name text,
  brand_name text,
  category text,
  unit text CHECK (unit IN ('Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drop', 'Inhaler')),
  description text,
  reorder_level integer DEFAULT 10,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create medication_stock table
CREATE TABLE IF NOT EXISTS medication_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid REFERENCES medications ON DELETE CASCADE NOT NULL,
  batch_number text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  unit_price decimal(10,2) NOT NULL,
  selling_price decimal(10,2) NOT NULL,
  expiry_date date NOT NULL,
  supplier text,
  received_date date DEFAULT CURRENT_DATE,
  received_by uuid REFERENCES profiles ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create stock_transactions table
CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid REFERENCES medications ON DELETE CASCADE NOT NULL,
  stock_id uuid REFERENCES medication_stock ON DELETE SET NULL,
  transaction_type text CHECK (transaction_type IN ('Purchase', 'Sale', 'Adjustment', 'Expired')),
  quantity integer NOT NULL,
  transaction_date timestamptz DEFAULT now(),
  reference_id uuid,
  notes text,
  performed_by uuid REFERENCES profiles ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Patients policies
CREATE POLICY "Authenticated users can view patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor', 'Receptionist')
    )
  );

CREATE POLICY "Staff can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor', 'Receptionist')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor', 'Receptionist')
    )
  );

-- Appointments policies
CREATE POLICY "Authenticated users can view appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor', 'Receptionist')
    )
  );

CREATE POLICY "Staff can update appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor', 'Receptionist')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor', 'Receptionist')
    )
  );

-- Visits policies
CREATE POLICY "Authenticated users can view visits"
  ON visits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors can create visits"
  ON visits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor')
    )
  );

CREATE POLICY "Doctors can update visits"
  ON visits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor')
    )
  );

-- Prescriptions policies
CREATE POLICY "Authenticated users can view prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors can create prescriptions"
  ON prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor')
    )
  );

-- Medical documents policies
CREATE POLICY "Authenticated users can view documents"
  ON medical_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can upload documents"
  ON medical_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- Lab tests policies
CREATE POLICY "Authenticated users can view lab tests"
  ON lab_tests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage lab tests"
  ON lab_tests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Lab orders policies
CREATE POLICY "Authenticated users can view lab orders"
  ON lab_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors can create lab orders"
  ON lab_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor')
    )
  );

CREATE POLICY "Lab staff can update orders"
  ON lab_orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Lab Tech')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Lab Tech')
    )
  );

-- Lab order items policies
CREATE POLICY "Authenticated users can view lab order items"
  ON lab_order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Doctors can create lab order items"
  ON lab_order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor')
    )
  );

CREATE POLICY "Lab staff can update results"
  ON lab_order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Lab Tech')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Lab Tech')
    )
  );

-- Services policies
CREATE POLICY "Authenticated users can view services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Invoices policies
CREATE POLICY "Authenticated users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor', 'Receptionist')
    )
  );

CREATE POLICY "Staff can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Receptionist')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Receptionist')
    )
  );

-- Invoice items policies
CREATE POLICY "Authenticated users can view invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can create invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor', 'Receptionist')
    )
  );

-- Payments policies
CREATE POLICY "Authenticated users can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can record payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Receptionist')
    )
  );

-- Medications policies
CREATE POLICY "Authenticated users can view medications"
  ON medications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pharmacists can manage medications"
  ON medications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Pharmacist')
    )
  );

CREATE POLICY "Pharmacists can update medications"
  ON medications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Pharmacist')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Pharmacist')
    )
  );

-- Medication stock policies
CREATE POLICY "Authenticated users can view stock"
  ON medication_stock FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pharmacists can manage stock"
  ON medication_stock FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Pharmacist')
    )
  );

CREATE POLICY "Pharmacists can update stock"
  ON medication_stock FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Pharmacist')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Pharmacist')
    )
  );

-- Stock transactions policies
CREATE POLICY "Authenticated users can view transactions"
  ON stock_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Pharmacists can record transactions"
  ON stock_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Pharmacist')
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_medical_id ON patients(medical_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_doctor_id ON visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit_id ON prescriptions(visit_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient_id ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status ON lab_orders(status);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_medication_stock_medication_id ON medication_stock(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_stock_expiry ON medication_stock(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_medication_id ON stock_transactions(medication_id);