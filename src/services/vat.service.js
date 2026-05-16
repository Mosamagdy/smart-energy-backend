// ============================================================================
// VAT Configuration & Calculation Service
// Saudi ZATCA Compliance - 15% Standard Rate
// ============================================================================

const { query } = require('../db');

// VAT Configuration
const VAT_CONFIG = {
  standardRate: 0.15, // 15% Saudi VAT
  registrationNumber: process.env.VAT_REGISTRATION_NUMBER || '3XXXXXXXXXXXXXXX', // Replace with actual number
  currency: 'SAR',
  country: 'SA',
  phase2Enabled: process.env.ZATCA_PHASE2 === 'true' || false
};

/**
 * Calculate VAT amount from subtotal
 * @param {number} subtotal - Amount before VAT
 * @param {number} rate - VAT rate (default 15%)
 * @returns {object} VAT calculation breakdown
 */
function calculateVAT(subtotal, rate = VAT_CONFIG.standardRate) {
  const vatAmount = parseFloat((subtotal * rate).toFixed(2));
  const total = parseFloat((subtotal + vatAmount).toFixed(2));
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    vat_rate: rate * 100, // Convert to percentage (15)
    vat_amount: vatAmount,
    total: total,
    currency: VAT_CONFIG.currency
  };
}

/**
 * Reverse calculate VAT from total amount
 * @param {number} total - Amount including VAT
 * @param {number} rate - VAT rate (default 15%)
 * @returns {object} Reverse VAT calculation
 */
function reverseCalculateVAT(total, rate = VAT_CONFIG.standardRate) {
  const subtotal = parseFloat((total / (1 + rate)).toFixed(2));
  const vatAmount = parseFloat((total - subtotal).toFixed(2));
  
  return {
    total: parseFloat(total.toFixed(2)),
    vat_rate: rate * 100,
    vat_amount: vatAmount,
    subtotal: subtotal,
    currency: VAT_CONFIG.currency
  };
}

/**
 * Validate VAT Registration Number (Saudi format)
 * Format: 15 digits starting with 3
 * @param {string} vatNumber - VAT registration number
 * @returns {boolean} Is valid
 */
function validateVATNumber(vatNumber) {
  if (!vatNumber) return false;
  
  // Remove any spaces or dashes
  const cleaned = vatNumber.replace(/[\s-]/g, '');
  
  // Saudi VAT number: 15 digits, starts with 3
  const saudiPattern = /^3\d{14}$/;
  
  return saudiPattern.test(cleaned);
}

/**
 * Get VAT account codes from COA
 * @returns {object} VAT account IDs
 */
async function getVATAccounts() {
  const sql = `
    SELECT 
      account_code,
      id,
      account_name,
      account_name_ar
    FROM chart_of_accounts
    WHERE account_code IN ('2220101', '2220102', '2220103')
      AND is_active = TRUE
  `;
  
  const result = await query(sql);
  
  const accounts = {
    output_vat: null,  // 2220101 - Sales VAT
    input_vat: null,   // 2220102 - Purchase VAT
    net_vat: null      // 2220103 - Net VAT Payable
  };
  
  result.rows.forEach(row => {
    switch (row.account_code) {
      case '2220101':
        accounts.output_vat = row;
        break;
      case '2220102':
        accounts.input_vat = row;
        break;
      case '2220103':
        accounts.net_vat = row;
        break;
    }
  });
  
  // Verify all accounts exist
  if (!accounts.output_vat || !accounts.input_vat || !accounts.net_vat) {
    throw new Error('VAT accounts not found in Chart of Accounts. Run migration 013.');
  }
  
  return accounts;
}

/**
 * Calculate VAT for invoice line item
 * @param {object} item - Invoice line item
 * @param {number} item.quantity
 * @param {number} item.unit_price
 * @param {number} item.vat_rate (optional, defaults to 15%)
 * @returns {object} Line item with VAT
 */
