const XLSX = require('xlsx');
const { query } = require('../../db');

// ============================================================================
// Payroll Excel Export Service - TASK 6-A
// Professional payroll report grouped by department
// ============================================================================

/**
 * Export Payroll to Excel
 * Groups employees by department with professional formatting
 */
async function exportPayrollToExcel(month, year) {
  try {
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    const currentYear = parseInt(year) || new Date().getFullYear();
    
    console.log(`[Excel Export] Generating payroll report: Month ${currentMonth}, Year ${currentYear}`);

    // STEP 1: Fetch all active employees with dept_type for COA grouping
    const employeesResult = await query(
      `SELECT 
         e.id,
         e.employee_number,
         e.first_name,
         e.last_name,
         e.arabic_name,
         e.national_id,
         e.iban,
         e.bank_account,
         e.basic_salary,
         e.housing_allowance,
         e.other_allowances,
         e.gosi_registered,
         e.department_id,
         d.name AS department_name,
         d.dept_type
       FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id
       WHERE e.status = 'active'
         AND e.department_id IS NOT NULL
       ORDER BY d.dept_type, d.name, e.last_name, e.first_name`,
      []
    );

    if (employeesResult.rows.length === 0) {
      const err = new Error('لا يوجد موظفين نشطين للتصدير');
      err.statusCode = 404;
      throw err;
    }

    console.log(`[Excel Export] Found ${employeesResult.rows.length} active employees`);

    // STEP 2: Calculate payroll for each employee and group by COA
    const GOSI_EMPLOYEE_RATE = 0.0975; // 9.75%
    
    // Group by department (with COA code mapping based on dept_type)
    const coaGroups = {};
    
    for (const emp of employeesResult.rows) {
      const deptName = emp.department_name || 'بدون قسم';
      const deptType = emp.dept_type || 'administrative';
      
      // Map dept_type to COA code pattern
      // technical/service departments: 313xx series
      // administrative departments: 3220003 series
      const coaCode = deptType === 'technical' ? '31301' : '3220003';
      const groupKey = `${coaCode} - ${deptName}`;
      
      if (!coaGroups[groupKey]) {
        coaGroups[groupKey] = {
          coa_code: coaCode,
          department_name: deptName,
          dept_type: deptType,
          employees: []
        };
      }

      const basicSalary = parseFloat(emp.basic_salary) || 0;
      const housingAllowance = parseFloat(emp.housing_allowance) || 0;
      const otherAllowances = parseFloat(emp.other_allowances) || 0;

      // Calculate GOSI based on gosi_registered flag
      const gosiDeduction = emp.gosi_registered === true 
        ? basicSalary * GOSI_EMPLOYEE_RATE 
        : 0;

      const totalAllowances = housingAllowance + otherAllowances;
      const grossSalary = basicSalary + totalAllowances;
      const netSalary = grossSalary - gosiDeduction;

      coaGroups[groupKey].employees.push({
        employee_number: emp.employee_number,
        name_ar: emp.arabic_name || `${emp.first_name} ${emp.last_name}`,
        national_id: emp.national_id || 'غير محدد',
        iban: emp.iban || emp.bank_account || 'غير محدد',
        basic_salary: basicSalary,
        housing_allowance: housingAllowance,
        other_allowances: otherAllowances,
        total_allowances: totalAllowances,
        gosi_deduction: gosiDeduction,
        net_salary: netSalary
      });
    }

    // STEP 3: Create Excel Workbook
    const workbook = XLSX.utils.book_new();

    // STEP 4: Create main payroll sheet
    const payrollData = [];

    // Header row (bilingual)
    payrollData.push([
      'تقرير الرواتب - Payroll Report',
      `${getMonthName(currentMonth)} ${currentYear}`,
      '', '', '', '', '', '', ''
    ]);
    
    payrollData.push([
      'تاريخ التصدير:',
      new Date().toLocaleDateString('ar-SA'),
      '', '', '', '', '', '', ''
    ]);
    
    payrollData.push([]); // Empty row

    // Column headers (TASK 6-A Refactor: Removed Transport)
    payrollData.push([
      'رقم الموظف',
      'اسم الموظف',
      'رقم الهوية',
      'الآيبان',
      'الراتب الأساسي',
      'بدل السكن',
      'بدلات أخرى',
      'استقطاع التأمينات',
      'صافي الراتب'
    ]);

    // English column headers
    payrollData.push([
      'Employee No.',
      'Employee Name',
      'National ID',
      'IBAN',
      'Basic Salary',
      'Housing',
      'Other Allowances',
      'GOSI Deduction',
      'Net Salary'
    ]);

    // STEP 5: Add employee data grouped by COA code
    let grandTotals = {
      basic_salary: 0,
      housing: 0,
      other: 0,
      gosi: 0,
      net: 0
    };

    for (const [groupKey, groupData] of Object.entries(coaGroups)) {
      const { coa_code, department_name, employees } = groupData;
      
      // COA Group header with account code
      payrollData.push([
        `كود الحساب / COA: ${coa_code} - ${department_name}`,
        '', '', '', '', '', '', '', ''
      ]);

      // Employee rows
      for (const emp of employees) {
        payrollData.push([
          emp.employee_number,
          emp.name_ar,
          emp.national_id,
          emp.iban,
          emp.basic_salary,
          emp.housing_allowance,
          emp.other_allowances,
          emp.gosi_deduction,
          emp.net_salary
        ]);

        // Accumulate totals
        grandTotals.basic_salary += emp.basic_salary;
        grandTotals.housing += emp.housing_allowance;
        grandTotals.other += emp.other_allowances;
        grandTotals.gosi += emp.gosi_deduction;
        grandTotals.net += emp.net_salary;
      }

      // Department subtotal
      const deptTotals = employees.reduce((acc, emp) => ({
        basic: acc.basic + emp.basic_salary,
        housing: acc.housing + emp.housing_allowance,
        other: acc.other + emp.other_allowances,
        gosi: acc.gosi + emp.gosi_deduction,
        net: acc.net + emp.net_salary
      }), { basic: 0, housing: 0, other: 0, gosi: 0, net: 0 });

      payrollData.push([
        `إجمالي ${department_name}`,
        '',
        '',
        '',
        deptTotals.basic,
        deptTotals.housing,
        deptTotals.other,
        deptTotals.gosi,
        deptTotals.net
      ]);

      payrollData.push([]); // Empty row between departments
    }

    // STEP 6: Company Total row (Final summary)
    payrollData.push([]);
    payrollData.push([
      'إجمالي الشركة / Company Total',
      '',
      '',
      '',
      grandTotals.basic_salary,
      grandTotals.housing,
      grandTotals.other,
      grandTotals.gosi,
      grandTotals.net
    ]);

    // STEP 7: Verification section
    const totalGross = grandTotals.basic_salary + grandTotals.housing + grandTotals.other;
    payrollData.push([]);
    payrollData.push([
      'التحقق / Verification',
      '', '', '', '', '', '', '', ''
    ]);
    payrollData.push([
      'إجمالي الرواتب (Gross)',
      totalGross,
      '', '', '', '', '', '', ''
    ]);
    payrollData.push([
      'إجمالي التأمينات (GOSI)',
      grandTotals.gosi,
      '', '', '', '', '', '', ''
    ]);
    payrollData.push([
      'صافي الرواتب (Net = Gross - GOSI)',
      grandTotals.net,
      '', '', '', '', '', '', ''
    ]);
    payrollData.push([
      'التوازن (يجب أن يكون 0)',
      totalGross - grandTotals.gosi - grandTotals.net,
      '', '', '', '', '', '', ''
    ]);

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(payrollData);

    // STEP 8: Set column widths (TASK 6-A Refactor: 9 columns)
    worksheet['!cols'] = [
      { wch: 18 }, // Employee No.
      { wch: 35 }, // Employee Name
      { wch: 18 }, // National ID
      { wch: 28 }, // IBAN
      { wch: 16 }, // Basic Salary
      { wch: 14 }, // Housing
      { wch: 18 }, // Other Allowances
      { wch: 20 }, // GOSI Deduction
      { wch: 16 }  // Net Salary
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Report');

    // STEP 9: Generate buffer
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'buffer',
      Props: {
        Title: `Payroll Report - ${getMonthName(currentMonth)} ${currentYear}`,
        Subject: 'Monthly Payroll Export',
        Author: 'Smart Energy ERP System',
        CreatedDate: new Date()
      }
    });

    console.log(`[Excel Export] ✅ Generated Excel file successfully`);
    console.log(`[Excel Export] Total employees: ${employeesResult.rows.length}`);
    console.log(`[Excel Export] COA Groups: ${Object.keys(coaGroups).length}`);
    console.log(`[Excel Export] Grand totals:`);
    console.log(`  Basic: ${grandTotals.basic_salary.toFixed(2)}`);
    console.log(`  Housing: ${grandTotals.housing.toFixed(2)}`);
    console.log(`  Other: ${grandTotals.other.toFixed(2)}`);
    console.log(`  GOSI: ${grandTotals.gosi.toFixed(2)}`);
    console.log(`  Net: ${grandTotals.net.toFixed(2)}`);

    return {
      buffer: excelBuffer,
      filename: `Payroll_${currentYear}_${String(currentMonth).padStart(2, '0')}.xlsx`,
      totals: grandTotals,
      employee_count: employeesResult.rows.length,
      coa_group_count: Object.keys(coaGroups).length
    };

  } catch (error) {
    console.error('[Excel Export] Error:', error);
    throw error;
  }
}

/**
 * Get Arabic month name
 */
function getMonthName(month) {
  const months = [
    '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return months[month] || month;
}

module.exports = {
  exportPayrollToExcel
};
