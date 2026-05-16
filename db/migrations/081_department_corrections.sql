-- Smart Energy ERP
-- Migration 081: Department Corrections and Cleanup
-- Updates 7 core services with correct data and removes placeholders

BEGIN;

-- ============================================================================
-- PART 1: Update 7 Core Services with Correct Data
-- ============================================================================

-- First, delete the old English-named departments (IDs 33-39)
DELETE FROM departments WHERE id IN (33, 34, 35, 36, 37, 38, 39);

-- Update industrial_automation (ID 28 or 29)
UPDATE departments 
SET name = 'الأتمتة الصناعية والتحكم',
    description = 'خدمات الأتمتة الصناعية والتحكم الصناعي',
    dept_type = 'technical',
    created_by = 97,
    is_active = true
WHERE id = 28;

-- Delete duplicate automation dept (ID 29)
DELETE FROM departments WHERE id = 29;

-- Update digital_transformation (ID 40 already exists with correct name)
UPDATE departments 
SET description = 'خدمات التحول الرقمي',
    dept_type = 'technical',
    created_by = 97,
    is_active = true
WHERE id = 40;

-- Create/Update execution_operations_maintenance
INSERT INTO departments (name, description, dept_type, created_by, is_active) VALUES
  ('التنفيذ والتشغيل والصيانة', 'خدمات التنفيذ والتشغيل والصيانة', 'technical', 97, true)
ON CONFLICT (name) DO UPDATE 
  SET description = EXCLUDED.description, dept_type = 'technical', created_by = 97, is_active = true;

-- Create/Update infrastructure_smart_cities
INSERT INTO departments (name, description, dept_type, created_by, is_active) VALUES
  ('البنية التحتية والمدن الذكية', 'خدمات البنية التحتية والمدن الذكية', 'technical', 97, true)
ON CONFLICT (name) DO UPDATE 
  SET description = EXCLUDED.description, dept_type = 'technical', created_by = 97, is_active = true;

-- Create/Update smart_buildings_homes
INSERT INTO departments (name, description, dept_type, created_by, is_active) VALUES
  ('المباني والمنازل الذكية', 'خدمات المباني والمنازل الذكية', 'technical', 97, true)
ON CONFLICT (name) DO UPDATE 
  SET description = EXCLUDED.description, dept_type = 'technical', created_by = 97, is_active = true;

-- Update energy_efficiency (ID 23)
UPDATE departments 
SET name = 'كفاءة الطاقة',
    description = 'خدمات كفاءة الطاقة',
    dept_type = 'technical',
    created_by = 97,
    is_active = true
WHERE id = 23;

-- Create/Update renewable_energy_storage
INSERT INTO departments (name, description, dept_type, created_by, is_active) VALUES
  ('الطاقة المتجددة وتخزين الطاقة', 'خدمات الطاقة المتجددة وأنظمة تخزين الطاقة', 'technical', 97, true)
ON CONFLICT (name) DO UPDATE 
  SET description = EXCLUDED.description, dept_type = 'technical', created_by = 97, is_active = true;

-- ============================================================================
-- PART 2: Delete Administrative Placeholder Departments
-- ============================================================================

-- Delete old placeholder departments (IDs 7, 12, 16-22, 25, 26, 30-32)
DELETE FROM departments 
WHERE id IN (7, 12, 16, 17, 18, 19, 20, 21, 22, 25, 26, 30, 31, 32);

-- Deactivate any remaining administrative departments that are not the 7 core services
UPDATE departments 
SET is_active = false
WHERE dept_type = 'administrative'
  AND name NOT IN ('admin', 'Admin', 'administration', 'الإدارة');

-- ============================================================================
-- PART 3: Verification
-- ============================================================================

-- Show all active departments
SELECT 'Active Departments After Cleanup' as info;
SELECT id, name, description, dept_type, created_by, is_active
FROM departments
WHERE is_active = true
ORDER BY id;

-- Count by type
SELECT 'Department Count by Type' as info;
SELECT dept_type, COUNT(*) as count
FROM departments
WHERE is_active = true
GROUP BY dept_type
ORDER BY dept_type;

COMMIT;
