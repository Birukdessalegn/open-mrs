-- Add status field to prescriptions table
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending' CHECK (status IN ('Pending', 'Filled', 'Cancelled'));

-- Add updated_at field if it doesn't exist
ALTER TABLE prescriptions 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create function to update updated_at timestamp for prescriptions
CREATE OR REPLACE FUNCTION update_prescriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at for prescriptions
DROP TRIGGER IF EXISTS update_prescriptions_updated_at_trigger ON prescriptions;
CREATE TRIGGER update_prescriptions_updated_at_trigger
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_prescriptions_updated_at();

-- Create index for better query performance on status
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_updated_at ON prescriptions(updated_at);

