-- Create queue management system
-- This includes queue types, queue entries, and queue status tracking

-- Create queue_types table for different types of queues
CREATE TABLE IF NOT EXISTS queue_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#3B82F6', -- Hex color for UI display
  priority_order integer DEFAULT 0, -- Lower number = higher priority
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create queue_entries table for individual queue items
CREATE TABLE IF NOT EXISTS queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_type_id uuid REFERENCES queue_types(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  visit_id uuid REFERENCES visits(id) ON DELETE SET NULL,
  priority text DEFAULT 'Normal' CHECK (priority IN ('High', 'Normal', 'Low')),
  status text DEFAULT 'Waiting' CHECK (status IN ('Waiting', 'In Progress', 'Completed', 'Cancelled', 'No Show')),
  queue_number integer NOT NULL,
  estimated_wait_time integer DEFAULT 0, -- in minutes
  actual_wait_time integer DEFAULT 0, -- in minutes
  called_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create queue_display_settings table for display configuration
CREATE TABLE IF NOT EXISTS queue_display_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_type_id uuid REFERENCES queue_types(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  show_patient_name boolean DEFAULT true,
  show_estimated_wait boolean DEFAULT true,
  show_queue_number boolean DEFAULT true,
  max_display_items integer DEFAULT 10,
  refresh_interval integer DEFAULT 30, -- seconds
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_queue_entries_queue_type_id ON queue_entries(queue_type_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_patient_id ON queue_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_created_at ON queue_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_entries_queue_number ON queue_entries(queue_number);
CREATE INDEX IF NOT EXISTS idx_queue_types_priority_order ON queue_types(priority_order);
CREATE INDEX IF NOT EXISTS idx_queue_display_settings_queue_type_id ON queue_display_settings(queue_type_id);

-- Enable RLS on all tables
ALTER TABLE queue_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_display_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for queue_types
CREATE POLICY "Authenticated users can view queue types"
  ON queue_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage queue types"
  ON queue_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Create policies for queue_entries
CREATE POLICY "Staff can view queue entries"
  ON queue_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Doctor', 'Receptionist', 'Lab Tech', 'Pharmacist')
    )
  );

CREATE POLICY "Receptionists can manage queue entries"
  ON queue_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Receptionist')
    )
  );

-- Create policies for queue_display_settings
CREATE POLICY "Authenticated users can view display settings"
  ON queue_display_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage display settings"
  ON queue_display_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Admin'
    )
  );

-- Create functions for queue management
CREATE OR REPLACE FUNCTION get_next_queue_number(queue_type_uuid uuid)
RETURNS integer AS $$
DECLARE
  next_number integer;
BEGIN
  SELECT COALESCE(MAX(queue_number), 0) + 1
  INTO next_number
  FROM queue_entries
  WHERE queue_type_id = queue_type_uuid
  AND DATE(created_at) = CURRENT_DATE;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate estimated wait time
CREATE OR REPLACE FUNCTION calculate_estimated_wait_time(queue_type_uuid uuid)
RETURNS integer AS $$
DECLARE
  avg_wait_time integer;
  waiting_count integer;
BEGIN
  -- Get average wait time for completed entries today
  SELECT COALESCE(AVG(actual_wait_time), 15) -- Default 15 minutes
  INTO avg_wait_time
  FROM queue_entries
  WHERE queue_type_id = queue_type_uuid
  AND status = 'Completed'
  AND DATE(created_at) = CURRENT_DATE;
  
  -- Get number of people waiting
  SELECT COUNT(*)
  INTO waiting_count
  FROM queue_entries
  WHERE queue_type_id = queue_type_uuid
  AND status = 'Waiting'
  AND DATE(created_at) = CURRENT_DATE;
  
  RETURN avg_wait_time * waiting_count;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_queue_types_updated_at
  BEFORE UPDATE ON queue_types
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_updated_at();

CREATE TRIGGER update_queue_entries_updated_at
  BEFORE UPDATE ON queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_updated_at();

CREATE TRIGGER update_queue_display_settings_updated_at
  BEFORE UPDATE ON queue_display_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_updated_at();

-- Add audit triggers
CREATE TRIGGER audit_trigger_queue_types
  AFTER INSERT OR UPDATE OR DELETE ON queue_types
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_trigger_queue_entries
  AFTER INSERT OR UPDATE OR DELETE ON queue_entries
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_trigger_queue_display_settings
  AFTER INSERT OR UPDATE OR DELETE ON queue_display_settings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
