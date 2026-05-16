const { query } = require('../../db');
const employeeRepo = require('../employees/employees.repository');
const coaRepo = require('../coa/coa.repository');

// ============================================================================
// Payroll Service - CLEAN & PROFESSIONAL
// Only depends on: journal_entries, employees, chart_of_accounts
// ============================================================================

/**
 * Approve and Post Payroll - Creates Journal Entry Directly
 * Employee-based processing: only processes employees where payroll_status = FALSE
 */
async function approveAndPostPayroll(data, currentUser) {
  const {
    department_id,
    department_name,
    account_code,
    employees,
    totals,
    auto_post = true,
    payroll_month,
    payroll_year
  } = data;

  if (!employees || employees.length === 0) {
    const err = new Error('لم يتم اختيار موظفين');
    err.statusCode = 400;
    throw err;
  }

  try {
    const currentMonth = payroll_month || new Date().getMonth() + 1;
    const currentYear = payroll_year || new Date().getFullYear();
    
    console.log(`[Payroll] Processing payroll: Month ${currentMonth}, Year ${currentYear}, Dept ${department_id}`);
    console.log(`[Payroll] Total employees selected: ${employees.length}`);

    // STEP 1: FETCH EMPLOYEES FROM DATABASE WITH payroll_status = FALSE
    // Only process employees who haven't been approved yet this month
    const eligibleEmployees = await query(
      `SELECT 
         e.id,
         e.employee_number,
         e.first_name,
         e.last_name,
         e.basic_salary,
         e.housing_allowance,
         e.transport_allowance,
         e.other_allowances,
         e.gosi_registered,
         e.payroll_status
       FROM employees e
       WHERE e.department_id = $1
         AND e.status = 'active'
         AND e.payroll_status = FALSE
       ORDER BY e.id`,
      [department_id]
    );

    if (eligibleEmployees.rows.length === 0) {
      console.log(`[Payroll] ⚠️ All employees in department ${department_id} already approved for this month`);
      const err = new Error('جميع الموظفين في هذا القسم تم اعتمادهم مسبقاً لهذا الشهر');
      err.statusCode = 409;
      throw err;
    }

    console.log(`[Payroll] ✅ Found ${eligibleEmployees.rows.length} eligible employees (payroll_status = FALSE)`);

    // STEP 2: CALCULATE GOSI CORRECTLY BASED ON gosi_registered
    const GOSI_EMPLOYEE_RATE = 0.0975;  // 9.75% employee share
    const GOSI_EMPLOYER_RATE = 0.12;    // 12% employer share

    let totalBasicSalary = 0;
    let totalHousing = 0;
    let totalTransport = 0;
    let totalOtherAllowances = 0;
    let totalGosiEmployee = 0;
    let totalGosiEmployer = 0;

    const processedEmployees = [];

    for (const emp of eligibleEmployees.rows) {
      const basicSalary = parseFloat(emp.basic_salary) || 0;
      const housingAllowance = parseFloat(emp.housing_allowance) || 0;
      const transportAllowance = parseFloat(emp.transport_allowance) || 0;
      const otherAllowances = parseFloat(emp.other_allowances) || 0;

      // Calculate GOSI ONLY if gosi_registered = TRUE
      let gosiEmployee = 0;
      let gosiEmployer = 0;

      if (emp.gosi_registered === true) {
        gosiEmployee = basicSalary * GOSI_EMPLOYEE_RATE;  // 9.75% of basic salary
        gosiEmployer = basicSalary * GOSI_EMPLOYER_RATE;  // 12% of basic salary
        
        console.log(`[Payroll] ${emp.employee_number}: GOSI registered - Employee: ${gosiEmployee.toFixed(2)}, Employer: ${gosiEmployer.toFixed(2)}`);
      } else {
        console.log(`[Payroll] ${emp.employee_number}: NOT registered for GOSI - GOSI = 0`);
      }

      const grossSalary = basicSalary + housingAllowance + transportAllowance + otherAllowances;
      const netSalary = grossSalary - gosiEmployee;

      // Add to totals
      totalBasicSalary += basicSalary;
      totalHousing += housingAllowance;
      totalTransport += transportAllowance;
      totalOtherAllowances += otherAllowances;
      totalGosiEmployee += gosiEmployee;
      totalGosiEmployer += gosiEmployer;

      processedEmployees.push({
        id: emp.id,
        employee_number: emp.employee_number,
        name: `${emp.first_name} ${emp.last_name}`,
        basic_salary: basicSalary,
        housing_allowance: housingAllowance,
        transport_allowance: transportAllowance,
        other_allowances: otherAllowances,
        gosi_employee: gosiEmployee,
        gosi_employer: gosiEmployer,
        gross_salary: grossSalary,
        net_salary: netSalary
      });
    }

    console.log(`[Payroll] Totals:`);
    console.log(`  Basic Salary: ${totalBasicSalary.toFixed(2)}`);
    console.log(`  Housing: ${totalHousing.toFixed(2)}`);
    console.log(`  Transport: ${totalTransport.toFixed(2)}`);
    console.log(`  Other: ${totalOtherAllowances.toFixed(2)}`);
    console.log(`  GOSI Employee: ${totalGosiEmployee.toFixed(2)}`);
    console.log(`  GOSI Employer: ${totalGosiEmployer.toFixed(2)}`);

    const calculatedGross = totalBasicSalary + totalHousing + totalTransport + totalOtherAllowances;
    const calculatedNet = calculatedGross - totalGosiEmployee;

    console.log(`[Payroll] Calculated Gross: ${calculatedGross.toFixed(2)}`);
    console.log(`[Payroll] Calculated Net: ${calculatedNet.toFixed(2)}`);

    // STEP 3: FETCH ALL COA ACCOUNTS BEFORE USING THEM
    const salaryAccount = await coaRepo.getAccountByCode(account_code);
    if (!salaryAccount) {
      throw new Error(`حساب الرواتب ${account_code} غير موجود`);
    }

    // Get allowance accounts using 7-digit mapping
    const isServiceAccount = account_code.startsWith('313');
    
    let housingAccountCode, transportAccountCode;
    
    if (isServiceAccount) {
      // Map 313xx → 314xx (housing) and 315xx (transport)
      const serviceNum = account_code.substring(3);
      housingAccountCode = `314${serviceNum}`;
      transportAccountCode = `315${serviceNum}`;
    } else {
      // Admin accounts
      housingAccountCode = '3220001';
      transportAccountCode = '3220006';
    }
    
    console.log(`[Payroll] Account mapping:`);
    console.log(`  - Salary: ${account_code}`);
    console.log(`  - Housing: ${housingAccountCode}`);
    console.log(`  - Transport: ${transportAccountCode}`);
    
    const housingAccount = await coaRepo.getAccountByCode(housingAccountCode);
    const transportAccount = await coaRepo.getAccountByCode(transportAccountCode);
    const accruedSalariesAccount = await coaRepo.getAccountByCode('22301');
    const gosiExpenseAccount = await coaRepo.getAccountByCode('31601');
    const gosiPayableAccount = await coaRepo.getAccountByCode('22302');

    // Validate all accounts exist
    if (!housingAccount || !transportAccount || !accruedSalariesAccount) {
      const missing = [];
      if (!housingAccount) missing.push(housingAccountCode);
      if (!transportAccount) missing.push(transportAccountCode);
      if (!accruedSalariesAccount) missing.push('22301');
      
      const err = new Error(`حسابات البدلات غير موجودة: ${missing.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    // STEP 4: BUILD JOURNAL ENTRY LINES
    const journalLines = [];

    // Debit: Salary Expense
    if (totalBasicSalary > 0) {
      journalLines.push({
        account_id: salaryAccount.id,
        debit_amount: parseFloat(totalBasicSalary.toFixed(2)),
        credit_amount: 0,
        description: `رواتب ${department_name}`
      });
    }

    // Debit: Housing Allowance
    if (totalHousing > 0) {
      journalLines.push({
        account_id: housingAccount.id,
        debit_amount: parseFloat(totalHousing.toFixed(2)),
        credit_amount: 0,
        description: `بدل سكن ${department_name}`
      });
    }

    // Debit: Transport Allowance
    if (totalTransport > 0) {
      journalLines.push({
        account_id: transportAccount.id,
        debit_amount: parseFloat(totalTransport.toFixed(2)),
        credit_amount: 0,
        description: `بدل نقل ${department_name}`
      });
    }

    // Debit: Other Allowances (Use Salary account, NOT Housing)
    if (totalOtherAllowances > 0) {
      journalLines.push({
        account_id: salaryAccount.id,  // FIXED: Use salary account instead of housing
        debit_amount: parseFloat(totalOtherAllowances.toFixed(2)),
        credit_amount: 0,
        description: `بدلات أخرى ${department_name}`
      });
    }

    // Debit: GOSI Employer Contribution
    if (totalGosiEmployer > 0 && gosiExpenseAccount) {
      journalLines.push({
        account_id: gosiExpenseAccount.id,
        debit_amount: parseFloat(totalGosiEmployer.toFixed(2)),
        credit_amount: 0,
        description: `تأمينات اجتماعية ${department_name}`
      });
    }

    // Credit: Accrued Salaries (Net amount = Gross - GOSI Employee)
    journalLines.push({
      account_id: accruedSalariesAccount.id,
      debit_amount: 0,
      credit_amount: parseFloat(calculatedNet.toFixed(2)),
      description: `رواتب مستحقة - ${department_name}`
    });

    // Credit: GOSI Payable (Employee + Employer)
    const totalGosi = totalGosiEmployee + totalGosiEmployer;
    if (totalGosi > 0 && gosiPayableAccount) {
      journalLines.push({
        account_id: gosiPayableAccount.id,
        debit_amount: 0,
        credit_amount: parseFloat(totalGosi.toFixed(2)),
        description: `تأمينات اجتماعية مستحقة - ${department_name}`
      });
    }

    // STEP 5: VALIDATE BALANCE BEFORE SAVING
    const totalDebits = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredits = journalLines.reduce((sum, line) => sum + line.credit_amount, 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      console.error(`[Payroll] ❌ VALIDATION FAILED: Debits (${totalDebits}) != Credits (${totalCredits})`);
      const err = new Error(`قيد الرواتب غير متوازن! الفرق: ${(totalDebits - totalCredits).toFixed(2)} SAR`);
      err.statusCode = 500;
      throw err;
    }
    
    console.log(`[Payroll] ✅ Balance validated: Debits = Credits = ${totalDebits.toFixed(2)}`);

    // Get next entry number
    const entryNumResult = await query(
      'SELECT COALESCE(MAX(entry_number), 0) + 1 as next_num FROM journal_entries'
    );
    const entryNumber = entryNumResult.rows[0].next_num;

    // Create journal entry with month/year in Arabic
    const monthNames = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthName = monthNames[currentMonth] || currentMonth;
    const entryDescription = `قيد رواتب ${department_name} - ${monthName} ${currentYear}`;
    
    const entryResult = await query(
      `INSERT INTO journal_entries (
        entry_number, entry_date, description, reference_type,
        reference_id, project_id, contract_id, posted_by, is_posted
      ) VALUES ($1, NOW(), $2, 'payroll_auto', NULL, NULL, NULL, $3, $4)
      RETURNING id, entry_number`,
      [
        entryNumber,
        entryDescription,
        currentUser?.id || 97,
        auto_post ? true : false
      ]
    );

    const journalEntryId = entryResult.rows[0].id;

    // Insert journal entry lines
    for (const line of journalLines) {
      await query(
        `INSERT INTO journal_entry_lines 
          (journal_entry_id, account_id, description, debit_amount, credit_amount)
        VALUES ($1, $2, $3, $4, $5)`,
        [journalEntryId, line.account_id, line.description, line.debit_amount, line.credit_amount]
      );
    }

    console.log(`[Payroll] ✅ Journal Entry #${entryNumber} created for ${department_name}`);
    console.log(`[Payroll] Total: ${calculatedGross.toFixed(2)} SAR | Employees: ${processedEmployees.length}`);

    // STEP 6: UPDATE payroll_status ONLY FOR PROCESSED EMPLOYEES
    const employeeIds = processedEmployees.map(emp => emp.id);
    
    await query(
      `UPDATE employees 
       SET payroll_status = TRUE, updated_at = NOW()
       WHERE id = ANY($1::int[])`,
      [employeeIds]
    );

    console.log(`[Payroll] ✅ Updated payroll_status=TRUE for ${employeeIds.length} employees`);

    return {
      success: true,
      journal_entry_id: journalEntryId,
      entry_number: entryNumber,
      department_name,
      employee_count: processedEmployees.length,
      total_gross: calculatedGross,
      total_net: calculatedNet,
      total_gosi_employee: totalGosiEmployee,
      total_gosi_employer: totalGosiEmployer,
      is_posted: auto_post,
      processed_employees: processedEmployees
    };
  } catch (error) {
    console.error('[Payroll] Error in approveAndPostPayroll:', error);
    throw error;
  }
}

/**
 * Get payroll status for a specific month/year
 * Checks payroll_status column in employees table
 */
async function getPayrollStatus(month, year) {
  try {
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    const currentYear = parseInt(year) || new Date().getFullYear();

    console.log(`[Payroll Status] Checking: Month ${currentMonth}, Year ${currentYear}`);

    // Get distinct departments with payroll_status = TRUE - JOIN with departments table
    const result = await query(
      `SELECT DISTINCT 
         e.department_id,
         d.name as department_name,
         e.payroll_status
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.payroll_status = TRUE
         AND e.department_id IS NOT NULL
       ORDER BY e.department_id`,
      []
    );

    console.log(`[Payroll Status] Found ${result.rows.length} approved departments`);

    return result.rows;
  } catch (error) {
    console.error('[Payroll Status] Error in getPayrollStatus:', error.message);
    console.error('[Payroll Status] Stack:', error.stack);
    // Return empty array on error instead of 500
    return [];
  }
}

module.exports = {
  approveAndPostPayroll,
  getPayrollStatus
};
