const { pool, query } = require('../../db');
const journalService = require('../journal-entries/journal-entries.service');
const coaRepo = require('../coa/coa.repository');

// ============================================================================
// Credit Notes Service - ZATCA Compliant Sales Returns
// ============================================================================

/**
 * Create a new credit note
 */
async function createCreditNote(data, currentUser) {
  const {
    invoice_id,
    reason,
    return_date,
    items,
    notes
  } = data;

  // Validate required fields
  if (!invoice_id || !reason) {
    const err = new Error('رقم الفاتورة والسبب مطلوبان');
    err.statusCode = 400;
    throw err;
  }

  const client_db = await pool.connect();

  try {
    await client_db.query('BEGIN');

    // 1. Get original invoice
    const invoiceResult = await client_db.query(
      `SELECT si.*, u.id as client_user_id
       FROM sales_invoices si
       LEFT JOIN leads l ON si.lead_id = l.id
       LEFT JOIN users u ON l.client_user_id = u.id
       WHERE si.id = $1`,
      [invoice_id]
    );

    const invoice = invoiceResult.rows[0];

    if (!invoice) {
      const err = new Error('الفاتورة الأصلية غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    if (invoice.status !== 'final') {
      const err = new Error('لا يمكن إرجاع فاتورة غير نهائية');
      err.statusCode = 400;
      throw err;
    }

    // 2. Validate return amount doesn't exceed original invoice
    const existingReturns = await client_db.query(
      `SELECT COALESCE(SUM(total_amount), 0) as returned_amount
       FROM credit_notes
       WHERE invoice_id = $1 AND status != 'cancelled'`,
      [invoice_id]
    );

    const returnedAmount = parseFloat(existingReturns.rows[0].returned_amount);
    const newTotal = parseFloat(data.total_amount);

    if (returnedAmount + newTotal > parseFloat(invoice.total_amount)) {
      const err = new Error(`مبلغ المرتجع يتجاوز إجمالي الفاتورة. المتبقي: ${(invoice.total_amount - returnedAmount).toFixed(2)} SAR`);
      err.statusCode = 400;
      throw err;
    }

    // 3. Calculate financials
    const subtotal = parseFloat(data.subtotal);
    const discountAmount = parseFloat(data.discount_amount || 0);
    const taxRate = parseFloat(data.tax_rate || 15);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = parseFloat((taxableAmount * taxRate / 100).toFixed(2));
    const totalAmount = parseFloat((taxableAmount + taxAmount).toFixed(2));

    // 4. Get required accounts
    // Account 4112 - Sales Returns (مردودات المبيعات)
    const returnsAccount = await coaRepo.getAccountByCode('4112');
    if (!returnsAccount) {
      const err = new Error('حساب مردودات المبيعات (4112) غير موجود');
      err.statusCode = 500;
      throw err;
    }

    // VAT Output account (22101) - reverse the VAT for returns
  const vatAccount = await coaRepo.getAccountByCode('2220101');
  if (!vatAccount) {
    const err = new Error('حساب الضريبة (2220101) غير موجود');
    err.statusCode = 500;
    throw err;
  }

    // Client AR Account - Get account ID from chart_of_accounts
    const arAccount = await client_db.query(
      `SELECT id FROM chart_of_accounts 
       WHERE account_code LIKE '121%' AND is_active = TRUE
       LIMIT 1`
    );

    if (!arAccount.rows[0]) {
      const err = new Error('حساب الذمم المدينة غير موجود');
      err.statusCode = 500;
      throw err;
    }

    // 5. Create credit note
    const creditNoteResult = await client_db.query(
      `INSERT INTO credit_notes 
       (invoice_id, client_id, project_id, lead_id,
        subtotal, discount_amount, tax_rate, tax_amount, total_amount,
        reason, return_date, status,
        revenue_account_id, tax_account_id, discount_account_id, receivable_account_id,
        notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        invoice_id,
        invoice.client_id || invoice.client_user_id,
        invoice.project_id,
        invoice.lead_id,
        subtotal,
        discountAmount,
        taxRate,
        taxAmount,
        totalAmount,
        reason,
        return_date || new Date(),
        returnsAccount.id,
        vatAccount.id,
        discountAmount > 0 ? (await coaRepo.getAccountByCode('4113'))?.id : null,
        arAccount.rows[0].id, // Use id, not account_id
        notes || null,
        currentUser.id
      ]
    );

    const creditNote = creditNoteResult.rows[0];

    // 6. Create credit note items
    if (items && items.length > 0) {
      for (const item of items) {
        const lineSubtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
        const lineDiscount = parseFloat(item.discount_amount || 0);
        const lineTaxable = lineSubtotal - lineDiscount;
        const lineTax = parseFloat((lineTaxable * parseFloat(item.tax_rate || 15) / 100).toFixed(2));
        const lineTotal = parseFloat((lineTaxable + lineTax).toFixed(2));

        await client_db.query(
          `INSERT INTO credit_note_items 
           (credit_note_id, description, quantity, unit_price, discount_amount, tax_rate, tax_amount, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            creditNote.id,
            item.description,
            item.quantity,
            item.unit_price,
            lineDiscount,
            item.tax_rate || 15,
            lineTax,
            lineTotal
          ]
        );
      }
    }

    // 7. Create Journal Entry for Credit Note
    // DEBIT: Sales Returns (4112) - subtotal
    // DEBIT: VAT Account - tax_amount (reversing the VAT)
    // CREDIT: Client AR Account - total_amount
    const entryResult = await client_db.query(
      `INSERT INTO journal_entries 
       (entry_date, description, reference_type, reference_id, entry_type, posted_by, is_posted)
       VALUES ($1, $2, 'credit_note', $3, 'auto', $4, true)
       RETURNING id`,
      [creditNote.return_date, `Credit Note #${creditNote.credit_note_number}`, creditNote.id, currentUser.id]
    );

    const journalEntryId = entryResult.rows[0].id;

    // Create journal entry lines
    const journalLines = [
      {
        account_id: returnsAccount.id,
        debit_amount: subtotal,
        credit_amount: 0,
        description: `مرتجع مبيعات - ${creditNote.credit_note_number}`
      },
      {
        account_id: vatAccount.id,
        debit_amount: taxAmount,
        credit_amount: 0,
        description: `ضريبة مرتجع مبيعات - ${creditNote.credit_note_number}`
      },
      {
        account_id: arAccount.rows[0].id, // Use id from the query result
        debit_amount: 0,
        credit_amount: totalAmount,
        description: `عميل - مرتجع ${creditNote.credit_note_number}`
      }
    ];

    // Add discount line if applicable
    if (discountAmount > 0) {
      const discountAccount = await coaRepo.getAccountByCode('4113');
      if (discountAccount) {
        journalLines.splice(1, 0, {
          account_id: discountAccount.id,
          debit_amount: discountAmount,
          credit_amount: 0,
          description: `خصم مرتجع - ${creditNote.credit_note_number}`
        });
      }
    }

    // Insert journal lines
    for (const line of journalLines) {
      await client_db.query(
        `INSERT INTO journal_entry_lines 
         (journal_entry_id, account_id, description, debit_amount, credit_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [journalEntryId, line.account_id, line.description, line.debit_amount, line.credit_amount]
      );
    }

    console.log(`[CreditNote] Journal Entry created for ${creditNote.credit_note_number}:`);
    console.log(`   DEBIT  4112 (Returns):    SAR ${subtotal}`);
    if (discountAmount > 0) {
      console.log(`   DEBIT  4113 (Discount):   SAR ${discountAmount}`);
    }
    console.log(`   DEBIT  VAT Account:        SAR ${taxAmount}`);
    console.log(`   CREDIT Client AR:          SAR ${totalAmount}`);

    await client_db.query('COMMIT');

    return {
      ...creditNote,
      journal_entry_id: journalEntryId
    };

  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
}

/**
 * Get all credit notes with filters
 */
async function getAllCreditNotes(filters = {}) {
  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (filters.invoice_id) {
    whereClause += ` AND cn.invoice_id = $${paramCount}`;
    values.push(filters.invoice_id);
    paramCount++;
  }

  if (filters.client_id) {
    whereClause += ` AND cn.client_id = $${paramCount}`;
    values.push(filters.client_id);
    paramCount++;
  }

  if (filters.status) {
    whereClause += ` AND cn.status = $${paramCount}`;
    values.push(filters.status);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       cn.*,
       si.invoice_number as original_invoice_number,
       u.first_name || ' ' || u.last_name as client_name,
       p.name as project_name
     FROM credit_notes cn
     LEFT JOIN sales_invoices si ON si.id = cn.invoice_id
     LEFT JOIN users u ON u.id = cn.client_id
     LEFT JOIN projects p ON p.id = cn.project_id
     ${whereClause}
     ORDER BY cn.return_date DESC`,
    values
  );

  return result.rows;
}

/**
 * Get credit note by ID
 */
async function getCreditNoteById(id) {
  const result = await query(
    `SELECT 
       cn.*,
       si.invoice_number as original_invoice_number,
       u.first_name || ' ' || u.last_name as client_name
     FROM credit_notes cn
     LEFT JOIN sales_invoices si ON si.id = cn.invoice_id
     LEFT JOIN users u ON u.id = cn.client_id
     WHERE cn.id = $1`,
    [id]
  );

  const creditNote = result.rows[0];

  if (creditNote) {
    // Get items
    const itemsResult = await query(
      `SELECT * FROM credit_note_items WHERE credit_note_id = $1 ORDER BY id`,
      [id]
    );
    creditNote.items = itemsResult.rows;
  }

  return creditNote;
}

/**
 * Finalize credit note (change status from draft to final)
 */
async function finalizeCreditNote(id, currentUser) {
  const result = await query(
    `UPDATE credit_notes 
     SET status = 'final', updated_at = NOW()
     WHERE id = $1 AND status = 'draft'
     RETURNING *`,
    [id]
  );

  if (!result.rows[0]) {
    const err = new Error('لا يمكن تأكيد المرتجع');
    err.statusCode = 400;
    throw err;
  }

  return result.rows[0];
}

module.exports = {
  createCreditNote,
  getAllCreditNotes,
  getCreditNoteById,
  finalizeCreditNote
};