function calculateLineItemVAT(item) {
  const lineSubtotal = item.quantity * item.unit_price;
  const vatRate = item.vat_rate !== undefined ? item.vat_rate / 100 : VAT_CONFIG.standardRate;
  const lineVAT = parseFloat((lineSubtotal * vatRate).toFixed(2));
  const lineTotal = parseFloat((lineSubtotal + lineVAT).toFixed(2));
  
  return {
    ...item,
    line_subtotal: parseFloat(lineSubtotal.toFixed(2)),
    vat_rate: vatRate * 100,
    vat_amount: lineVAT,
    line_total: lineTotal
  };
}

/**
 * Calculate total VAT for entire invoice
 * @param {Array} items - Invoice line items
 * @returns {object} Invoice VAT summary
 */
function calculateInvoiceVAT(items) {
  let totalSubtotal = 0;
  let totalVAT = 0;
  
  const itemsWithVAT = items.map(item => {
    const calculated = calculateLineItemVAT(item);
    totalSubtotal += calculated.line_subtotal;
    totalVAT += calculated.vat_amount;
    return calculated;
  });
  
  const total = parseFloat((totalSubtotal + totalVAT).toFixed(2));
  
  return {
    items: itemsWithVAT,
    subtotal: parseFloat(totalSubtotal.toFixed(2)),
    vat_amount: parseFloat(totalVAT.toFixed(2)),
    total: total,
    currency: VAT_CONFIG.currency
  };
}

/**
 * Get VAT summary for a specific period
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {object} VAT summary
 */
async function getVATSummary(startDate, endDate) {
  // Output VAT (Sales)
  const outputVATResult = await query(
    `SELECT COALESCE(SUM(tax_amount), 0) as total_output_vat
     FROM invoices
     WHERE issue_date >= $1 AND issue_date <= $2
       AND status != 'cancelled'`,
    [startDate, endDate]
  );
  
  // Input VAT (Purchases/Expenses)
  const inputVATResult = await query(
    `SELECT COALESCE(SUM(e.amount * 0.15), 0) as total_input_vat
     FROM expenses e
     JOIN chart_of_accounts coa ON coa.id = e.account_id
     WHERE e.expense_date >= $1 AND e.expense_date <= $2
       AND e.status = 'approved'
       AND coa.is_vat_applicable = TRUE`,
    [startDate, endDate]
  );
  
  const outputVAT = parseFloat(outputVATResult.rows[0].total_output_vat);
  const inputVAT = parseFloat(inputVATResult.rows[0].total_input_vat);
  const netVAT = parseFloat((outputVAT - inputVAT).toFixed(2));
  
  return {
    period_start: startDate,
    period_end: endDate,
    output_vat: outputVAT,  // VAT on sales
    input_vat: inputVAT,    // VAT on purchases
    net_vat_payable: netVAT, // Amount to pay to ZATCA
    currency: VAT_CONFIG.currency,
    vat_registration_number: VAT_CONFIG.registrationNumber
  };
}

/**
 * Generate VAT Return data for ZATCA submission
 * @param {string} period - Quarter format: Q1-2026, Q2-2026, etc.
 * @returns {object} VAT return data
 */
async function generateVATReturn(period) {
  // Parse period (e.g., "Q1-2026")
  const [quarter, year] = period.split('-');
  const quarterNum = parseInt(quarter.replace('Q', ''));
  
  // Calculate quarter dates
  const startDate = new Date(year, (quarterNum - 1) * 3, 1);
  const endDate = new Date(year, quarterNum * 3, 0); // Last day of quarter
  
  const summary = await getVATSummary(startDate, endDate);
  
  return {
    period: period,
    ...summary,
    filing_status: 'pending', // pending, filed, accepted, rejected
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  VAT_CONFIG,
  calculateVAT,
  reverseCalculateVAT,
  validateVATNumber,
  getVATAccounts,
  calculateLineItemVAT,
  calculateInvoiceVAT,
  getVATSummary,
  generateVATReturn
};
