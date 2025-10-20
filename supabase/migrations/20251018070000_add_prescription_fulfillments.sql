-- Create prescription_fulfillments table for tracking prescription fulfillment
CREATE TABLE IF NOT EXISTS prescription_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES prescriptions(id) ON DELETE CASCADE NOT NULL,
  fulfilled_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  fulfilled_at timestamptz DEFAULT now(),
  status text DEFAULT 'Filled' CHECK (status IN ('Filled', 'Partially Filled', 'Cancelled')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prescription_fulfillments_prescription_id ON prescription_fulfillments(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_fulfillments_fulfilled_by ON prescription_fulfillments(fulfilled_by);
CREATE INDEX IF NOT EXISTS idx_prescription_fulfillments_fulfilled_at ON prescription_fulfillments(fulfilled_at);

-- Enable RLS on prescription_fulfillments
ALTER TABLE prescription_fulfillments ENABLE ROW LEVEL SECURITY;

-- Create policies for prescription fulfillments
CREATE POLICY "Pharmacists can view fulfillments"
  ON prescription_fulfillments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Pharmacist')
    )
  );

CREATE POLICY "Pharmacists can create fulfillments"
  ON prescription_fulfillments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Pharmacist')
    )
  );

-- Add audit trigger for prescription fulfillments
CREATE TRIGGER audit_trigger_prescription_fulfillments
  AFTER INSERT OR UPDATE OR DELETE ON prescription_fulfillments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
