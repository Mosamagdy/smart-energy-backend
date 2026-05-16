-- ============================================================================
-- Migration: Make supplier_id nullable for initial PM purchase requests
-- Date: April 19, 2026
-- Purpose: Allow Project Managers to create POs without supplier assignment
-- ============================================================================

-- Step 1: Drop NOT NULL constraint on purchase_orders.supplier_id
ALTER TABLE purchase_orders 
ALTER COLUMN supplier_id DROP NOT NULL;

-- Step 2: Add comment explaining the workflow
COMMENT ON COLUMN purchase_orders.supplier_id IS 
'Nullable for initial PM requests. Set by procurement_manager during approval stage.';

-- Verification query (run after migration):
-- SELECT column_name, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'purchase_orders' AND column_name = 'supplier_id';
-- Expected: is_nullable = 'YES'
