-- ============================================================================
-- PHASE 2: Complete Chart of Accounts Migration
-- Source: دليل ومتطلبات حسابات شركة الطاقة الذكية.md
-- Total Accounts: 100+ with 4-level hierarchy
-- Date: 2026-04-06
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
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 11. الأصول الثابتة (Fixed Assets)
('11', 'Fixed Assets', 'الأصول الثابتة', 'asset', 1, 2, 'debit', 'balance_sheet', 'fixed_asset', TRUE),

-- 12. الأصول المتداولة (Current Assets)
('12', 'Current Assets', 'الأصول المتداولة', 'asset', 1, 2, 'debit', 'balance_sheet', 'current_asset', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: FIXED ASSETS DETAIL (111, 112, 113)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, depreciation_method, useful_life_years, financial_statement, report_category, is_active) VALUES
-- 111. الموجودات الثابتة (Tangible Fixed Assets)
('111', 'Tangible Fixed Assets', 'الموجودات الثابتة', 'asset', 2, 3, 'debit', NULL, NULL, 'balance_sheet', 'tangible_fixed_asset', TRUE),

-- 11101 - صيانة وتعديلات المباني المستأجرة
('11101', 'Leasehold Improvements', 'صيانة وتعديلات المباني المستأجرة', 'asset', 5, 4, 'debit', 'straight_line', 10, 'balance_sheet', 'leasehold_improvement', TRUE),

-- 11102 - أثاث وتجهيزات مكتبية
('11102', 'Office Furniture & Equipment', 'أثاث وتجهيزات مكتبية', 'asset', 5, 4, 'debit', 'straight_line', 7, 'balance_sheet', 'furniture', TRUE),

-- 11103 - وسائط النقل والسيارات
('11103', 'Vehicles & Transportation', 'وسائط النقل والسيارات', 'asset', 5, 4, 'debit', 'straight_line', 5, 'balance_sheet', 'vehicles', TRUE),

-- 11104 - آلات ومعدات التشغيل
('11104', 'Operating Machinery & Equipment', 'آلات ومعدات التشغيل', 'asset', 5, 4, 'debit', 'straight_line', 10, 'balance_sheet', 'machinery', TRUE),

-- 11105 - تجهيزات الكمبيوتر
('11105', 'Computer Equipment', 'تجهيزات الكمبيوتر', 'asset', 5, 4, 'debit', 'straight_line', 3, 'balance_sheet', 'computer_equipment', TRUE),

-- 11106 - العدد والأدوات
('11106', 'Tools & Equipment', 'العدد والأدوات', 'asset', 5, 4, 'debit', 'straight_line', 5, 'balance_sheet', 'tools', TRUE),

-- 11107 - برامج المحاسبة
('11107', 'Accounting Software', 'برامج المحاسبة', 'asset', 5, 4, 'debit', 'straight_line', 5, 'balance_sheet', 'software', TRUE),

-- 112. مجمع إهلاك الأصول الثابتة (Accumulated Depreciation)
('112', 'Accumulated Depreciation', 'مجمع إهلاك الأصول الثابتة', 'asset', 2, 3, 'credit', NULL, NULL, 'balance_sheet', 'accumulated_depreciation', TRUE),

