-- ============================================================================
-- QUICK FIX: Check if required COA accounts exist for invoice creation
-- This fixes: "Cannot read properties of null (reading 'id')"
-- ============================================================================

-- Check if required accounts exist
SELECT 
  account_code,
  account_name_ar,
  CASE 
    WHEN id IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
FROM (
  VALUES 
    ('121', 'Accounts Receivable'),
    ('4120', 'Project Revenue'),
    ('2220101', 'Output VAT - Sales')
) AS required_accounts(account_code, description)
LEFT JOIN chart_of_accounts coa ON coa.account_code = required_accounts.account_code;

-- Expected result:
-- account_code | account_name_ar                        | status
-- -------------|----------------------------------------|--------
-- 121          | العملاء                                | ✅ EXISTS or ❌ MISSING
-- 4120         | إيرادات مشروع                          | ✅ EXISTS or ❌ MISSING
-- 2220101      | ضريبة القيمة المضافة - مبيعات         | ✅ EXISTS or ❌ MISSING

-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================

DO $$
DECLARE
  ar_exists BOOLEAN;
  revenue_exists BOOLEAN;
  vat_exists BOOLEAN;
BEGIN
  -- Check each account
  SELECT EXISTS(SELECT 1 FROM chart_of_accounts WHERE account_code = '121') INTO ar_exists;
  SELECT EXISTS(SELECT 1 FROM chart_of_accounts WHERE account_code = '4120') INTO revenue_exists;
  SELECT EXISTS(SELECT 1 FROM chart_of_accounts WHERE account_code = '2220101') INTO vat_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COA Accounts Status for Invoicing';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Account 121 (AR): %', CASE WHEN ar_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'Account 4120 (Revenue): %', CASE WHEN revenue_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE 'Account 2220101 (VAT): %', CASE WHEN vat_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '========================================';
  
  IF NOT ar_exists OR NOT revenue_exists OR NOT vat_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ SOME ACCOUNTS ARE MISSING!';
    RAISE NOTICE '';
    RAISE NOTICE '💡 SOLUTION: Run migration 013 to seed COA:';
    RAISE NOTICE '   psql -U postgres -d smart_energy_erp -f db/migrations/013_phase2_complete_coa_seed.sql';
    RAISE NOTICE '';
    RAISE NOTICE 'Or manually insert missing accounts:';
    
    IF NOT ar_exists THEN
      RAISE NOTICE '   INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, ...) VALUES (''121'', ''Accounts Receivable'', ''العملاء'', ...);';
    END IF;
    
    IF NOT revenue_exists THEN
      RAISE NOTICE '   INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, ...) VALUES (''4120'', ''Project Revenue'', ''إيرادات مشروع'', ...);';
    END IF;
    
    IF NOT vat_exists THEN
      RAISE NOTICE '   INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, ...) VALUES (''2220101'', ''VAT - Sales'', ''ضريبة القيمة المضافة - مبيعات'', ...);';
    END IF;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ ALL REQUIRED ACCOUNTS EXIST!';
    RAISE NOTICE 'The error must be caused by something else.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
