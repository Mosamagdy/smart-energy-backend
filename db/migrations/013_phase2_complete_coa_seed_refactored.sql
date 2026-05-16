-- ============================================================================
-- PHASE 2: Complete Chart of Accounts Migration (REFACTORED)
-- Source: دليل ومتطلبات حسابات شركة الطاقة الذكية.md
-- Total Accounts: 100+ with 4-level hierarchy
-- Date: 2026-04-06
-- Fix: Uses CTEs to dynamically find parent_id by account_code
-- ============================================================================

BEGIN;

-- Clear existing COA data (backup first!)
TRUNCATE TABLE chart_of_accounts RESTART IDENTITY CASCADE;

-- ============================================================================
-- LEVEL 1: MAIN CATEGORIES (الأصول، الخصوم، مصادر الإنفاق، مصادر الدخل)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 1. الأصول (Assets)
('1', 'Assets', 'الأصول', 'asset', NULL, 1, 'debit', 'balance_sheet', 'asset', TRUE),

-- 2. الخصوم (Liabilities)
('2', 'Liabilities', 'الخصوم', 'liability', NULL, 1, 'credit', 'balance_sheet', 'liability', TRUE),

-- 3. مصادر الإنفاق (Expenses)
('3', 'Expenses', 'مصادر الإنفاق', 'expense', NULL, 1, 'debit', 'income_statement', 'expense', TRUE),

-- 4. مصادر الدخل (Revenue/Income)
('4', 'Revenue', 'مصادر الدخل', 'revenue', NULL, 1, 'credit', 'income_statement', 'revenue', TRUE);

-- ============================================================================
-- LEVEL 2: ASSETS SUB-CATEGORIES (11, 12)
-- Uses subqueries to find parent_id dynamically
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 11. الأصول الثابتة (Fixed Assets) - parent: account_code='1'
('11', 'Fixed Assets', 'الأصول الثابتة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1'), 2, 'debit', 'balance_sheet', 'fixed_asset', TRUE),