-- 11201 - مجمع إهلاك تحسينات وصيانة الأصول المستأجرة
('11201', 'Accum. Depr. - Leasehold Improvements', 'مجمع إهلاك تحسينات وصيانة الأصول المستأجرة', 'asset', 14, 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_leasehold', TRUE),

-- 11202 - مجمع إهلاك أثاث وتجهيزات مكتبية
('11202', 'Accum. Depr. - Office Furniture', 'مجمع إهلاك أثاث وتجهيزات مكتبية', 'asset', 14, 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_furniture', TRUE),

-- 11203 - مجمع إهلاك وسائط النقل والسيارات
('11203', 'Accum. Depr. - Vehicles', 'مجمع إهلاك وسائط النقل والسيارات', 'asset', 14, 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_vehicles', TRUE),

-- 11204 - مجمع إهلاك آلات ومعدات التشغيل
('11204', 'Accum. Depr. - Machinery', 'مجمع إهلاك آلات ومعدات التشغيل', 'asset', 14, 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_machinery', TRUE),

-- 11205 - مجمع إهلاك أجهزة الكمبيوتر
('11205', 'Accum. Depr. - Computer Equipment', 'مجمع إهلاك أجهزة الكمبيوتر', 'asset', 14, 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_computer', TRUE),

-- 11206 - مجمع إهلاك عدد وأدوات قسم الديكور والمنجرة
('11206', 'Accum. Depr. - Tools (Decor)', 'مجمع إهلاك عدد وأدوات قسم الديكور والمنجرة', 'asset', 14, 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_tools', TRUE),

-- 11207 - مجمع إهلاك برامج المحاسبة
('11207', 'Accum. Depr. - Software', 'مجمع إهلاك برامج المحاسبة', 'asset', 14, 4, 'credit', NULL, NULL, 'balance_sheet', 'accum_depr_software', TRUE),

-- 113. موجودات أخرى غير ملموسة (Intangible Assets)
('113', 'Intangible Assets', 'موجودات أخرى غير ملموسة', 'asset', 2, 3, 'debit', NULL, NULL, 'balance_sheet', 'intangible_asset', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: CURRENT ASSETS DETAIL (121-125)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, cost_center_type, linked_entity_id, financial_statement, report_category, is_active) VALUES
-- 121. العملاء (Customers/Receivables)
('121', 'Accounts Receivable', 'العملاء', 'asset', 3, 3, 'debit', NULL, NULL, 'balance_sheet', 'receivables', TRUE),

-- 12101. العملاء المحليون (Local Customers)
('12101', 'Local Customers', 'العملاء المحليون', 'asset', 28, 4, 'debit', NULL, NULL, 'balance_sheet', 'local_receivables', TRUE),

-- 1210101 - شركة هواوي تك انفستمنت العربية السعودية المحدودة
('1210101', 'Huawei Tech Investment Saudi Arabia Ltd', 'شركة هواوي تك انفستمنت العربية السعودية المحدودة', 'asset', 29, 5, 'debit', 'project', NULL, 'balance_sheet', 'customer_ledger', TRUE),

-- 12102. العملاء الخارجيون (Foreign Customers)
('12102', 'Foreign Customers', 'العملاء الخارجيون', 'asset', 28, 4, 'debit', NULL, NULL, 'balance_sheet', 'foreign_receivables', TRUE),

-- 1210201 - Xiaomi H.K. Limited
('1210201', 'Xiaomi H.K. Limited', 'شاومي هونج كونج المحدودة', 'asset', 31, 5, 'debit', 'project', NULL, 'balance_sheet', 'customer_ledger', TRUE),

-- 122. أرصدة مدينة أخرى (Other Receivables)
('122', 'Other Receivables', 'أرصدة مدينة أخرى', 'asset', 3, 3, 'debit', NULL, NULL, 'balance_sheet', 'other_receivables', TRUE),

-- 1221. سلف نقدية للموظفين (Employee Advances)
('1221', 'Employee Cash Advances', 'سلف نقدية للموظفين', 'asset', 33, 4, 'debit', 'employee', NULL, 'balance_sheet', 'employee_advances', TRUE),

-- 122101 - سلفة نقدية - موظف 1
('122101', 'Cash Advance - Employee 1', 'سلفة نقدية - موظف 1', 'asset', 34, 5, 'debit', 'employee', NULL, 'balance_sheet', 'employee_advance_detail', TRUE),

-- 1222. مدينون متنوعون (Miscellaneous Debtors)
('1222', 'Miscellaneous Debtors', 'مدينون متنوعون', 'asset', 33, 4, 'debit', NULL, NULL, 'balance_sheet', 'misc_debtors', TRUE),

-- 122201 - مؤسسة التوسع الحديثة للتجارة - مكة
('122201', 'Al-Tawasul Modern Trading - Makkah', 'مؤسسة التوسع الحديثة للتجارة - مكة', 'asset', 36, 5, 'debit', NULL, NULL, 'balance_sheet', 'debtor_ledger', TRUE),

-- 1223. عهد - مشاريع (Project Custody)
('1223', 'Project Custody', 'عهد - مشاريع', 'asset', 33, 4, 'debit', 'project', NULL, 'balance_sheet', 'project_custody', TRUE),

-- 122301 - عهدة - إمام الشيخ
('122301', 'Custody - Imam Al-Sheikh', 'عهدة - إمام الشيخ', 'asset', 38, 5, 'debit', 'employee', NULL, 'balance_sheet', 'custody_detail', TRUE),

-- 123. نقدية بالصندوق ولدى البنوك (Cash & Bank)
('123', 'Cash & Bank', 'نقدية بالصندوق ولدى البنوك', 'asset', 3, 3, 'debit', NULL, NULL, 'balance_sheet', 'cash_bank', TRUE),

-- 12301. الصندوق (Petty Cash)
('12301', 'Petty Cash', 'الصندوق', 'asset', 40, 4, 'debit', NULL, NULL, 'balance_sheet', 'petty_cash', TRUE),

-- 12302. البنوك (Banks)
('12302', 'Bank Accounts', 'البنوك', 'asset', 40, 4, 'debit', NULL, NULL, 'balance_sheet', 'bank_accounts', TRUE),

-- 1230201 - الفرنسي - حساب 86858100107
('1230201', 'Banque Saudi Fransi - Acc 86858100107', 'الفرنسي - حساب 86858100107', 'asset', 42, 5, 'debit', NULL, NULL, 'balance_sheet', 'bank_account_detail', TRUE),

-- 12303. عهدة نقدية - إدارية (Administrative Custody)
('12303', 'Administrative Cash Custody', 'عهدة نقدية - إدارية', 'asset', 40, 4, 'debit', 'employee', NULL, 'balance_sheet', 'admin_custody', TRUE),

-- 1230301 - عهدة - ماجد
('1230301', 'Custody - Majed', 'عهدة - ماجد', 'asset', 44, 5, 'debit', 'employee', NULL, 'balance_sheet', 'custody_detail', TRUE),

-- 124. مصاريف مدفوعة مقدماً (Prepaid Expenses)
('124', 'Prepaid Expenses', 'مصاريف مدفوعة مقدماً', 'asset', 3, 3, 'debit', NULL, NULL, 'balance_sheet', 'prepaid_expenses', TRUE),

-- 12401 - إيجار مقدم - مباني مستأجرة
('12401', 'Prepaid Rent - Leased Buildings', 'إيجار مقدم - مباني مستأجرة', 'asset', 46, 4, 'debit', NULL, NULL, 'balance_sheet', 'prepaid_rent', TRUE),

-- 125. مشاريع تحت التنفيذ / المخزون (WIP / Inventory)
('125', 'Work in Progress & Inventory', 'مشاريع تحت التنفيذ والمخزون', 'asset', 3, 3, 'debit', 'project', NULL, 'balance_sheet', 'wip_inventory', TRUE),

-- 12501 - مشروع طاقة شمسية 1
('12501', 'Solar Energy Project 1', 'مشروع طاقة شمسية 1', 'asset', 48, 4, 'debit', 'project', NULL, 'balance_sheet', 'project_wip', TRUE),

-- 12502 - مخزون مواد طاقة شمسية
('12502', 'Solar Materials Inventory', 'مخزون مواد طاقة شمسية', 'asset', 48, 4, 'debit', NULL, NULL, 'balance_sheet', 'inventory', TRUE);

-- ============================================================================
-- LEVEL 2: LIABILITIES SUB-CATEGORIES (22, 23, 24)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 22. المطالبات المتداولة (Current Liabilities)
('22', 'Current Liabilities', 'المطالبات المتداولة', 'liability', 2, 2, 'credit', 'balance_sheet', 'current_liability', TRUE),

-- 23. المطالبات غير المتداولة (Non-Current Liabilities)
('23', 'Non-Current Liabilities', 'المطالبات غير المتداولة', 'liability', 2, 2, 'credit', 'balance_sheet', 'long_term_liability', TRUE),

-- 24. حقوق الملكية (Equity)
('24', 'Equity', 'حقوق الملكية', 'equity', 2, 2, 'credit', 'balance_sheet', 'equity', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: CURRENT LIABILITIES DETAIL (220-224)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, is_vat_applicable, vat_rate, financial_statement, report_category, is_active) VALUES
-- 220. الموردين (Suppliers/Payables)
('220', 'Accounts Payable', 'الموردين', 'liability', 51, 3, 'credit', FALSE, 15.00, 'balance_sheet', 'payables', TRUE),

-- 2201. الموردون المحليون (Local Suppliers)
('2201', 'Local Suppliers', 'الموردون المحليون', 'liability', 54, 4, 'credit', FALSE, 15.00, 'balance_sheet', 'local_payables', TRUE),

-- 220101 - مورد - شركة أرضيات والمفروشات
('220101', 'Supplier - Ardhiyat & Furniture Co', 'مورد - شركة أرضيات والمفروشات', 'liability', 55, 5, 'credit', FALSE, 15.00, 'balance_sheet', 'supplier_ledger', TRUE),

-- 2202. الموردون الخارجيون (Foreign Suppliers)
('2202', 'Foreign Suppliers', 'الموردون الخارجيون', 'liability', 54, 4, 'credit', FALSE, 15.00, 'balance_sheet', 'foreign_payables', TRUE),

-- 220201 - شركة الجزيرة للتجارة والصناعة
('220201', 'Al-Jazira Trading & Industry Co', 'شركة الجزيرة للتجارة والصناعة', 'liability', 57, 5, 'credit', FALSE, 15.00, 'balance_sheet', 'supplier_ledger', TRUE),

-- 221. دائنون مختلفون (Miscellaneous Creditors)
('221', 'Miscellaneous Creditors', 'دائنون مختلفون', 'liability', 51, 3, 'credit', FALSE, 15.00, 'balance_sheet', 'misc_creditors', TRUE),

-- 22101 - شركة بوبا العربية للتأمين التعاوني
('22101', 'Bupa Arabian Cooperative Insurance', 'شركة بوبا العربية للتأمين التعاوني', 'liability', 59, 4, 'credit', FALSE, 15.00, 'balance_sheet', 'creditor_ledger', TRUE),

-- 222. الحسابات الضريبية (Tax Accounts)
('222', 'Tax Accounts', 'الحسابات الضريبية', 'liability', 51, 3, 'credit', FALSE, 15.00, 'balance_sheet', 'tax_payable', TRUE),

-- 22201. ضريبة القيمة المضافة (VAT)
('22201', 'Value Added Tax', 'ضريبة القيمة المضافة', 'liability', 61, 4, 'credit', TRUE, 15.00, 'balance_sheet', 'vat', TRUE),

-- 2220101 - ضريبة القيمة المضافة - مبيعات (Output VAT)
('2220101', 'VAT - Sales (Output)', 'ضريبة القيمة المضافة - مبيعات', 'liability', 62, 5, 'credit', TRUE, 15.00, 'balance_sheet', 'output_vat', TRUE),

-- 2220102 - ضريبة القيمة المضافة - مشتريات (Input VAT)
('2220102', 'VAT - Purchases (Input)', 'ضريبة القيمة المضافة - مشتريات', 'liability', 62, 5, 'credit', TRUE, 15.00, 'balance_sheet', 'input_vat', TRUE),

-- 2220103 - صافي ضريبة القيمة المضافة المستحق (Net VAT Payable)
('2220103', 'Net VAT Payable', 'صافي ضريبة القيمة المضافة المستحق', 'liability', 62, 5, 'credit', TRUE, 15.00, 'balance_sheet', 'net_vat', TRUE),

-- 223. مستحقات ومقدمات (Accruals & Advances)
('223', 'Accruals & Advances', 'مستحقات ومقدمات', 'liability', 51, 3, 'credit', FALSE, 15.00, 'balance_sheet', 'accruals', TRUE),

-- 22301 - مصاريف الرواتب مستحقة
('22301', 'Accrued Salaries', 'مصاريف الرواتب مستحقة', 'liability', 66, 4, 'credit', FALSE, 15.00, 'balance_sheet', 'accrued_salaries', TRUE),

-- 22302 - مستحقات مراجعة مالية واستشارات متفرقة
('22302', 'Accrued Audit & Consulting Fees', 'مستحقات مراجعة مالية واستشارات متفرقة', 'liability', 66, 4, 'credit', FALSE, 15.00, 'balance_sheet', 'accrued_fees', TRUE),

-- 22303 - مخصص الزكاة الشرعية
('22303', 'Zakat Provision', 'مخصص الزكاة الشرعية', 'liability', 66, 4, 'credit', FALSE, 15.00, 'balance_sheet', 'zakat_provision', TRUE),

-- 224. مخصصات واحتياطيات (Provisions & Reserves)
('224', 'Provisions & Reserves', 'مخصصات واحتياطيات', 'liability', 51, 3, 'credit', FALSE, 15.00, 'balance_sheet', 'provisions', TRUE),

-- 22401 - مخصص بدل إجازة - مستحق
('22401', 'Accrued Leave Allowance', 'مخصص بدل إجازة - مستحق', 'liability', 70, 4, 'credit', FALSE, 15.00, 'balance_sheet', 'leave_provision', TRUE),

-- 22402 - مخصص بدل تذاكر - مستحق
('22402', 'Accrued Ticket Allowance', 'مخصص بدل تذاكر - مستحق', 'liability', 70, 4, 'credit', FALSE, 15.00, 'balance_sheet', 'ticket_provision', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: NON-CURRENT LIABILITIES (231-233)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 231. القروض طويلة الأجل (Long-term Loans)
('231', 'Long-term Loans', 'القروض طويلة الأجل', 'liability', 52, 3, 'credit', 'balance_sheet', 'long_term_loans', TRUE),

-- 23101 - قرض رقم 1
('23101', 'Loan #1', 'قرض رقم 1', 'liability', 73, 4, 'credit', 'balance_sheet', 'loan_detail', TRUE),

-- 232. مستحقات أخرى طويلة الأجل (Other Long-term Payables)
('232', 'Other Long-term Payables', 'مستحقات أخرى طويلة الأجل', 'liability', 52, 3, 'credit', 'balance_sheet', 'long_term_payables', TRUE),

-- 23201 - مستحقات مكافأة نهاية الخدمة
('23201', 'End of Service Benefits', 'مستحقات مكافأة نهاية الخدمة', 'liability', 75, 4, 'credit', 'balance_sheet', 'eosb_provision', TRUE),

-- 233. الحسابات الجارية (Partners Current Accounts)
('233', 'Partners Current Accounts', 'الحسابات الجارية', 'liability', 52, 3, 'credit', 'balance_sheet', 'partners_current', TRUE),

-- 23301 - جاري الشريك عبد
('23301', 'Partner Abdul Current Account', 'جاري الشريك عبد', 'liability', 77, 4, 'credit', 'balance_sheet', 'partner_current', TRUE),

-- 23302 - جاري الشريك أمير
('23302', 'Partner Amir Current Account', 'جاري الشريك أمير', 'liability', 77, 4, 'credit', 'balance_sheet', 'partner_current', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: EQUITY (241-243)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 241. رأس المال (Capital)
('241', 'Capital', 'رأس المال', 'equity', 53, 3, 'credit', 'balance_sheet', 'capital', TRUE),

-- 24101 - رأس مال الشريك عبد
('24101', 'Partner Abdul Capital', 'رأس مال الشريك عبد', 'equity', 80, 4, 'credit', 'balance_sheet', 'partner_capital', TRUE),

-- 24102 - رأس مال الشريك أمير
('24102', 'Partner Amir Capital', 'رأس مال الشريك أمير', 'equity', 80, 4, 'credit', 'balance_sheet', 'partner_capital', TRUE),

-- 242. أرباح وخسائر (Retained Earnings)
('242', 'Retained Earnings', 'أرباح وخسائر', 'equity', 53, 3, 'credit', 'balance_sheet', 'retained_earnings', TRUE),

-- 24201 - أرباح وخسائر مدورة
('24201', 'Accumulated Retained Earnings', 'أرباح وخسائر مدورة', 'equity', 83, 4, 'credit', 'balance_sheet', 'accumulated_earnings', TRUE),

-- 243. احتياطيات (Reserves)
('243', 'Reserves', 'احتياطيات', 'equity', 53, 3, 'credit', 'balance_sheet', 'reserves', TRUE),

-- 24301 - احتياطي نظامي
('24301', 'Statutory Reserve', 'احتياطي نظامي', 'equity', 85, 4, 'credit', 'balance_sheet', 'statutory_reserve', TRUE);

-- ============================================================================
-- LEVEL 2 & 3: EXPENSES - DIRECT COSTS (31)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, cost_center_type, financial_statement, report_category, is_active) VALUES
-- 31. تكلفة المبيعات المباشرة (Cost of Sales)
('31', 'Cost of Sales', 'تكلفة المبيعات المباشرة', 'expense', 3, 2, 'debit', NULL, 'income_statement', 'cost_of_sales', TRUE),

-- 311. المصاريف المباشرة (Direct Expenses)
('311', 'Direct Expenses', 'المصاريف المباشرة', 'expense', 88, 3, 'debit', 'project', 'income_statement', 'direct_expense', TRUE),

-- 3111. المصاريف التشغيلية (Operating Expenses)
('3111', 'Operating Expenses', 'المصاريف التشغيلية', 'expense', 89, 4, 'debit', 'project', 'income_statement', 'operating_direct', TRUE);

-- ============================================================================
-- LEVEL 4 & 5: OPERATING DIRECT EXPENSES (311102-311190)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, cost_center_type, linked_entity_id, financial_statement, report_category, is_active) VALUES
-- 311102 - طعام عمال وقت العمل الإضافي
('311102', 'Overtime Worker Meals', 'طعام عمال وقت العمل الإضافي', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'worker_meals', TRUE),

-- 311103 - العدد والأدوات اليدوية المستهلكة
('311103', 'Consumable Hand Tools', 'العدد والأدوات اليدوية المستهلكة', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'consumable_tools', TRUE),

-- 311104 - أجور قص وتشكيل معادن
('311104', 'Metal Cutting & Forming Wages', 'أجور قص وتشكيل معادن', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'metal_work_wages', TRUE),

-- 311105 - مواد الدهان والبويات
('311105', 'Paint & Coating Materials', 'مواد الدهان والبويات', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'paint_materials', TRUE),

-- 311106 - حديد وقطع معدنية
('311106', 'Steel & Metal Parts', 'حديد وقطع معدنية', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'steel_materials', TRUE),

-- 311107 - أجور سكن رحلات خارجية
('311107', 'External Trip Accommodation', 'أجور سكن رحلات خارجية', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'accommodation', TRUE),

-- 311108 - براغي ومسامير
('311108', 'Bolts & Screws', 'براغي ومسامير', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'fasteners', TRUE),

-- 311110 - مواد كهرباء وإضاءة
('311110', 'Electrical & Lighting Materials', 'مواد كهرباء وإضاءة', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'electrical_materials', TRUE),

-- 311111 - يوميات وأجور عمال خارجيين
('311111', 'External Workers Daily Wages', 'يوميات وأجور عمال خارجيين', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'external_labor', TRUE),

-- 311112 - إيجار معدات ورافعات وسقالات
('311112', 'Equipment & Crane Rental', 'إيجار معدات ورافعات وسقالات', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'equipment_rental', TRUE),

-- 311113 - مواد تعبئة وتغليف
('311113', 'Packaging Materials', 'مواد تعبئة وتغليف', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'packaging', TRUE),

-- 311114 - سيليكون ومواد لاصقة
('311114', 'Silicone & Adhesives', 'سيليكون ومواد لاصقة', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'adhesives', TRUE),

-- 311116 - تيوبات ومقاطع ألمنيوم
('311116', 'Aluminum Tubes & Profiles', 'تيوبات ومقاطع ألمنيوم', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'aluminum_materials', TRUE),

-- 311117 - مواد أخشاب
('311117', 'Wood Materials', 'مواد أخشاب', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'wood_materials', TRUE),

-- 311118 - مواد بناء
('311118', 'Construction Materials', 'مواد بناء', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'construction_materials', TRUE),

-- 311119 - مواد إكسسوارات - للعميل
('311119', 'Customer Accessories', 'مواد إكسسوارات - للعميل', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'accessories', TRUE),

-- 311121 - صيانة وقطع غيار للمكائن والطابعات
('311121', 'Machine & Printer Maintenance', 'صيانة وقطع غيار للمكائن والطابعات', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'machine_maintenance', TRUE),

-- 311122 - تكاليف وأجور تصنيع أعمال خارجية
('311122', 'External Manufacturing Costs', 'تكاليف وأجور تصنيع أعمال خارجية', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'external_manufacturing', TRUE),

-- 311124 - محروقات السيارات (Vehicle Fuel)
('311124', 'Vehicle Fuel', 'محروقات السيارات', 'expense', 90, 5, 'debit', 'vehicle', NULL, 'income_statement', 'vehicle_fuel', TRUE);

-- ============================================================================
-- LEVEL 5: VEHICLE-SPECIFIC FUEL ACCOUNTS
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, cost_center_type, linked_entity_id, financial_statement, report_category, is_active) VALUES
-- 31112403 - محروقات ايسوزو بكب 2011 / لوحة 5636
('31112403', 'Fuel - Isuzu Pickup 2011 / Plate 5636', 'محروقات ايسوزو بكب 2011 / لوحة 5636', 'expense', 112, 6, 'debit', 'vehicle', NULL, 'income_statement', 'vehicle_fuel_detail', TRUE),

-- 31112404 - محروقات ايسوزو بكب 2013 / لوحة 7445
('31112404', 'Fuel - Isuzu Pickup 2013 / Plate 7445', 'محروقات ايسوزو بكب 2013 / لوحة 7445', 'expense', 112, 6, 'debit', 'vehicle', NULL, 'income_statement', 'vehicle_fuel_detail', TRUE),

-- 311125 - صيانة السيارات (Vehicle Maintenance)
('311125', 'Vehicle Maintenance', 'صيانة السيارات', 'expense', 90, 5, 'debit', 'vehicle', NULL, 'income_statement', 'vehicle_maintenance', TRUE),

-- 31112503 - صيانة ايسوزو بكب 2011
('31112503', 'Maintenance - Isuzu Pickup 2011', 'صيانة ايسوزو بكب 2011', 'expense', 115, 6, 'debit', 'vehicle', NULL, 'income_statement', 'vehicle_maint_detail', TRUE),

-- 31112504 - صيانة ايسوزو بكب 2013
('31112504', 'Maintenance - Isuzu Pickup 2013', 'صيانة ايسوزو بكب 2013', 'expense', 115, 6, 'debit', 'vehicle', NULL, 'income_statement', 'vehicle_maint_detail', TRUE),

-- 311126 - رسوم حكومية سيارات (Vehicle Government Fees)
('311126', 'Vehicle Government Fees', 'رسوم حكومية سيارات', 'expense', 90, 5, 'debit', 'vehicle', NULL, 'income_statement', 'vehicle_fees', TRUE),

-- 31112603 - رسوم ايسوزو بكب 2011
('31112603', 'Fees - Isuzu Pickup 2011', 'رسوم ايسوزو بكب 2011', 'expense', 118, 6, 'debit', 'vehicle', NULL, 'income_statement', 'vehicle_fees_detail', TRUE),

-- 31112604 - رسوم ايسوزو بكب 2013
('31112604', 'Fees - Isuzu Pickup 2013', 'رسوم ايسوزو بكب 2013', 'expense', 118, 6, 'debit', 'vehicle', NULL, 'income_statement', 'vehicle_fees_detail', TRUE),

-- Remaining operating expenses
('311127', 'Tips & Gratuities', 'إكراميات', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'tips', TRUE),
('311128', 'Plumbing Materials', 'مواد سباكة', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'plumbing_materials', TRUE),
('311130', 'Decor Dept Tool Maintenance', 'صيانة عدد وأدوات قسم الديكور', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'decor_tool_maintenance', TRUE),
('311131', 'Rental Accessories', 'مواد إكسسوارات - تأجير', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'rental_accessories', TRUE),
('311132', 'Freight & Loading', 'شحن وتحميل البضائع', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'freight', TRUE),
('311134', 'External Storage Rent', 'إيجار تخزين لدى الغير', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'storage_rent', TRUE),
('311135', 'Business Travel Tickets', 'تذاكر سفر - عمل', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'travel_tickets', TRUE),
('311190', 'Miscellaneous Project Expenses', 'مصاريف مشاريع مختلفة', 'expense', 90, 5, 'debit', 'project', NULL, 'income_statement', 'misc_project', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: DIRECT MATERIALS & PURCHASES (312)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, is_vat_applicable, vat_rate, financial_statement, report_category, is_active) VALUES
-- 312. مواد مباشرة (Direct Materials)
('312', 'Direct Materials', 'مواد مباشرة', 'expense', 88, 3, 'debit', FALSE, 15.00, 'income_statement', 'direct_materials', TRUE),

-- 3121. صافي المشتريات (Net Purchases)
('3121', 'Net Purchases', 'صافي المشتريات', 'expense', 128, 4, 'debit', TRUE, 15.00, 'income_statement', 'purchases', TRUE),

-- 31211 - مشتريات المواد
('31211', 'Material Purchases', 'مشتريات المواد', 'expense', 129, 5, 'debit', TRUE, 15.00, 'income_statement', 'material_purchases', TRUE),

-- 31212 - مرتجع مشتريات
('31212', 'Purchase Returns', 'مرتجع مشتريات', 'expense', 129, 5, 'credit', TRUE, 15.00, 'income_statement', 'purchase_returns', TRUE),

-- 31214 - الحسم المكتسب
('31214', 'Purchase Discounts Received', 'الحسم المكتسب', 'expense', 129, 5, 'credit', FALSE, 15.00, 'income_statement', 'purchase_discounts', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: SALARIES & WAGES (313)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, cost_center_type, financial_statement, report_category, is_active) VALUES
-- 313. الرواتب والبدلات (Salaries & Allowances)
('313', 'Salaries & Allowances', 'الرواتب والبدلات', 'expense', 88, 3, 'debit', 'department', 'income_statement', 'salaries', TRUE),

-- 3131. الرواتب والأجور التشغيلية (Operating Salaries)
('3131', 'Operating Salaries', 'الرواتب والأجور التشغيلية', 'expense', 134, 4, 'debit', 'department', 'income_statement', 'operating_salaries', TRUE),

-- 313101 - رواتب قسم المبيعات
('313101', 'Sales Department Salaries', 'رواتب قسم المبيعات', 'expense', 135, 5, 'debit', 'department', 'income_statement', 'sales_salaries', TRUE),

-- 313102 - رواتب قسم التصميم
('313102', 'Design Department Salaries', 'رواتب قسم التصميم', 'expense', 135, 5, 'debit', 'department', 'income_statement', 'design_salaries', TRUE),

-- 313103 - رواتب قسم التنفيذ
('313103', 'Execution Department Salaries', 'رواتب قسم التنفيذ', 'expense', 135, 5, 'debit', 'department', 'income_statement', 'execution_salaries', TRUE),

-- 3132. البدلات (Allowances)
('3132', 'Allowances', 'البدلات', 'expense', 134, 4, 'debit', 'department', 'income_statement', 'allowances', TRUE),

-- 31321 - بدل إجازة ونهاية الخدمة
('31321', 'Leave & EOSB Allowance', 'بدل إجازة ونهاية الخدمة', 'expense', 140, 5, 'debit', 'department', 'income_statement', 'leave_allowance', TRUE),

-- 31322. بدل سكن (Housing Allowance)
('31322', 'Housing Allowance', 'بدل سكن', 'expense', 140, 5, 'debit', 'department', 'income_statement', 'housing_allowance', TRUE),

-- 313221 - بدل سكن قسم المبيعات
('313221', 'Sales Dept Housing Allowance', 'بدل سكن قسم المبيعات', 'expense', 142, 6, 'debit', 'department', 'income_statement', 'sales_housing', TRUE),

-- 313222 - بدل سكن قسم التصميم
('313222', 'Design Dept Housing Allowance', 'بدل سكن قسم التصميم', 'expense', 142, 6, 'debit', 'department', 'income_statement', 'design_housing', TRUE),

-- 313223 - بدل سكن قسم التنفيذ
('313223', 'Execution Dept Housing Allowance', 'بدل سكن قسم التنفيذ', 'expense', 142, 6, 'debit', 'department', 'income_statement', 'execution_housing', TRUE),

-- 31324 - بدلات تشغيلية أخرى
('31324', 'Other Operating Allowances', 'بدلات تشغيلية أخرى', 'expense', 140, 5, 'debit', 'department', 'income_statement', 'other_allowances', TRUE),

-- 3133. الإضافي (Overtime)
('3133', 'Overtime', 'الإضافي', 'expense', 134, 4, 'debit', 'department', 'income_statement', 'overtime', TRUE),

-- 31332 - إضافي قسم التصميم
('31332', 'Design Dept Overtime', 'إضافي قسم التصميم', 'expense', 148, 5, 'debit', 'department', 'income_statement', 'design_overtime', TRUE),

-- 31333 - إضافي قسم التنفيذ
('31333', 'Execution Dept Overtime', 'إضافي قسم التنفيذ', 'expense', 148, 5, 'debit', 'department', 'income_statement', 'execution_overtime', TRUE),

-- 3134. عمولة المبيعات (Sales Commission)
('3134', 'Sales Commission', 'عمولة المبيعات', 'expense', 134, 4, 'debit', 'department', 'income_statement', 'commission', TRUE),

-- 3134001 - عمولات قسم المبيعات
('3134001', 'Sales Dept Commissions', 'عمولات قسم المبيعات', 'expense', 151, 5, 'debit', 'department', 'income_statement', 'sales_commission', TRUE),

-- 3134002 - عمولات تشغيلية مباشرة
('3134002', 'Direct Operating Commissions', 'عمولات تشغيلية مباشرة', 'expense', 151, 5, 'debit', 'department', 'income_statement', 'operating_commission', TRUE);

-- ============================================================================
-- LEVEL 2 & 3: ADMINISTRATIVE EXPENSES (32)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, cost_center_type, financial_statement, report_category, is_active) VALUES
-- 32. التكاليف الإدارية (Administrative Costs)
('32', 'Administrative Costs', 'التكاليف الإدارية', 'expense', 3, 2, 'debit', NULL, 'income_statement', 'administrative', TRUE),

-- 321. المصاريف العمومية والإدارية (General & Admin Expenses)
('321', 'General & Administrative Expenses', 'المصاريف العمومية والإدارية', 'expense', 154, 3, 'debit', 'department', 'income_statement', 'general_admin', TRUE);

-- ============================================================================
-- LEVEL 4: G&A EXPENSES (3210001-3210045)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, cost_center_type, linked_entity_id, financial_statement, report_category, is_active) VALUES
-- 3210001 - تعقيب وجوازات ومعاملات حكومية
('3210001', 'Government Transactions & Passports', 'تعقيب وجوازات ومعاملات حكومية', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'government_fees', TRUE),

-- 3210002 - مياه وكهرباء
('3210002', 'Water & Electricity', 'مياه وكهرباء', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'utilities', TRUE),

-- 3210003 - بريد وهاتف وإنترنت
('3210003', 'Post, Phone & Internet', 'بريد وهاتف وإنترنت', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'communication', TRUE),

-- 3210004 - مكافآت وحوافز نقدية
('3210004', 'Cash Bonuses & Incentives', 'مكافآت وحوافز نقدية', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'bonuses', TRUE),

-- 3210005 - نقل ومواصلات
('3210005', 'Transportation', 'نقل ومواصلات', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'transportation', TRUE),

-- 3210006 - قرطاسية ومطبوعات
('3210006', 'Stationery & Printing', 'قرطاسية ومطبوعات', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'stationery', TRUE),

-- 3210007 - صيانة عامة وإصلاح إدارة
('3210007', 'General Maintenance & Repairs', 'صيانة عامة وإصلاح إدارة', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'general_maintenance', TRUE),

-- 3210008 - مصاريف النظافة
('3210008', 'Cleaning Expenses', 'مصاريف النظافة', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'cleaning', TRUE),

-- 3210009 - مستلزمات البوفيه
('3210009', 'Buffet Supplies', 'مستلزمات البوفيه', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'buffet_supplies', TRUE),

-- 3210010 - علاج وأدوية
('3210010', 'Medical Treatment & Medicines', 'علاج وأدوية', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'medical', TRUE),

-- 3210011 - عمولات إدارية
('3210011', 'Administrative Commissions', 'عمولات إدارية', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'admin_commissions', TRUE),

-- 3210012 - بدل تذاكر سفر عمل - إدارة
('3210012', 'Admin Business Travel Tickets', 'بدل تذاكر سفر عمل - إدارة', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'admin_travel', TRUE),

-- 3210013 - مصاريف سكن العمال
('3210013', 'Worker Housing Expenses', 'مصاريف سكن العمال', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'worker_housing', TRUE),

-- 3210015 - مصروف الإيجارات (Rent Expenses)
('3210015', 'Rent Expenses', 'مصروف الإيجارات', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'rent', TRUE),

-- 32100151 - إيجار مبنى
('32100151', 'Building Rent', 'إيجار مبنى', 'expense', 170, 5, 'debit', NULL, NULL, 'income_statement', 'building_rent', TRUE),

-- 32100152 - إيجار مستودع
('32100152', 'Warehouse Rent', 'إيجار مستودع', 'expense', 170, 5, 'debit', NULL, NULL, 'income_statement', 'warehouse_rent', TRUE),

-- 32100153 - إيجار سكن
('32100153', 'Housing Rent', 'إيجار سكن', 'expense', 170, 5, 'debit', NULL, NULL, 'income_statement', 'housing_rent', TRUE),

-- 3210016 - رسوم معاملات بنكية
('3210016', 'Bank Transaction Fees', 'رسوم معاملات بنكية', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'bank_fees', TRUE),

-- 3210017 - رسوم اشتراك وتصاديق
('3210017', 'Subscription & Certification Fees', 'رسوم اشتراك وتصاديق', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'subscriptions', TRUE),

-- 3210018 - بدل سفريات
('3210018', 'Travel Allowances', 'بدل سفريات', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'travel_allowances', TRUE),

-- 3210020 - مخالفات وغرامات
('3210020', 'Fines & Penalties', 'مخالفات وغرامات', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'fines', TRUE),

-- 3210021 - تبرعات وصدقات
('3210021', 'Donations & Charity', 'تبرعات وصدقات', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'donations', TRUE),

-- 3210022 - تأمين طبي
('3210022', 'Medical Insurance', 'تأمين طبي', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'medical_insurance', TRUE),

-- 3210024 - ملابس زي موحد
('3210024', 'Uniform Clothing', 'ملابس زي موحد', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'uniforms', TRUE),

-- 3210026 - مصاريف متنوعة
('3210026', 'Miscellaneous Expenses', 'مصاريف متنوعة', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'misc_expenses', TRUE),

-- 3210027 - محروقات سيارات إدارية (Admin Vehicle Fuel)
('3210027', 'Admin Vehicle Fuel', 'محروقات سيارات إدارية', 'expense', 155, 4, 'debit', 'vehicle', NULL, 'income_statement', 'admin_vehicle_fuel', TRUE),

-- 321002702 - محروقات كورولا 2014
('321002702', 'Fuel - Corolla 2014', 'محروقات كورولا 2014', 'expense', 188, 5, 'debit', 'vehicle', NULL, 'income_statement', 'admin_vehicle_fuel_detail', TRUE),

-- 3210028 - صيانة سيارات إدارية (Admin Vehicle Maintenance)
('3210028', 'Admin Vehicle Maintenance', 'صيانة سيارات إدارية', 'expense', 155, 4, 'debit', 'vehicle', NULL, 'income_statement', 'admin_vehicle_maintenance', TRUE),

-- 3210028102 - صيانة كورولا 2014
('3210028102', 'Maintenance - Corolla 2014', 'صيانة كورولا 2014', 'expense', 190, 5, 'debit', 'vehicle', NULL, 'income_statement', 'admin_vehicle_maint_detail', TRUE),

-- 3210029 - رسوم سيارات إدارية (Admin Vehicle Fees)
('3210029', 'Admin Vehicle Fees', 'رسوم سيارات إدارية', 'expense', 155, 4, 'debit', 'vehicle', NULL, 'income_statement', 'admin_vehicle_fees', TRUE),

-- 321002902 - رسوم كورولا 2014
('321002902', 'Fees - Corolla 2014', 'رسوم كورولا 2014', 'expense', 192, 5, 'debit', 'vehicle', NULL, 'income_statement', 'admin_vehicle_fees_detail', TRUE),

-- Remaining G&A expenses
('3210030', 'Bad Debts', 'ديون معدومة', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'bad_debts', TRUE),
('3210031', 'Generator Fuel', 'محروقات الجنتور', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'generator_fuel', TRUE),
('3210032', 'Currency Exchange Differences', 'فروقات أسعار عملات', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'fx_differences', TRUE),
('3210034', 'Food & Hospitality', 'مصاريف طعام وضيافة', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'hospitality', TRUE),
('3210035', 'Social Insurance', 'التأمينات الاجتماعية', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'social_insurance', TRUE),
('3210036', 'Audit Fees', 'مصاريف مراجعة مالية', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'audit_fees', TRUE),
('3210037', 'Computer & Surveillance', 'مصاريف الكمبيوتر والمراقبة', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'computer_surveillance', TRUE),
('3210038', 'Vacation Travel Tickets', 'تذاكر سفر إجازات', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'vacation_tickets', TRUE),
('3210041', 'Printer Ink', 'أحبار طابعات', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'printer_ink', TRUE),
('3210042', 'Administrative Tips', 'إكراميات إدارية', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'admin_tips', TRUE),
('3210043', 'Fire Equipment Maintenance', 'صيانة أجهزة الحريق', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'fire_equipment_maintenance', TRUE),
('3210045', 'Miscellaneous Transfer Expenses', 'مصاريف متنوعة - تحويلات', 'expense', 155, 4, 'debit', NULL, NULL, 'income_statement', 'misc_transfers', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: ADMINISTRATIVE SALARIES (322)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, cost_center_type, financial_statement, report_category, is_active) VALUES
-- 322. الرواتب (Administrative Salaries)
('322', 'Administrative Salaries', 'الرواتب', 'expense', 154, 3, 'debit', 'department', 'income_statement', 'admin_salaries', TRUE),

-- 3220001 - بدل سكن - إدارة
('3220001', 'Admin Housing Allowance', 'بدل سكن - إدارة', 'expense', 207, 4, 'debit', 'department', 'income_statement', 'admin_housing', TRUE),

-- 3220002 - بدل إجازة - إدارة
('3220002', 'Admin Leave Allowance', 'بدل إجازة - إدارة', 'expense', 207, 4, 'debit', 'department', 'income_statement', 'admin_leave', TRUE),

-- 3220003 - رواتب الإدارة
('3220003', 'Management Salaries', 'رواتب الإدارة', 'expense', 207, 4, 'debit', 'department', 'income_statement', 'management_salaries', TRUE),

-- 3220006 - بدلات أخرى
('3220006', 'Other Admin Allowances', 'بدلات أخرى', 'expense', 207, 4, 'debit', 'department', 'income_statement', 'admin_other_allowances', TRUE);

-- ============================================================================
-- LEVEL 3 & 4: DEPRECIATION EXPENSES (323)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, financial_statement, report_category, is_active) VALUES
-- 323. مصاريف إهلاك الأصول (Depreciation Expenses)
('323', 'Depreciation Expenses', 'مصاريف إهلاك الأصول', 'expense', 154, 3, 'debit', 'income_statement', 'depreciation', TRUE),

-- 32301 - إهلاك تحسينات الأصول
('32301', 'Leasehold Improvement Depreciation', 'إهلاك تحسينات الأصول', 'expense', 212, 4, 'debit', 'income_statement', 'depr_leasehold', TRUE),

-- 32302 - إهلاك الأثاث
('32302', 'Furniture Depreciation', 'إهلاك الأثاث', 'expense', 212, 4, 'debit', 'income_statement', 'depr_furniture', TRUE),

-- 32303 - إهلاك السيارات
('32303', 'Vehicle Depreciation', 'إهلاك السيارات', 'expense', 212, 4, 'debit', 'income_statement', 'depr_vehicles', TRUE),

-- 32304 - إهلاك معدات التشغيل
('32304', 'Machinery Depreciation', 'إهلاك معدات التشغيل', 'expense', 212, 4, 'debit', 'income_statement', 'depr_machinery', TRUE),

-- 32305 - إهلاك أجهزة الكمبيوتر
('32305', 'Computer Equipment Depreciation', 'إهلاك أجهزة الكمبيوتر', 'expense', 212, 4, 'debit', 'income_statement', 'depr_computer', TRUE),

-- 32306 - إهلاك العدد والأدوات
('32306', 'Tools Depreciation', 'إهلاك العدد والأدوات', 'expense', 212, 4, 'debit', 'income_statement', 'depr_tools', TRUE);

-- ============================================================================
-- LEVEL 2 & 3: REVENUE ACCOUNTS (41, 42)
-- ============================================================================

INSERT INTO chart_of_accounts (account_code, account_name, account_name_ar, account_type, parent_id, level, normal_balance, is_vat_applicable, vat_rate, financial_statement, report_category, is_active) VALUES
-- 41. الدخل من النشاط (Operating Revenue)
('41', 'Operating Revenue', 'الدخل من النشاط', 'revenue', 4, 2, 'credit', TRUE, 15.00, 'income_statement', 'operating_revenue', TRUE),

-- 411. صافي المبيعات (Net Sales)
('411', 'Net Sales', 'صافي المبيعات', 'revenue', 220, 3, 'credit', TRUE, 15.00, 'income_statement', 'sales_revenue', TRUE),

-- 4111 - المبيعات (Sales)
('4111', 'Sales', 'المبيعات', 'revenue', 221, 4, 'credit', TRUE, 15.00, 'income_statement', 'gross_sales', TRUE),

-- 4112 - مرتجع المبيعات (Sales Returns)
('4112', 'Sales Returns', 'مرتجع المبيعات', 'revenue', 221, 4, 'debit', TRUE, 15.00, 'income_statement', 'sales_returns', TRUE),

-- 4113 - الخصم الممنوح (Sales Discounts)
('4113', 'Sales Discounts Granted', 'الخصم الممنوح', 'revenue', 221, 4, 'debit', FALSE, 15.00, 'income_statement', 'sales_discounts', TRUE),

-- 42. إيرادات أخرى (Other Income)
('42', 'Other Income', 'إيرادات أخرى', 'revenue', 4, 2, 'credit', FALSE, 15.00, 'income_statement', 'other_income', TRUE);

-- ============================================================================
-- VERIFICATION: Count and validate all accounts
-- ============================================================================

DO $$
DECLARE
  total_accounts INTEGER;
  level_1_count INTEGER;
  level_2_count INTEGER;
  level_3_count INTEGER;
  level_4_plus_count INTEGER;
  arabic_names_count INTEGER;
BEGIN
  -- Total count
  SELECT COUNT(*) INTO total_accounts FROM chart_of_accounts;
  
  -- Level distribution
  SELECT COUNT(*) INTO level_1_count FROM chart_of_accounts WHERE level = 1;
  SELECT COUNT(*) INTO level_2_count FROM chart_of_accounts WHERE level = 2;
  SELECT COUNT(*) INTO level_3_count FROM chart_of_accounts WHERE level = 3;
  SELECT COUNT(*) INTO level_4_plus_count FROM chart_of_accounts WHERE level >= 4;
  
  -- Arabic names
  SELECT COUNT(*) INTO arabic_names_count FROM chart_of_accounts WHERE account_name_ar IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CHART OF ACCOUNTS MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Accounts: %', total_accounts;
  RAISE NOTICE 'Level 1 (Main Categories): %', level_1_count;
  RAISE NOTICE 'Level 2 (Sub-categories): %', level_2_count;
  RAISE NOTICE 'Level 3 (Detail): %', level_3_count;
  RAISE NOTICE 'Level 4+ (Specific): %', level_4_plus_count;
  RAISE NOTICE 'Accounts with Arabic Names: %', arabic_names_count;
  RAISE NOTICE '========================================';
  
  IF total_accounts < 100 THEN
    RAISE WARNING '⚠️  Warning: Only % accounts created (expected 100+)', total_accounts;
  END IF;
  
  IF arabic_names_count != total_accounts THEN
    RAISE WARNING '⚠️  Warning: Only %/% accounts have Arabic names', arabic_names_count, total_accounts;
  END IF;
END $$;

COMMIT;
