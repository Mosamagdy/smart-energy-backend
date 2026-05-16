# 📋 Phase 1 & 2 Deployment Checklist

## Pre-Deployment

### System Requirements
- [ ] PostgreSQL version >= 12
- [ ] Database name: `smart_energy_db`
- [ ] Database user: `postgres` (or update scripts)
- [ ] psql command-line tool available
- [ ] pg_dump available for backups
- [ ] PowerShell 5.0+ (for automated script)

### Backup Verification
- [ ] Confirm backup directory has write permissions
- [ ] Test manual backup: `pg_dump -U postgres smart_energy_db > test_backup.sql`
- [ ] Verify backup file created successfully
- [ ] Delete test backup after verification

### Code Review
- [ ] Reviewed `012_phase1_enhance_coa_schema.sql`
- [ ] Reviewed `013_phase2_complete_coa_seed.sql`
- [ ] Reviewed `verify_coa_migration.sql`
- [ ] Updated database credentials in `run-coa-migration.ps1` if needed

---

## Deployment Execution

### Option A: Automated (Recommended)
```powershell
cd d:\Desktop\system\backend
.\run-coa-migration.ps1
```

**Expected Output:**
- [ ] ✅ Backup created successfully
- [ ] ✅ Phase 1 migration completed
- [ ] ✅ Phase 2 migration completed
- [ ] ✅ Verification completed
- [ ] ✅ Total Accounts: 100+
- [ ] ✅ Arabic Names: 100+
- [ ] ✅ Max Hierarchy Depth: 4+ levels

### Option B: Manual Steps
- [ ] Step 1: Created backup manually
- [ ] Step 2: Ran `012_phase1_enhance_coa_schema.sql`
- [ ] Step 3: Ran `013_phase2_complete_coa_seed.sql`
- [ ] Step 4: Ran `verify_coa_migration.sql`
- [ ] Step 5: Reviewed all verification results

---

## Post-Deployment Verification

### Database Checks
Run these queries to confirm success:

```sql
-- Check 1: Account count
SELECT COUNT(*) FROM chart_of_accounts;
-- Expected: >= 100

-- Check 2: Arabic names coverage
SELECT COUNT(*) FROM chart_of_accounts WHERE account_name_ar IS NOT NULL;
-- Expected: Same as total count

-- Check 3: Maximum hierarchy depth
WITH RECURSIVE tree AS (
  SELECT id, parent_id, 1 as depth FROM chart_of_accounts WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, t.depth + 1 FROM chart_of_accounts c 
  INNER JOIN tree t ON c.parent_id = t.id
)
SELECT MAX(depth) FROM tree;
-- Expected: >= 4

-- Check 4: VAT accounts exist
SELECT account_code, account_name_ar FROM chart_of_accounts 
WHERE account_code IN ('2220101', '2220102', '2220103');
-- Expected: 3 rows with Arabic names

-- Check 5: Vehicle accounts exist
SELECT account_code, account_name_ar FROM chart_of_accounts 
WHERE account_code IN ('31112403', '321002702');
-- Expected: 2 rows

-- Check 6: No orphaned accounts
SELECT COUNT(*) FROM chart_of_accounts c
WHERE c.parent_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM chart_of_accounts p WHERE p.id = c.parent_id);
-- Expected: 0
```

### API Testing

#### Test 1: Get Account Tree
```bash
curl http://localhost:3000/api/coa/tree
```
**Expected:**
- [ ] Returns nested JSON structure
- [ ] Includes `account_name_ar` field
- [ ] Shows 4+ levels of hierarchy
- [ ] Response time < 100ms

#### Test 2: Get Single Account
```bash
curl http://localhost:3000/api/coa/1
```
**Expected:**
- [ ] Returns account details
- [ ] Includes all 10 new fields
- [ ] Arabic name present

#### Test 3: Create New Account (with Arabic name)
```bash
curl -X POST http://localhost:3000/api/coa \
  -H "Content-Type: application/json" \
  -d '{
    "account_code": "9999999",
    "account_name": "Test Account",
    "account_name_ar": "حساب تجريبي",
    "account_type": "expense",
    "parent_id": 3,
    "level": 2,
    "is_vat_applicable": false
  }'
```
**Expected:**
- [ ] Returns 201 Created
- [ ] Account saved with Arabic name
- [ ] All new fields stored correctly

#### Test 4: Search by Arabic Name
```bash
curl "http://localhost:3000/api/coa/search?term=سيارات"
```
**Expected:**
- [ ] Returns vehicle-related accounts
- [ ] Arabic search works correctly

### Visual Inspection

#### Check Helper Views
```sql
-- View 1: Balance Sheet
SELECT COUNT(*) FROM v_balance_sheet_accounts;
-- Expected: ~40-50 accounts

-- View 2: Income Statement
SELECT COUNT(*) FROM v_income_statement_accounts;
-- Expected: ~50-60 accounts

-- View 3: VAT Applicable
SELECT * FROM v_vat_applicable_accounts;
-- Expected: 10-15 accounts

-- View 4: Cost Centers
SELECT * FROM v_cost_center_accounts;
-- Expected: 20-30 accounts
```

---

## Functional Testing

