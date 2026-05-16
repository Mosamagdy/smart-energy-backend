-- ============================================================================
-- Migration 043: Add contract_dept_head role
-- ============================================================================
-- Creates dedicated role for contract management with specific permissions
-- ============================================================================

BEGIN;

-- Insert contract_dept_head role
INSERT INTO roles (name, description) 
VALUES (
  'contract_dept_head', 
  'مسؤول العقود - صلاحيات رفع العقود وإدارة المشاريع للقراءة فقط'
)
ON CONFLICT (name) DO NOTHING;

-- Verify role was created
SELECT id, name, description 
FROM roles 
WHERE name = 'contract_dept_head';

-- Add role-specific permissions for contract management
-- First, ensure permissions exist
INSERT INTO permissions (name) VALUES 
  ('contracts:upload'),
  ('contracts:read'),
  ('contracts:verify'),
  ('projects:read')
ON CONFLICT (name) DO NOTHING;

-- Get role ID and permission IDs
DO $$
DECLARE
  v_role_id INTEGER;
  v_perm_id INTEGER;
BEGIN
  -- Get contract_dept_head role ID
  SELECT id INTO v_role_id FROM roles WHERE name = 'contract_dept_head';
  
  -- Assign contracts:upload permission
  SELECT id INTO v_perm_id FROM permissions WHERE name = 'contracts:upload';
  INSERT INTO role_permissions (role_id, permission_id) 
  VALUES (v_role_id, v_perm_id) 
  ON CONFLICT DO NOTHING;
  
  -- Assign contracts:read permission
  SELECT id INTO v_perm_id FROM permissions WHERE name = 'contracts:read';
  INSERT INTO role_permissions (role_id, permission_id) 
  VALUES (v_role_id, v_perm_id) 
  ON CONFLICT DO NOTHING;
  
  -- Assign contracts:verify permission
  SELECT id INTO v_perm_id FROM permissions WHERE name = 'contracts:verify';
  INSERT INTO role_permissions (role_id, permission_id) 
  VALUES (v_role_id, v_perm_id) 
  ON CONFLICT DO NOTHING;
  
  -- Assign projects:read permission
  SELECT id INTO v_perm_id FROM permissions WHERE name = 'projects:read';
  INSERT INTO role_permissions (role_id, permission_id) 
  VALUES (v_role_id, v_perm_id) 
  ON CONFLICT DO NOTHING;
END $$;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
WHERE r.name = 'contract_dept_head'
GROUP BY r.name;
