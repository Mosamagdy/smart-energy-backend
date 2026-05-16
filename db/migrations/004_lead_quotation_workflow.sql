-- Migration: Lead-to-Quotation Workflow Enhancement
-- Purpose: Add cross-department approval tracking and technical assignment columns
-- Created: 2026-03-23

-- =====================================================
-- LEADS TABLE ENHANCEMENTS
-- =====================================================

-- Add technical department assignment for inspections
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS technical_dept_id INTEGER REFERENCES departments(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Add assigned engineer for the inspection
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS assigned_engineer_id INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Add rejection comment for workflow rejections
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS rejection_comment TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_technical_dept_id ON leads(technical_dept_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_engineer_id ON leads(assigned_engineer_id);

-- =====================================================
-- QUOTATIONS TABLE ENHANCEMENTS
-- =====================================================

-- Add rejection comment for quotation rejections
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS rejection_comment TEXT;

-- Add finance approval tracking
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS finance_approved_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMP WITH TIME ZONE;

-- Add GM approval tracking
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS gm_approved_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS gm_approved_at TIMESTAMP WITH TIME ZONE;

-- Add BOQ (Bill of Quantities) data storage
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS boq_data JSONB;

-- Update comments column to be more descriptive
COMMENT ON COLUMN quotations.comments IS 'General comments about the quotation';

-- Create indexes for approval tracking
CREATE INDEX IF NOT EXISTS idx_quotations_finance_approved_by ON quotations(finance_approved_by);
CREATE INDEX IF NOT EXISTS idx_quotations_gm_approved_by ON quotations(gm_approved_by);

-- =====================================================
-- ADD DEFAULT BOQ_DATA STRUCTURE COMMENT
-- =====================================================

COMMENT ON COLUMN quotations.boq_data IS 'JSONB structure: {
  "items": [
    {
      "description": "Item description",
      "quantity": number,
      "unit_price": number,
      "total": number
    }
  ],
  "materials": [...],
  "labor_cost": number,
  "equipment_cost": number,
  "warranty": "text",
  "delivery_time": "text"
}';

-- =====================================================
-- ROLLBACK SCRIPT (For reference)
-- =====================================================

-- To rollback this migration, run:
/*
-- Drop indexes
DROP INDEX IF EXISTS idx_leads_technical_dept_id;
DROP INDEX IF EXISTS idx_leads_assigned_engineer_id;
DROP INDEX IF EXISTS idx_quotations_finance_approved_by;
DROP INDEX IF EXISTS idx_quotations_gm_approved_by;

-- Remove columns from leads
ALTER TABLE leads DROP COLUMN IF EXISTS technical_dept_id;
ALTER TABLE leads DROP COLUMN IF EXISTS assigned_engineer_id;
ALTER TABLE leads DROP COLUMN IF EXISTS rejection_comment;

-- Remove columns from quotations
ALTER TABLE quotations DROP COLUMN IF EXISTS rejection_comment;
ALTER TABLE quotations DROP COLUMN IF EXISTS finance_approved_by;
ALTER TABLE quotations DROP COLUMN IF EXISTS finance_approved_at;
ALTER TABLE quotations DROP COLUMN IF EXISTS gm_approved_by;
ALTER TABLE quotations DROP COLUMN IF EXISTS gm_approved_at;
ALTER TABLE quotations DROP COLUMN IF EXISTS boq_data;
*/