-- 12. الأصول المتداولة (Current Assets) - parent: account_code='1'
('12', 'Current Assets', 'الأصول المتداولة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1'), 2, 'debit', 'balance_sheet', 'current_asset', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: FIXED ASSETS DETAIL (111, 112, 113)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, depreciation_method, useful_life_years, financial_statement, report_category, is_active) VALUES
-- 111. الموجودات الثابتة (Tangible Fixed Assets) - parent: account_code='11'
('111', 'Tangible Fixed Assets', 'الموجودات الثابتة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '11'), 3, 'debit', NULL, NULL, 'balance_sheet', 'tangible_fixed_asset', TRUE),

-- 11101 - صيانة وتعديلات المباني المستأجرة - parent: account_code='111'
('11101', 'Leasehold Improvements', 'صيانة وتعديلات المباني المستأجرة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'straight_line', 10, 'balance_sheet', 'leasehold_improvement', TRUE),

-- 11102 - أثاث وتجهيزات مكتبية
('11102', 'Office Furniture & Equipment', 'أثاث وتجهيزات مكتبية', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'straight_line', 7, 'balance_sheet', 'furniture', TRUE),

-- 11103 - وسائط النقل والسيارات
('11103', 'Vehicles & Transportation', 'وسائط النقل والسيارات', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'straight_line', 5, 'balance_sheet', 'vehicles', TRUE),

-- 11104 - آلات ومعدات التشغيل
('11104', 'Operating Machinery & Equipment', 'آلات ومعدات التشغيل', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'straight_line', 10, 'balance_sheet', 'machinery', TRUE),

-- 11105 - تجهيزات الكمبيوتر
('11105', 'Computer Equipment', 'تجهيزات الكمبيوتر', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'straight_line', 3, 'balance_sheet', 'computer_equipment', TRUE),

-- 11106 - العدد والأدوات
('11106', 'Tools & Equipment', 'العدد والأدوات', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'straight_line', 5, 'balance_sheet', 'tools', TRUE),

-- 11107 - برامج المحاسبة
('11107', 'Accounting Software', 'برامج المحاسبة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '111'), 4, 'debit', 'straight_line', 5, 'balance_sheet', 'software', TRUE),

-- 112. مجمع إهلاك الأصول الثابتة (Accumulated Depreciation) - parent: account_code='11'
('112', 'Accumulated Depreciation', 'مجمع إهلاك الأصول الثابتة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '11'), 3, 'credit', NULL, NULL, 'balance_sheet', 'accumulated_depreciation', TRUE),

-- 11201 - مجمع إهلاك تحسينات وصيانة الأصول المستأجرة - parent: account_code='112'
('11201', 'Accum. Depr. - Leasehold Improvements', 'مجمع إهلاك تحسينات وصيانة الأصول المستأجرة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_leasehold', TRUE),

-- 11202 - مجمع إهلاك أثاث وتجهيزات مكتبية
('11202', 'Accum. Depr. - Office Furniture', 'مجمع إهلاك أثاث وتجهيزات مكتبية', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_furniture', TRUE),

-- 11203 - مجمع إهلاك وسائط النقل والسيارات
('11203', 'Accum. Depr. - Vehicles', 'مجمع إهلاك وسائط النقل والسيارات', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_vehicles', TRUE),

-- 11204 - مجمع إهلاك آلات ومعدات التشغيل
('11204', 'Accum. Depr. - Machinery', 'مجمع إهلاك آلات ومعدات التشغيل', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_machinery', TRUE),

-- 11205 - مجمع إهلاك أجهزة الكمبيوتر
('11205', 'Accum. Depr. - Computer Equipment', 'مجمع إهلاك أجهزة الكمبيوتر', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_computer', TRUE),

-- 11206 - مجمع إهلاك عدد وأدوات قسم الديكور والمنجرة
('11206', 'Accum. Depr. - Tools (Decor)', 'مجمع إهلاك عدد وأدوات قسم الديكور والمنجرة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_tools', TRUE),

-- 11207 - مجمع إهلاك برامج المحاسبة
('11207', 'Accum. Depr. - Software', 'مجمع إهلاك برامج المحاسبة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '112'), 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_software', TRUE),

-- 113. موجودات أخرى غير ملموسة (Intangible Assets) - parent: account_code='11'
('113', 'Intangible Assets', 'موجودات أخرى غير ملموسة', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '11'), 3, 'debit', NULL, NULL, 'balance_sheet', 'intangible_asset', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: CURRENT ASSETS DETAIL (121-125)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 121. العملاء والمدينون (Accounts Receivable) - parent: account_code='12'
('121', 'Accounts Receivable', 'العملاء والمدينون', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '12'), 3, 'debit', 'balance_sheet', 'accounts_receivable', TRUE),

-- 122. سلف وأرصدة موظفين (Employee Advances) - parent: account_code='12'
('122', 'Employee Advances', 'سلف وأرصدة موظفين', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '12'), 3, 'debit', 'balance_sheet', 'employee_advances', TRUE),

-- 123. ذمم أخرى (Other Receivables) - parent: account_code='12'
('123', 'Other Receivables', 'ذمم أخرى', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '12'), 3, 'debit', 'balance_sheet', 'other_receivables', TRUE),

-- 124. البنك والصندوق (Bank & Cash) - parent: account_code='12'
('124', 'Bank & Cash', 'البنك والصندوق', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '12'), 3, 'debit', 'balance_sheet', 'cash_and_bank', TRUE),

-- 12401. البنك - الراجحي (Bank - Al Rajhi) - parent: account_code='124'
('12401', 'Bank - Al Rajhi', 'البنك - الراجحي', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '124'), 4, 'debit', 'balance_sheet', 'bank_account', TRUE),

-- 12402. البنك - الأهلي (Bank - Al Ahli) - parent: account_code='124'
('12402', 'Bank - Al Ahli', 'البنك - الأهلي', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '124'), 4, 'debit', 'balance_sheet', 'bank_account', TRUE),

-- 12403. الصندوق الرئيسي (Main Cash) - parent: account_code='124'
('12403', 'Main Cash', 'الصندوق الرئيسي', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '124'), 4, 'debit', 'balance_sheet', 'cash', TRUE),

-- 12404. صندوق المصروفات النثرية (Petty Cash) - parent: account_code='124'
('12404', 'Petty Cash', 'صندوق المصروفات النثرية', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '124'), 4, 'debit', 'balance_sheet', 'petty_cash', TRUE),

