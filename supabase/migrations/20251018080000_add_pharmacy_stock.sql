-- Create pharmacy_stock table for inventory management
CREATE TABLE IF NOT EXISTS pharmacy_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid REFERENCES medications(id) ON DELETE CASCADE NOT NULL,
  current_stock integer NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock integer NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(medication_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_medication_id ON pharmacy_stock(medication_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_current_stock ON pharmacy_stock(current_stock);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_updated_by ON pharmacy_stock(updated_by);

-- Enable RLS on pharmacy_stock
ALTER TABLE pharmacy_stock ENABLE ROW LEVEL SECURITY;

-- Create policies for pharmacy stock
CREATE POLICY "Pharmacists can view stock"
  ON pharmacy_stock FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Pharmacist')
    )
  );

CREATE POLICY "Pharmacists can manage stock"
  ON pharmacy_stock FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Admin', 'Pharmacist')
    )
  );

-- Add audit trigger for pharmacy stock
CREATE TRIGGER audit_trigger_pharmacy_stock
  AFTER INSERT OR UPDATE OR DELETE ON pharmacy_stock
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pharmacy_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pharmacy_stock_updated_at_trigger
  BEFORE UPDATE ON pharmacy_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_pharmacy_stock_updated_at();

