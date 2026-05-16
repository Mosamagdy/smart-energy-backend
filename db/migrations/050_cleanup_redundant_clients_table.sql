-- ============================================================================
-- CLEANUP PLAN: Remove Redundant clients Table
-- ============================================================================
-- AUDIT FINDINGS:
-- 1. The `clients` table is NOT referenced by any foreign key in the database
-- 2. `projects.client_id` correctly references `users(id)`
-- 3. `contracts.client_id` correctly references `users(id)`
-- 4. Clients are stored in `users` table with role = 'client'
-- 5. The `clients` table contains duplicate/orphaned data
--
-- RECOMMENDATION: Drop the `clients` table completely
-- ============================================================================

BEGIN;

-- STEP 1: Verify no foreign keys reference clients table
-- (This query should return 0 rows)
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'clients';

-- STEP 2: Check if clients table has any data that should be migrated
SELECT COUNT(*) as total_clients, 
       COUNT(DISTINCT email) as unique_emails
FROM clients;

-- STEP 3: Check for clients that exist in clients table but NOT in users table
-- These would be orphaned records that were never converted to user accounts
SELECT c.id, c.name, c.email, c.phone
FROM clients c
LEFT JOIN users u ON u.email = c.email
WHERE u.id IS NULL;

-- STEP 4: If there are orphaned clients, you can optionally create user accounts for them
-- UNCOMMENT AND RUN ONLY IF NEEDED:
/*
INSERT INTO users (role_id, first_name, last_name, email, username, password_hash, status)
SELECT 
    (SELECT id FROM roles WHERE name = 'client' LIMIT 1),
    SPLIT_PART(c.name, ' ', 1) as first_name,
    COALESCE(NULLIF(SPLIT_PART(c.name, ' ', 2), ''), 'Unknown') as last_name,
    c.email,
    c.email as username,
    '$2b$10$placeholder_hash_needs_reset' as password_hash,
    'active' as status
FROM clients c
LEFT JOIN users u ON u.email = c.email
WHERE u.id IS NULL
  AND c.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;
*/

-- STEP 5: Drop the redundant clients table
-- WARNING: This is irreversible! Make sure you have a backup first.
DROP TABLE IF EXISTS clients CASCADE;

-- STEP 6: Verify the table was dropped
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'clients'
) as clients_table_exists;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Verify projects still reference users correctly
SELECT 
    p.id as project_id,
    p.name as project_name,
    p.client_id,
    u.email as client_email,
    u.first_name || ' ' || u.last_name as client_name,
    r.name as client_role
FROM projects p
LEFT JOIN users u ON u.id = p.client_id
LEFT JOIN roles r ON r.id = u.role_id
WHERE p.client_id IS NOT NULL
LIMIT 10;

-- Verify contracts still reference users correctly
SELECT 
    c.id as contract_id,
    c.contract_number,
    c.client_id,
    u.email as client_email,
    u.first_name || ' ' || u.last_name as client_name,
    r.name as client_role
FROM contracts c
LEFT JOIN users u ON u.id = c.client_id
LEFT JOIN roles r ON r.id = u.role_id
WHERE c.client_id IS NOT NULL
LIMIT 10;

-- Count how many users have the 'client' role
SELECT 
    r.name as role_name,
    COUNT(u.id) as user_count
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.name = 'client'
GROUP BY r.name;

-- ============================================================================
-- NOTES FOR DEVELOPMENT TEAM
-- ============================================================================
/*

ARCHITECTURE DECISION:
- We use a SINGLE `users` table for ALL user types (employees, clients, admins, etc.)
- Role-based access control (RBAC) determines what each user can do
- The `role_id` foreign key points to the `roles` table
- Clients are simply users with role = 'client'

BENEFITS:
1. Simplified authentication - one table for all logins
2. Easy role changes (e.g., client becomes partner)
3. No data duplication between clients and users tables
4. Consistent foreign key references across the database
5. Easier to maintain and query

LEADS TO CLIENTS FLOW:
1. Lead is created with client_name, contact_email, contact_phone
2. Lead is qualified and quotation is created
3. Quotation is approved
4. Project is created from the quotation
5. During project creation, a user account is created with role = 'client'
6. The project.client_id is set to this new user's ID
7. The client can now log in to the client portal

TODO FOR DEVELOPERS:
- Update any backend code that references the `clients` table
- Remove any API endpoints that use `/api/clients`
- Update documentation to reflect the single-user-table architecture
- Consider adding a migration script to the deployment pipeline

*/