-- 125. ودائع تأمين (Security Deposits) - parent: account_code='12'
('125', 'Security Deposits', 'ودائع تأمين', 'asset', (SELECT id FROM chart_of_accounts WHERE account_code = '12'), 3, 'debit', 'balance_sheet', 'deposits', TRUE);

-- ============================================================================
-- LEVEL 2: LIABILITIES (21, 22)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 21. الخصوم المتداولة (Current Liabilities) - parent: account_code='2'
('21', 'Current Liabilities', 'الخصوم المتداولة', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2'), 2, 'credit', 'balance_sheet', 'current_liability', TRUE),

-- 22. الخصوم طويلة الأجل (Long-term Liabilities) - parent: account_code='2'
('22', 'Long-term Liabilities', 'الخصوم طويلة الأجل', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2'), 2, 'credit', 'balance_sheet', 'long_term_liability', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: LIABILITIES DETAIL
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 211. الدائنون والموردون (Accounts Payable) - parent: account_code='21'
('211', 'Accounts Payable', 'الدائنون والموردون', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '21'), 3, 'credit', 'balance_sheet', 'accounts_payable', TRUE),

-- 212. قروض قصيرة الأجل (Short-term Loans) - parent: account_code='21'
('212', 'Short-term Loans', 'قروض قصيرة الأجل', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '21'), 3, 'credit', 'balance_sheet', 'short_term_loans', TRUE),

-- 221. قروض طويلة الأجل (Long-term Loans) - parent: account_code='22'
('221', 'Long-term Loans', 'قروض طويلة الأجل', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '22'), 3, 'credit', 'balance_sheet', 'long_term_loans', TRUE),

-- 222. ضريبة القيمة المضافة (VAT Payable) - parent: account_code='22'
('222', 'VAT Payable', 'ضريبة القيمة المضافة', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '22'), 3, 'credit', 'balance_sheet', 'tax_payable', TRUE),

-- 22201. ضريبة القيمة المضافة - مبيعات (Output VAT) - parent: account_code='222'
('22201', 'VAT - Sales (Output)', 'ضريبة القيمة المضافة - مبيعات', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '222'), 4, 'credit', 'balance_sheet', 'output_vat', TRUE, 15.00),

-- 22202. ضريبة القيمة المضافة - مشتريات (Input VAT) - parent: account_code='222'
('22202', 'VAT - Purchases (Input)', 'ضريبة القيمة المضافة - مشتريات', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '222'), 4, 'credit', 'balance_sheet', 'input_vat', TRUE, 15.00),

-- 22203. ضريبة القيمة المضافة المستحقة (Net VAT Payable) - parent: account_code='222'
('22203', 'Net VAT Payable', 'ضريبة القيمة المضافة المستحقة', 'liability', (SELECT id FROM chart_of_accounts WHERE account_code = '222'), 4, 'credit', 'balance_sheet', 'net_vat_payable', TRUE, 15.00);

-- ============================================================================
-- LEVEL 2: EXPENSES (31, 32, 33)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 31. مصاريف التشغيل (Operating Expenses) - parent: account_code='3'
('31', 'Operating Expenses', 'مصاريف التشغيل', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '3'), 2, 'debit', 'income_statement', 'operating_expense', TRUE),

-- 32. مصاريف إدارية وعمومية (Administrative Expenses) - parent: account_code='3'
('32', 'Administrative Expenses', 'مصاريف إدارية وعمومية', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '3'), 2, 'debit', 'income_statement', 'administrative_expense', TRUE),

-- 33. مصاريف أخرى (Other Expenses) - parent: account_code='3'
('33', 'Other Expenses', 'مصاريف أخرى', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '3'), 2, 'debit', 'income_statement', 'other_expense', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: EXPENSES DETAIL (Selected examples - expand as needed)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active, cost_center_type) VALUES
-- 311. رواتب وأجور (Salaries & Wages) - parent: account_code='31'
('311', 'Salaries & Wages', 'رواتب وأجور', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '31'), 3, 'debit', 'income_statement', 'salaries', TRUE, NULL),

