-- ======================================
-- Migration 030: Quotation-to-Project Cycle
-- Adds client response tracking, payment status, and project conversion
-- ======================================

-- 1. Add client response columns to quotations table
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_response VARCHAR(50) DEFAULT 'pending';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_response_date TIMESTAMP WITH TIME ZONE;

-- 2. Add payment tracking columns
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS downpayment_amount NUMERIC(16,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS downpayment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS payment_confirmed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;

-- 3. Add project conversion tracking
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS converted_to_project_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS converted_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- 4. Add client user tracking (links lead to created client user)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS temp_password_sent BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS temp_password_hash VARCHAR(512);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotations_client_response ON quotations(client_response);
CREATE INDEX IF NOT EXISTS idx_quotations_payment_status ON quotations(payment_status);
CREATE INDEX IF NOT EXISTS idx_quotations_project_id ON quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_user_id ON leads(client_user_id);

-- 6. Add constraint for valid client_response values
ALTER TABLE quotations ADD CONSTRAINT chk_quotations_client_response 
  CHECK (client_response IN ('pending', 'client_approved', 'client_rejected'));

-- 7. Add constraint for valid payment_status values
ALTER TABLE quotations ADD CONSTRAINT chk_quotations_payment_status 
  CHECK (payment_status IN ('pending', 'awaiting_downpayment', 'downpayment_received', 'fully_paid'));

-- 8. Add comments for documentation
COMMENT ON COLUMN quotations.client_response IS 'Client approval status: pending, client_approved, client_rejected';
COMMENT ON COLUMN quotations.payment_status IS 'Payment tracking: pending, awaiting_downpayment, downpayment_received, fully_paid';
COMMENT ON COLUMN quotations.project_id IS 'Linked project after conversion';
COMMENT ON COLUMN leads.client_user_id IS 'Auto-created client user account ID';
COMMENT ON COLUMN leads.temp_password_hash IS 'Hashed temporary password for client account';
