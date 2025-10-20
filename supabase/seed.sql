-- Seed data for medications table
INSERT INTO medications (medication_name, description, unit, active) VALUES
('Paracetamol', 'Pain relief and fever reducer', 'Tablet', true),
('Ibuprofen', 'Anti-inflammatory pain relief', 'Tablet', true),
('Amoxicillin', 'Antibiotic for bacterial infections', 'Capsule', true),
('Metformin', 'Diabetes medication', 'Tablet', true),
('Lisinopril', 'Blood pressure medication', 'Tablet', true),
('Atorvastatin', 'Cholesterol lowering medication', 'Tablet', true),
('Omeprazole', 'Stomach acid reducer', 'Capsule', true),
('Cetirizine', 'Antihistamine for allergies', 'Tablet', true),
('Diazepam', 'Anti-anxiety medication', 'Tablet', true),
('Warfarin', 'Blood thinner', 'Tablet', true),
('Furosemide', 'Diuretic for fluid retention', 'Tablet', true),
('Prednisolone', 'Steroid anti-inflammatory', 'Tablet', true),
('Ciprofloxacin', 'Antibiotic for infections', 'Tablet', true),
('Tramadol', 'Pain relief medication', 'Tablet', true),
('Losartan', 'Blood pressure medication', 'Tablet', true);

-- Seed data for lab tests
INSERT INTO lab_tests (test_name, test_code, description, normal_range, price, active) VALUES
('Complete Blood Count', 'CBC', 'Full blood count including red and white blood cells', 'Normal ranges vary by component', 25.00, true),
('Blood Glucose', 'GLU', 'Blood sugar level test', '70-100 mg/dL (fasting)', 15.00, true),
('Cholesterol Panel', 'CHOL', 'Total cholesterol, HDL, LDL levels', 'Total <200 mg/dL', 30.00, true),
('Liver Function Test', 'LFT', 'Liver enzyme and function tests', 'ALT: 7-56 U/L, AST: 10-40 U/L', 35.00, true),
('Kidney Function Test', 'KFT', 'Creatinine and BUN levels', 'Creatinine: 0.6-1.2 mg/dL', 25.00, true),
('Thyroid Function Test', 'TFT', 'TSH, T3, T4 levels', 'TSH: 0.4-4.0 mIU/L', 40.00, true),
('Urinalysis', 'UA', 'Complete urine analysis', 'Normal ranges vary', 20.00, true),
('Hemoglobin A1C', 'HbA1c', 'Average blood sugar over 3 months', '<5.7%', 35.00, true),
('Vitamin D', 'VITD', 'Vitamin D level test', '30-100 ng/mL', 45.00, true),
('C-Reactive Protein', 'CRP', 'Inflammation marker', '<3.0 mg/L', 25.00, true);

-- Create some sample pharmacy stock entries
INSERT INTO pharmacy_stock (medication_id, current_stock, minimum_stock, updated_by) 
SELECT 
  m.id,
  CASE 
    WHEN m.medication_name = 'Paracetamol' THEN 500
    WHEN m.medication_name = 'Ibuprofen' THEN 300
    WHEN m.medication_name = 'Amoxicillin' THEN 200
    WHEN m.medication_name = 'Metformin' THEN 150
    WHEN m.medication_name = 'Lisinopril' THEN 100
    ELSE 50
  END,
  CASE 
    WHEN m.medication_name = 'Paracetamol' THEN 100
    WHEN m.medication_name = 'Ibuprofen' THEN 50
    WHEN m.medication_name = 'Amoxicillin' THEN 30
    WHEN m.medication_name = 'Metformin' THEN 25
    WHEN m.medication_name = 'Lisinopril' THEN 20
    ELSE 10
  END,
  (SELECT id FROM profiles WHERE role = 'Admin' LIMIT 1)
FROM medications m
WHERE m.active = true;

-- Seed data for queue types
INSERT INTO queue_types (name, description, color, priority_order, active) VALUES
('General Consultation', 'General medical consultation queue', '#3B82F6', 1, true),
('Emergency', 'Emergency cases requiring immediate attention', '#EF4444', 0, true),
('Follow-up', 'Follow-up appointments and check-ups', '#10B981', 2, true),
('Lab Results', 'Patients waiting for lab results discussion', '#F59E0B', 3, true),
('Pharmacy', 'Patients waiting for prescription pickup', '#8B5CF6', 4, true),
('Billing', 'Patients at billing and payment counter', '#6B7280', 5, true);

-- Seed data for queue display settings
INSERT INTO queue_display_settings (queue_type_id, display_name, show_patient_name, show_estimated_wait, show_queue_number, max_display_items, refresh_interval, active)
SELECT 
  qt.id,
  qt.name,
  true,
  true,
  true,
  10,
  30,
  true
FROM queue_types qt;