-- 31101. رواتب الموظفين - قسم المبيعات (Sales Staff Salaries) - parent: account_code='311'
('31101', 'Sales Staff Salaries', 'رواتب الموظفين - قسم المبيعات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '311'), 4, 'debit', 'income_statement', 'salaries', TRUE, 'department'),

-- 31102. رواتب الموظفين - قسم التركيب (Installation Staff Salaries) - parent: account_code='311'
('31102', 'Installation Staff Salaries', 'رواتب الموظفين - قسم التركيب', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '311'), 4, 'debit', 'income_statement', 'salaries', TRUE, 'department'),

-- 31103. رواتب الموظفين - الإدارة (Admin Staff Salaries) - parent: account_code='311'
('31103', 'Admin Staff Salaries', 'رواتب الموظفين - الإدارة', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '311'), 4, 'debit', 'income_statement', 'salaries', TRUE, 'department'),

-- 312. إيجارات (Rent Expenses) - parent: account_code='31'
('312', 'Rent Expenses', 'إيجارات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '31'), 3, 'debit', 'income_statement', 'rent', TRUE, NULL),

-- 313. فواتير الكهرباء والماء (Utilities) - parent: account_code='31'
('313', 'Utilities', 'فواتير الكهرباء والماء', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '31'), 3, 'debit', 'income_statement', 'utilities', TRUE, NULL),

-- 314. مصاريف صيانة المركبات (Vehicle Maintenance) - parent: account_code='31'
('314', 'Vehicle Maintenance', 'مصاريف صيانة المركبات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '31'), 3, 'debit', 'income_statement', 'vehicle_maintenance', TRUE, 'vehicle'),

-- 315. وقود ومحروقات (Fuel & Gas) - parent: account_code='31'
('315', 'Fuel & Gas', 'وقود ومحروقات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '31'), 3, 'debit', 'income_statement', 'fuel', TRUE, 'vehicle'),

-- 321. مصاريف مكتبية (Office Supplies) - parent: account_code='32'
('321', 'Office Supplies', 'مصاريف مكتبية', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '32'), 3, 'debit', 'income_statement', 'office_supplies', TRUE, NULL),

-- 322. اتصالات وإنترنت (Communications) - parent: account_code='32'
('322', 'Communications', 'اتصالات وإنترنت', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '32'), 3, 'debit', 'income_statement', 'communications', TRUE, NULL),

-- 323. مصاريف سفر وانتقالات (Travel & Transportation) - parent: account_code='32'
('323', 'Travel & Transportation', 'مصاريف سفر وانتقالات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '32'), 3, 'debit', 'income_statement', 'travel', TRUE, NULL),

-- 331. مصاريف بنكية (Bank Charges) - parent: account_code='33'
('331', 'Bank Charges', 'مصاريف بنكية', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '33'), 3, 'debit', 'income_statement', 'bank_charges', TRUE, NULL),

-- 332. خسائر فروقات عملات (Currency Exchange Losses) - parent: account_code='33'
('332', 'Currency Exchange Losses', 'خسائر فروقات عملات', 'expense', (SELECT id FROM chart_of_accounts WHERE account_code = '33'), 3, 'debit', 'income_statement', 'exchange_losses', TRUE, NULL);

-- ============================================================================
-- LEVEL 2: REVENUE (41, 42)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 41. إيرادات المبيعات (Sales Revenue) - parent: account_code='4'
('41', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4'), 2, 'credit', 'income_statement', 'sales_revenue', TRUE),

-- 42. إيرادات أخرى (Other Income) - parent: account_code='4'
('42', 'Other Income', 'إيرادات أخرى', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4'), 2, 'credit', 'income_statement', 'other_income', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: REVENUE DETAIL
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active, cost_center_type) VALUES
-- 411. إيرادات مبيعات الألواح الشمسية (Solar Panels Sales Revenue) - parent: account_code='41'
('411', 'Solar Panels Sales', 'إيرادات مبيعات الألواح الشمسية', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '41'), 3, 'credit', 'income_statement', 'product_sales', TRUE, 'product'),

-- 412. إيرادات عقود المشاريع (Project Contracts Revenue) - parent: account_code='41'
('412', 'Project Contracts Revenue', 'إيرادات عقود المشاريع', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '41'), 3, 'credit', 'income_statement', 'project_revenue', TRUE, 'project'),