### Scenario 1: VAT Calculation Ready
- [ ] Account 2220101 exists (Output VAT)
- [ ] Account 2220102 exists (Input VAT)
- [ ] Account 2220103 exists (Net VAT Payable)
- [ ] All have `is_vat_applicable = true`
- [ ] All have `vat_rate = 15.00`

### Scenario 2: Vehicle Expense Tracking
- [ ] Account 31112403 exists (Isuzu 2011 fuel)
- [ ] Account 31112404 exists (Isuzu 2013 fuel)
- [ ] Account 321002702 exists (Corolla 2014 fuel)
- [ ] All have `cost_center_type = 'vehicle'`

### Scenario 3: Customer Ledgers
- [ ] Account 1210101 exists (Huawei)
- [ ] Account 1210201 exists (Xiaomi)
- [ ] Both at level 5 or deeper
- [ ] Can be used for subsidiary ledger tracking

### Scenario 4: Fixed Assets
- [ ] Asset accounts have depreciation_method set
- [ ] Useful life years configured
- [ ] Accumulated depreciation contra-accounts exist (112xx series)

### Scenario 5: Departmental Tracking
- [ ] Sales department accounts exist (313101, 313221)
- [ ] Design department accounts exist (313102, 313222)
- [ ] Execution department accounts exist (313103, 313223)

---

## Performance Testing

### Query Performance
```sql
-- Test 1: Full tree query
EXPLAIN ANALYZE
WITH RECURSIVE tree AS (
  SELECT * FROM chart_of_accounts WHERE parent_id IS NULL
  UNION ALL
  SELECT c.* FROM chart_of_accounts c INNER JOIN tree t ON c.parent_id = t.id
)
SELECT COUNT(*) FROM tree;
-- Expected: < 50ms

-- Test 2: VAT accounts lookup
EXPLAIN ANALYZE
SELECT * FROM v_vat_applicable_accounts;
-- Expected: < 10ms

-- Test 3: Account by code
EXPLAIN ANALYZE
SELECT * FROM chart_of_accounts WHERE account_code = '31112403';
-- Expected: < 5ms (uses index)
```

---

## Integration Testing

### Test with Existing Modules

#### Invoices Module
- [ ] Invoice creation still works
- [ ] VAT calculation uses correct accounts
- [ ] Journal entries reference valid COA IDs

#### Expenses Module
- [ ] Expense creation works with new accounts
- [ ] Can link expenses to vehicle accounts
- [ ] Can link expenses to project accounts

#### Journal Entries Module
- [ ] Can create journal entries with new accounts
- [ ] Debit/credit validation works
- [ ] Account balance calculations correct

---

## Documentation Updates

- [ ] Updated API documentation with new fields
- [ ] Documented Arabic name requirement
- [ ] Added examples for cost center linking
- [ ] Updated error messages for validation

---

## Team Communication

- [ ] Notified finance team about new account structure
- [ ] Trained users on bilingual interface
- [ ] Explained vehicle-specific tracking feature
- [ ] Shared quick reference guide (`coa_quick_reference.sql`)

---

## Rollback Plan (If Needed)

If issues occur:

```bash
# Step 1: Stop application
# Step 2: Restore backup
psql -U postgres -d smart_energy_db -f backup_before_coa_migration_YYYYMMDD.sql

# Step 3: Verify restoration
psql -U postgres -d smart_energy_db -c "SELECT COUNT(*) FROM chart_of_accounts;"

# Step 4: Restart application
```

---

## Sign-Off

### Technical Validation
- [ ] All migrations executed without errors
- [ ] Verification script shows all PASS
- [ ] API endpoints working correctly
- [ ] Performance within acceptable range
- [ ] No data loss or corruption

### Business Validation
- [ ] Finance team confirmed account structure
- [ ] Arabic names display correctly
- [ ] VAT accounts match requirements
- [ ] Vehicle tracking meets operational needs
- [ ] Customer ledgers ready for use

### Final Approval
- [ ] **Developer:** _________________ Date: _______
- [ ] **Finance Manager:** _________________ Date: _______
- [ ] **IT Manager:** _________________ Date: _______

---

## Next Steps After Successful Deployment

1. **Phase 3 Planning**
   - [ ] Design VAT return calculation engine
   - [ ] Plan ZATCA e-invoicing integration
   - [ ] Define XML schema for invoices

2. **User Training**
   - [ ] Schedule training sessions
   - [ ] Create user manuals in Arabic
   - [ ] Prepare video tutorials

3. **Monitoring**
   - [ ] Set up query performance monitoring
   - [ ] Track API usage patterns
   - [ ] Monitor error logs

4. **Phase 4 Preparation**
   - [ ] Gather fixed asset register data
   - [ ] Define depreciation policies
   - [ ] Plan asset disposal workflow

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Migration fails | Check PostgreSQL logs, verify permissions |
| Arabic names show as ??? | Ensure DB encoding is UTF-8 |
| Tree query slow | Verify indexes exist |
| API returns 500 error | Check backend logs for SQL errors |
| Account count < 100 | Re-run migration 013 |

---

**Deployment Date:** _________________  
**Deployed By:** _________________  
**Status:** ⬜ Pending  ⬜ In Progress  ⬜ Complete  ⬜ Rolled Back

---

✅ **When all checkboxes are marked, Phase 1 & 2 deployment is complete!**
