-- Smart Energy ERP
-- Migration 077: Update Admin Salary Account Codes to Match Official Report
-- Changes 5-digit codes to 7-digit codes per company report

BEGIN;

-- Update account codes for Admin Salaries section
-- 32201 → 3220003 (رواتب الإداريين والموظفين)
UPDATE chart_of_accounts 
SET account_code = '3220003' 
WHERE account_code = '32201';

-- 32202 → 3220001 (بدلات سكن - إدارة)
UPDATE chart_of_accounts 
SET account_code = '3220001' 
WHERE account_code = '32202';

-- 32203 → 3220002 (بدلات اجازة- إدارة)
UPDATE chart_of_accounts 
SET account_code = '3220002' 
WHERE account_code = '32203';

-- 32204 → 3220006 (بدلات إدارية أخرى)
UPDATE chart_of_accounts 
SET account_code = '3220006' 
WHERE account_code = '32204';

-- Verify the changes
SELECT account_code, account_name, account_name_ar, account_type, normal_balance
FROM chart_of_accounts
WHERE account_code IN ('3220001', '3220002', '3220003', '3220006')
ORDER BY account_code;

COMMIT;