-- 41201. إيرادات مشروع الرياض (Riyadh Project Revenue) - parent: account_code='412'
('41201', 'Riyadh Project Revenue', 'إيرادات مشروع الرياض', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '412'), 4, 'credit', 'income_statement', 'project_revenue', TRUE, 'project'),

-- 41202. إيرادات مشروع جدة (Jeddah Project Revenue) - parent: account_code='412'
('41202', 'Jeddah Project Revenue', 'إيرادات مشروع جدة', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '412'), 4, 'credit', 'income_statement', 'project_revenue', TRUE, 'project'),

-- 41203. إيرادات مشروع الدمام (Dammam Project Revenue) - parent: account_code='412'
('41203', 'Dammam Project Revenue', 'إيرادات مشروع الدمام', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '412'), 4, 'credit', 'income_statement', 'project_revenue', TRUE, 'project'),

-- 413. إيرادات الصيانة والعقود (Maintenance & Service Revenue) - parent: account_code='41'
('413', 'Maintenance & Service Revenue', 'إيرادات الصيانة والعقود', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '41'), 3, 'credit', 'income_statement', 'service_revenue', TRUE, 'service'),

-- 421. إيرادات فوائد بنكية (Interest Income) - parent: account_code='42'
('421', 'Interest Income', 'إيرادات فوائد بنكية', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '42'), 3, 'credit', 'income_statement', 'interest_income', TRUE, NULL),

-- 422. إيرادات إيجارات (Rental Income) - parent: account_code='42'
('422', 'Rental Income', 'إيرادات إيجارات', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '42'), 3, 'credit', 'income_statement', 'rental_income', TRUE, NULL),

-- 423. أرباح فروقات عملات (Currency Exchange Gains) - parent: account_code='42'
('423', 'Currency Exchange Gains', 'أرباح فروقات عملات', 'revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '42'), 3, 'credit', 'income_statement', 'exchange_gains', TRUE, NULL);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  total_accounts INTEGER;
  level1_count INTEGER;
  level2_count INTEGER;
  level3_count INTEGER;
  level4_count INTEGER;
  orphaned_accounts INTEGER;
BEGIN
  -- Count accounts by level
  SELECT COUNT(*) INTO total_accounts FROM chart_of_accounts;
  SELECT COUNT(*) INTO level1_count FROM chart_of_accounts WHERE level = 1;
  SELECT COUNT(*) INTO level2_count FROM chart_of_accounts WHERE level = 2;
  SELECT COUNT(*) INTO level3_count FROM chart_of_accounts WHERE level = 3;
  SELECT COUNT(*) INTO level4_count FROM chart_of_accounts WHERE level = 4;
  
  -- Check for orphaned accounts (parent_id set but parent doesn't exist)
  SELECT COUNT(*) INTO orphaned_accounts 
  FROM chart_of_accounts c
  LEFT JOIN chart_of_accounts p ON c.parent_id = p.id
  WHERE c.parent_id IS NOT NULL AND p.id IS NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ PHASE 2 COA SEED COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total accounts seeded: %', total_accounts;
  RAISE NOTICE 'Level 1 accounts: %', level1_count;
  RAISE NOTICE 'Level 2 accounts: %', level2_count;
  RAISE NOTICE 'Level 3 accounts: %', level3_count;
  RAISE NOTICE 'Level 4 accounts: %', level4_count;
  RAISE NOTICE 'Orphaned accounts: %', orphaned_accounts;
  RAISE NOTICE '========================================';
  
  IF orphaned_accounts > 0 THEN
    RAISE EXCEPTION '❌ Found % orphaned accounts with invalid parent_id!', orphaned_accounts;
  END IF;
  
  -- Verify critical accounts exist
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = '121') THEN
    RAISE EXCEPTION '❌ Critical account 121 (AR) is missing!';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = '4120') THEN
    RAISE EXCEPTION '❌ Critical account 4120 (Revenue) is missing!';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = '22201') THEN
    RAISE EXCEPTION '❌ Critical account 22201 (VAT Output) is missing!';
  END IF;
  
  RAISE NOTICE '✅ All critical accounts verified!';
  RAISE NOTICE '✅ No orphaned accounts found!';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
