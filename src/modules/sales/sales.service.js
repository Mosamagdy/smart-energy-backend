const { Pool } = require('pg');
const { generateSalesInvoicePDF } = require('../../services/sales-invoice-pdf.service');
const repo = require('./sales.repository');

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  max: Number(process.env.DATABASE_MAX_POOL_SIZE) || 10,
  idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
  ssl: { rejectUnauthorized: false }
});

// ============================================================================
// Sales Module Service - Business Logic Layer
// ============================================================================

/**
 * Process a Won Lead:
 * 1. Ensure client exists in users table with role='client'
 * 2. Create COA sub-account under 121 (Accounts Receivable)
 * 3. Link project.client_id to the client user
 * 
 * This is an ACID transaction - all or nothing
 */
async function processWonLead(leadId, userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Get lead details (FIXED: Added LIMIT 1 to prevent duplicate rows)
    const leadResult = await client.query(
      `SELECT l.*, p.id as project_id 
       FROM leads l 
       LEFT JOIN projects p ON p.lead_id = l.id
       WHERE l.id = $1 AND l.status = 'won'
       LIMIT 1`,
      [leadId]
    );
    
    if (!leadResult.rows[0]) {
      const error = new Error('Lead not found or status is not "won"');
      error.statusCode = 404;
      throw error;
    }
    
    const lead = leadResult.rows[0];
    console.log(`[processWonLead] Processing Lead #${lead.id} - ${lead.client_name}`);
    
    // 2. Ensure client user exists
    let clientUserId = lead.client_user_id;
    
    if (!clientUserId) {
      console.log(`[processWonLead] Creating client user for ${lead.client_name}`);
      
      // Get client role ID
      const roleResult = await client.query(
        "SELECT id FROM roles WHERE name = 'client'"
      );
      
      if (!roleResult.rows[0]) {
        const error = new Error('Client role not found in database');
        error.statusCode = 500;
        throw error;
      }
      
      const roleId = roleResult.rows[0].id;
      
      // Create user with client role
      const names = lead.client_name.split(' ');
      const firstName = names[0] || lead.client_name;
      const lastName = names.slice(1).join(' ') || '';
      
      const userResult = await client.query(
        `INSERT INTO users (first_name, last_name, email, role_id, status, is_first_login, username)
         VALUES ($1, $2, $3, $4, 'active', true, $5)
         RETURNING id`,
        [
          firstName,
          lastName,
          lead.contact_email || `${firstName.toLowerCase()}${Date.now()}@client.local`,
          roleId,
          lead.contact_email || `client_${Date.now()}`
        ]
      );
      
      clientUserId = userResult.rows[0].id;
      console.log(`[processWonLead] Created client user ID: ${clientUserId}`);
      
      // Update lead with client_user_id
      await client.query(
        'UPDATE leads SET client_user_id = $1 WHERE id = $2',
        [clientUserId, leadId]
      );
    } else {
      console.log(`[processWonLead] Client user already exists: ${clientUserId}`);
    }
    
    // 3. Create COA sub-account under 121
    console.log(`[processWonLead] Creating AR sub-account for client`);
    
    // Get parent account (121)
    const parentResult = await client.query(
      'SELECT id, account_code FROM chart_of_accounts WHERE account_code = \'121\''
    );
    
    if (!parentResult.rows[0]) {
      const error = new Error('Parent account 121 (Accounts Receivable) not found');
      error.statusCode = 500;
      throw error;
    }
    
    const parentId = parentResult.rows[0].id;
    
    // Generate unique account code: 121001, 121002, etc.
    const lastAccountResult = await client.query(
      `SELECT account_code 
       FROM chart_of_accounts 
       WHERE account_code LIKE '121%' AND account_code != '121'
       ORDER BY account_code DESC 
       LIMIT 1`
    );
    
    let newAccountCode = '121001';
    if (lastAccountResult.rows.length > 0) {
      const lastCode = parseInt(lastAccountResult.rows[0].account_code);
      newAccountCode = String(lastCode + 1).padStart(6, '0');
    }
    
    console.log(`[processWonLead] New account code: ${newAccountCode}`);
    
    // Create account
    const accountNameEn = `${lead.client_name} - AR`;
    const accountNameAr = `${lead.client_name} - مدينون`;
    
    const coaResult = await client.query(
      `INSERT INTO chart_of_accounts 
       (account_code, account_name, account_name_ar, account_type, parent_id, normal_balance, is_active, is_vat_applicable)
       VALUES ($1, $2, $3, 'asset', $4, 'debit', true, false)
       RETURNING id`,
      [newAccountCode, accountNameEn, accountNameAr, parentId]
    );
    
    const receivableAccountId = coaResult.rows[0].id;
    console.log(`[processWonLead] Created AR account ID: ${receivableAccountId}`);
    
    // 4. Link project client_id
    if (lead.project_id) {
      console.log(`[processWonLead] Linking project ${lead.project_id} to client ${clientUserId}`);
      
      await client.query(
        'UPDATE projects SET client_id = $1 WHERE id = $2',
        [clientUserId, lead.project_id]
      );
    }
    
    // 5. Save receivable_account_id to leads table (NEW COLUMN - Option A)
    console.log(`[processWonLead] Saving receivable_account_id ${receivableAccountId} to lead ${leadId}`);
    await client.query(
      'UPDATE leads SET receivable_account_id = $1 WHERE id = $2',
      [receivableAccountId, leadId]
    );
    
    await client.query('COMMIT');
    console.log(`[processWonLead] ✅ Successfully processed Lead #${lead.id}`);
    console.log(`[processWonLead] ✅ Receivable account saved: ${receivableAccountId}`);
    
    return {
      success: true,
      lead_id: leadId,
      client_user_id: clientUserId,
      receivable_account_id: receivableAccountId,
      account_code: newAccountCode,
      project_id: lead.project_id
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[processWonLead] ❌ Failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create Sales Invoice with automatic journal entry:
 * DEBIT: Client AR Account (121xxx)
 * CREDIT: Revenue Account (41xxx)
 * CREDIT: VAT Output (22101)
 */
async function createSalesInvoice(data, userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`[createSalesInvoice] Creating invoice for client ${data.client_id}`);
    
    // 1. Validate and calculate with discount
    const vatRate = data.vat_rate ? parseFloat(data.vat_rate) : 0;
    const subtotal = parseFloat(data.subtotal);
    const discountAmount = data.discount_amount ? parseFloat(data.discount_amount) : 0;
    
    if (isNaN(subtotal) || subtotal <= 0) {
      const error = new Error('Invalid subtotal amount');
      error.statusCode = 400;
      throw error;
    }
    
    if (discountAmount < 0 || discountAmount > subtotal) {
      const error = new Error('Discount amount must be between 0 and subtotal');
      error.statusCode = 400;
      throw error;
    }
    
    // Calculate taxable amount after discount
    const taxableAmount = subtotal - discountAmount;
    
    // Calculate VAT only if vatRate > 0 (on discounted amount)
    const vatAmount = vatRate > 0 ? parseFloat(((taxableAmount * vatRate) / 100).toFixed(2)) : 0;
    const totalAmount = parseFloat((taxableAmount + vatAmount).toFixed(2));
    
    console.log(`[createSalesInvoice] Subtotal: ${subtotal}, Discount: ${discountAmount}, Taxable: ${taxableAmount}, VAT (${vatRate}%): ${vatAmount}, Total: ${totalAmount}`);
    
    // 2. Generate invoice number (SI-YYYY-NNNN)
    const year = new Date().getFullYear();
    const countResult = await client.query(
      'SELECT COUNT(*) FROM sales_invoices WHERE EXTRACT(YEAR FROM issue_date) = $1',
      [year]
    );
    
    const invoiceNumber = `SI-${year}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;
    console.log(`[createSalesInvoice] Invoice Number: ${invoiceNumber}`);
    
    // 3. Get client's AR account
    const leadResult = await client.query(
      'SELECT client_user_id, client_name FROM leads WHERE id = $1',
      [data.lead_id]
    );
    
    if (!leadResult.rows[0]) {
      const error = new Error('Lead not found');
      error.statusCode = 404;
      throw error;
    }
    
    const leadName = leadResult.rows[0].client_name;
    
    // Find client's AR account
    const coaResult = await client.query(
      `SELECT id, account_code, account_name 
       FROM chart_of_accounts 
       WHERE account_code LIKE '121%' 
       AND account_name LIKE $1
       AND account_type = 'asset'`,
      [`%${leadName}%`]
    );
    
    if (!coaResult.rows[0]) {
      const error = new Error(`Client AR account not found. Process won lead first.`);
      error.statusCode = 400;
      throw error;
    }
    
    const receivableAccountId = coaResult.rows[0].id;
    console.log(`[createSalesInvoice] Using AR Account: ${coaResult.rows[0].account_code}`);
    
    // 4. Validate revenue account
    const revenueResult = await client.query(
      'SELECT id, account_code FROM chart_of_accounts WHERE id = $1 AND account_code LIKE \'41%\'',
      [data.revenue_account_id]
    );
    
    if (!revenueResult.rows[0]) {
      const error = new Error('Invalid revenue account. Must be from 41xxx branch.');
      error.statusCode = 400;
      throw error;
    }
    
    // 5. Validate VAT account (only if VAT > 0)
    let vatAccountId = null;
    if (vatAmount > 0) {
      const vatResult = await client.query(
        'SELECT id, account_code FROM chart_of_accounts WHERE account_code = \'22101\''
      );
      
      if (!vatResult.rows[0]) {
        const error = new Error('VAT account 22101 not found');
        error.statusCode = 500;
        throw error;
      }
      
      vatAccountId = vatResult.rows[0].id;
    }
    
    // 5.5. Validate discount account (only if discount > 0)
    let discountAccountId = null;
    if (discountAmount > 0) {
      const discountResult = await client.query(
        'SELECT id, account_code FROM chart_of_accounts WHERE account_code = \'4113\''
      );
      
      if (!discountResult.rows[0]) {
        const error = new Error('Discount account 4113 (الحسم الممنوح) not found');
        error.statusCode = 500;
        throw error;
      }
      
      discountAccountId = discountResult.rows[0].id;
      console.log(`[createSalesInvoice] Using Discount Account: 4113`);
    }
    
    // 6. Create invoice
    const invoiceResult = await client.query(
      `INSERT INTO sales_invoices 
       (invoice_number, project_id, client_id, lead_id, issue_date, due_date, 
        subtotal, discount_amount, vat_rate, vat_amount, total_amount, 
        receivable_account_id, revenue_account_id, vat_account_id, discount_account_id,
        description, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        invoiceNumber, 
        data.project_id || null, 
        data.client_id, 
        data.lead_id,
        data.issue_date || new Date(), 
        data.due_date || null,
        subtotal, 
        discountAmount,
        vatRate, 
        vatAmount, 
        totalAmount,
        receivableAccountId, 
        data.revenue_account_id, 
        vatAccountId,
        discountAccountId,
        data.description || `Sales Invoice for ${leadName}`,
        data.notes || null,
        userId
      ]
    );
    
    const invoice = invoiceResult.rows[0];
    console.log(`[createSalesInvoice] Invoice created: ${invoice.id}`);
    
    // 6.5. Save line items to sales_invoice_items table
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      console.log(`[createSalesInvoice] Saving ${data.items.length} line items...`);
      
      const { createInvoiceItems } = require('./sales.repository');
      await createInvoiceItems(invoice.id, data.items, client);
      
      console.log(`[createSalesInvoice] ✅ Line items saved successfully`);
    } else {
      console.warn(`[createSalesInvoice] ⚠️ No line items provided in request`);
    }
    
    // 7. Create automatic journal entry
    const entryResult = await client.query(
      `INSERT INTO journal_entries 
       (entry_date, description, reference_type, reference_id, entry_type, posted_by, is_posted)
       VALUES ($1, $2, 'sales_invoice', $3, 'auto', $4, true)
       RETURNING id`,
      [invoice.issue_date, `Sales Invoice #${invoiceNumber}`, invoice.id, userId]
    );
    
    const journalEntryId = entryResult.rows[0].id;
    console.log(`[createSalesInvoice] Journal Entry created: ${journalEntryId}`);
    
    // 8. Create journal entry lines (BALANCED)
    // DEBIT: Client AR Account (totalAmount)
    // DEBIT: Discount Account 4113 (discountAmount) - if discount > 0
    // CREDIT: Revenue Account (subtotal)
    // CREDIT: VAT Account (vatAmount) - only if VAT > 0
    
    if (discountAmount > 0 && discountAccountId) {
      // WITH DISCOUNT: 4 lines (if VAT) or 3 lines (if no VAT)
      if (vatAmount > 0 && vatAccountId) {
        // With VAT + Discount: 4 lines
        await client.query(
          `INSERT INTO journal_entry_lines 
           (journal_entry_id, account_id, description, debit_amount, credit_amount)
           VALUES 
           ($1, $2, $3, $4, 0),
           ($1, $5, $6, $7, 0),
           ($1, $8, $9, 0, $10),
           ($1, $11, $12, 0, $13)`,
          [
            journalEntryId,
            receivableAccountId, 
            `Sales Invoice #${invoiceNumber}`, 
            totalAmount,
            discountAccountId,
            `Sales Invoice #${invoiceNumber} - Discount`,
            discountAmount,
            data.revenue_account_id, 
            `Sales Invoice #${invoiceNumber}`, 
            subtotal,
            vatAccountId, 
            `Sales Invoice #${invoiceNumber}`, 
            vatAmount
          ]
        );
        
        console.log(`[createSalesInvoice] Journal Entry Lines (with VAT + Discount):`);
        console.log(`   DEBIT  ${coaResult.rows[0].account_code}: SAR ${totalAmount}`);
        console.log(`   DEBIT  4113 (Discount): SAR ${discountAmount}`);
        console.log(`   CREDIT ${revenueResult.rows[0].account_code}: SAR ${subtotal}`);
        console.log(`   CREDIT 22101 (VAT): SAR ${vatAmount}`);
      } else {
        // Without VAT, With Discount: 3 lines
        await client.query(
          `INSERT INTO journal_entry_lines 
           (journal_entry_id, account_id, description, debit_amount, credit_amount)
           VALUES 
           ($1, $2, $3, $4, 0),
           ($1, $5, $6, $7, 0),
           ($1, $8, $9, 0, $10)`,
          [
            journalEntryId,
            receivableAccountId, 
            `Sales Invoice #${invoiceNumber}`, 
            totalAmount,
            discountAccountId,
            `Sales Invoice #${invoiceNumber} - Discount`,
            discountAmount,
            data.revenue_account_id, 
            `Sales Invoice #${invoiceNumber}`, 
            subtotal
          ]
        );
        
        console.log(`[createSalesInvoice] Journal Entry Lines (no VAT, with Discount):`);
        console.log(`   DEBIT  ${coaResult.rows[0].account_code}: SAR ${totalAmount}`);
        console.log(`   DEBIT  4113 (Discount): SAR ${discountAmount}`);
        console.log(`   CREDIT ${revenueResult.rows[0].account_code}: SAR ${subtotal}`);
      }
    } else if (vatAmount > 0 && vatAccountId) {
      // With VAT: 3 lines
      await client.query(
        `INSERT INTO journal_entry_lines 
         (journal_entry_id, account_id, description, debit_amount, credit_amount)
         VALUES 
         ($1, $2, $3, $4, 0),
         ($1, $5, $6, 0, $7),
         ($1, $8, $9, 0, $10)`,
        [
          journalEntryId,
          receivableAccountId, 
          `Sales Invoice #${invoiceNumber}`, 
          totalAmount,
          data.revenue_account_id, 
          `Sales Invoice #${invoiceNumber}`, 
          subtotal,
          vatAccountId, 
          `Sales Invoice #${invoiceNumber}`, 
          vatAmount
        ]
      );
      
      console.log(`[createSalesInvoice] Journal Entry Lines (with VAT):`);
      console.log(`   DEBIT  ${coaResult.rows[0].account_code}: SAR ${totalAmount}`);
      console.log(`   CREDIT ${revenueResult.rows[0].account_code}: SAR ${subtotal}`);
      console.log(`   CREDIT 22101: SAR ${vatAmount}`);
    } else {
      // Without VAT: 2 lines only
      await client.query(
        `INSERT INTO journal_entry_lines 
         (journal_entry_id, account_id, description, debit_amount, credit_amount)
         VALUES 
         ($1, $2, $3, $4, 0),
         ($1, $5, $6, 0, $7)`,
        [
          journalEntryId,
          receivableAccountId, 
          `Sales Invoice #${invoiceNumber}`, 
          totalAmount,
          data.revenue_account_id, 
          `Sales Invoice #${invoiceNumber}`, 
          subtotal
        ]
      );
      
      console.log(`[createSalesInvoice] Journal Entry Lines (no VAT):`);
      console.log(`   DEBIT  ${coaResult.rows[0].account_code}: SAR ${totalAmount}`);
      console.log(`   CREDIT ${revenueResult.rows[0].account_code}: SAR ${subtotal}`);
    }
    
    // 9. Update invoice with journal_entry_id
    await client.query(
      'UPDATE sales_invoices SET journal_entry_id = $1 WHERE id = $2',
      [journalEntryId, invoice.id]
    );
    
    await client.query('COMMIT');
    console.log(`[createSalesInvoice] Invoice and Journal Entry created successfully`);
    
    // 10. Generate PDF (outside transaction to avoid long locks)
    let pdfPath = null;
    try {
      console.log(`[createSalesInvoice] Generating PDF...`);
      
      // Get full invoice data WITH ITEMS for PDF generation
      const fullInvoice = await repo.getSalesInvoiceWithItems(invoice.id);
      
      console.log(`[createSalesInvoice] PDF data: ${fullInvoice.items?.length || 0} items loaded`);
      
      const pdfResult = await generateSalesInvoicePDF(fullInvoice);
      pdfPath = pdfResult.relativePath;
      
      // Update invoice with pdf_path
      await pool.query(
        'UPDATE sales_invoices SET pdf_path = $1 WHERE id = $2',
        [pdfPath, invoice.id]
      );
      
      console.log(`[createSalesInvoice] ✅ PDF generated: ${pdfPath}`);
    } catch (pdfError) {
      console.error(`[createSalesInvoice] ⚠️ PDF generation failed: ${pdfError.message}`);
      // Don't fail the invoice creation if PDF generation fails
    }
    
    return {
      success: true,
      invoice: invoice,
      pdf_path: pdfPath,
      journal_entry_id: journalEntryId,
      journal_entry_details: {
        debit: { 
          account_code: coaResult.rows[0].account_code,
          account_name: coaResult.rows[0].account_name,
          amount: totalAmount 
        },
        credit_revenue: { 
          account_code: revenueResult.rows[0].account_code,
          amount: subtotal 
        },
        credit_vat: { 
          account_code: '22101',
          amount: vatAmount 
        },
        total_debit: totalAmount,
        total_credit: parseFloat((subtotal + vatAmount).toFixed(2)),
        is_balanced: Math.abs(totalAmount - (subtotal + vatAmount)) < 0.01
      }
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[createSalesInvoice] ❌ Failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all won leads with processing status
 * Based on LIVE schema inspection (2026-04-21)
 * Updated: receivable_account_id column added to leads table (Option A)
 */
async function getWonLeads() {
  console.log('[getWonLeads] === STARTING QUERY ===');
  
  try {
    // Query won leads with project info and receivable account
    // Verified columns from live schema:
    // leads: id, client_name, contact_email, status, client_user_id, contact_phone, estimated_value, created_at, receivable_account_id
    // projects: id, name, lead_id
    const result = await pool.query(`
      SELECT 
          p.id as project_id, 
          p.name as project_name,
          l.id as lead_id, 
          l.client_name, 
          l.contact_email, 
          l.status as lead_status,
          l.client_user_id,
          l.contact_phone,
          l.estimated_value,
          l.created_at,
          l.receivable_account_id,
          ca.account_code as receivable_account_code
      FROM projects p
      INNER JOIN leads l ON p.lead_id = l.id
      LEFT JOIN chart_of_accounts ca ON ca.id = l.receivable_account_id
      WHERE l.status = 'won'
      ORDER BY l.created_at DESC
    `);
    
    console.log(`[getWonLeads] ✅ Query completed. Found ${result.rows.length} rows`);
    console.log('[getWonLeads] Returning results...');
    return result.rows;
  } catch (error) {
    console.error('[getWonLeads] ❌ Query FAILED:', error.message);
    console.error('[getWonLeads] Error stack:', error.stack);
    throw error; // Re-throw so controller can handle it
  }
}

/**
 * Get all sales invoices with client and project info
 */
async function getSalesInvoices(filters = {}) {
  let query = `
    SELECT 
      si.*,
      l.client_name,
      l.contact_email,
      p.name as project_name,
      je.entry_number as journal_entry_number
    FROM sales_invoices si
    LEFT JOIN leads l ON si.lead_id = l.id
    LEFT JOIN projects p ON si.project_id = p.id
    LEFT JOIN journal_entries je ON si.journal_entry_id = je.id
    WHERE 1=1
  `;
  
  const params = [];
  let paramIndex = 1;
  
  if (filters.status) {
    query += ` AND si.status = $${paramIndex}`;
    params.push(filters.status);
    paramIndex++;
  }
  
  if (filters.client_id) {
    query += ` AND si.client_id = $${paramIndex}`;
    params.push(filters.client_id);
    paramIndex++;
  }
  
  if (filters.lead_id) {
    query += ` AND si.lead_id = $${paramIndex}`;
    params.push(filters.lead_id);
    paramIndex++;
  }
  
  query += ' ORDER BY si.created_at DESC';
  
  const result = await pool.query(query, params);
  
  // DEBUG: Log first invoice to verify is_tax_invoice field
  if (result.rows.length > 0) {
    const firstInvoice = result.rows[0];
    console.log(`[getSalesInvoices] First invoice fields:`, {
      id: firstInvoice.id,
      invoice_number: firstInvoice.invoice_number,
      status: firstInvoice.status,
      is_tax_invoice: firstInvoice.is_tax_invoice,
      tax_invoice_id: firstInvoice.tax_invoice_id,
      has_all_fields: 'is_tax_invoice' in firstInvoice
    });
  }
  
  return result.rows;
}

/**
 * Get single invoice by ID
 */
async function getSalesInvoiceById(invoiceId) {
  const invoice = await repo.getSalesInvoiceWithItems(invoiceId);
  
  if (!invoice) {
    return null;
  }
  
  return invoice;
}

/**
 * Finalize sales invoice - BRUTE FORCE MODE
 * Updates status to 'final' regardless of current state
 * DEDUCTS STOCK from warehouse if warehouse_id is provided
 */
async function finalizeSalesInvoice(invoiceId, userId, warehouseId = null) {
  console.log(`[Finalize Sales Invoice] ===== LINE ITEM MODE =====`);
  console.log(`[Finalize Sales Invoice] Invoice ID: ${invoiceId}`);
  console.log(`[Finalize Sales Invoice] User ID: ${userId}`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Step 1: Lock and validate invoice
    const invoiceLockResult = await client.query(
      `SELECT * FROM sales_invoices WHERE id = $1 FOR UPDATE`,
      [invoiceId]
    );
    const invoice = invoiceLockResult.rows[0];

    if (!invoice) {
      const err = new Error(`فاتورة المبيعات #${invoiceId} غير موجودة`);
      err.statusCode = 404;
      throw err;
    }

    if (invoice.status === 'final') {
      const err = new Error('الفاتورة معتمدة مسبقًا');
      err.statusCode = 400;
      throw err;
    }

    // Step 2: Load invoice items and validate stock
    const invoiceWithItems = await repo.getSalesInvoiceWithItems(invoiceId);
    if (!invoiceWithItems?.items?.length) {
      const err = new Error('الفاتورة لا تحتوي على أصناف');
      err.statusCode = 400;
      throw err;
    }

    let totalCogs = 0;
    const inventoryAccountCache = new Map();
    const cogsAccountCache = new Map();
    const cogsLines = [];

    for (const item of invoiceWithItems.items) {
      const quantityToDeduct = parseFloat(item.quantity);
      const costPerUnit = parseFloat(item.unit_cost || 0);
      const lineCogs = parseFloat((quantityToDeduct * costPerUnit).toFixed(2));

      const stockResult = await client.query(
        `SELECT quantity_on_hand, reserved_quantity, available_quantity
         FROM warehouse_stock
         WHERE warehouse_id = $1 AND item_id = $2
         FOR UPDATE`,
        [item.warehouse_id, item.inventory_item_id]
      );
      const stock = stockResult.rows[0];

      if (!stock) {
        const err = new Error(`الصنف ${item.item_name_ar || item.item_name} غير موجود في المستودع`);
        err.statusCode = 400;
        throw err;
      }

      const onHand = parseFloat(stock.quantity_on_hand);
      const reserved = parseFloat(stock.reserved_quantity || 0);
      const available = parseFloat(stock.available_quantity || 0);

      if (onHand < quantityToDeduct) {
        const err = new Error(`المخزون الفعلي غير كافٍ للصنف ${item.item_name_ar || item.item_name}`);
        err.statusCode = 400;
        throw err;
      }

      // If quantity was not reserved previously, only allow legacy fallback from available.
      if (reserved < quantityToDeduct && available < quantityToDeduct) {
        const err = new Error(
          `لا توجد كمية محجوزة/متاحة كافية للصنف ${item.item_name_ar || item.item_name}: المتاح ${available}, المحجوز ${reserved}, المطلوب ${quantityToDeduct}`
        );
        err.statusCode = 400;
        throw err;
      }

      const reservedToConsume = Math.min(reserved, quantityToDeduct);
      const directToConsume = quantityToDeduct - reservedToConsume;

      await client.query(
        `UPDATE warehouse_stock
         SET quantity_on_hand = quantity_on_hand - $1,
             reserved_quantity = reserved_quantity - $2,
             updated_at = NOW()
         WHERE warehouse_id = $3 AND item_id = $4`,
        [quantityToDeduct, reservedToConsume, item.warehouse_id, item.inventory_item_id]
      );

      await client.query(
        `UPDATE inventory_items
         SET quantity_on_hand = quantity_on_hand - $1,
             updated_at = NOW()
         WHERE id = $2`,
        [quantityToDeduct, item.inventory_item_id]
      );

      await client.query(
        `INSERT INTO inventory_movements
          (inventory_item_id, project_id, movement_type, quantity, performed_by, notes, warehouse_id)
         VALUES ($1, $2, 'out', $3, $4, $5, $6)`,
        [
          item.inventory_item_id,
          invoice.project_id || null,
          quantityToDeduct,
          userId,
          `COGS posted for Sales Invoice ${invoice.invoice_number} - ${item.item_name} (reserved:${reservedToConsume}, direct:${directToConsume})`,
          item.warehouse_id
        ]
      );

      totalCogs += lineCogs;

      if (lineCogs > 0) {
        const inventoryCode = item.coa_account_code || '123';
        const cogsCode = item.cost_account_code || '331';

        if (!inventoryAccountCache.has(inventoryCode)) {
          const invRes = await client.query(
            'SELECT id FROM chart_of_accounts WHERE account_code = $1 AND is_active = true',
            [inventoryCode]
          );
          if (!invRes.rows[0]) {
            const err = new Error(`حساب المخزون ${inventoryCode} غير موجود`);
            err.statusCode = 500;
            throw err;
          }
          inventoryAccountCache.set(inventoryCode, invRes.rows[0].id);
        }

        if (!cogsAccountCache.has(cogsCode)) {
          const cogsRes = await client.query(
            'SELECT id FROM chart_of_accounts WHERE account_code = $1 AND is_active = true',
            [cogsCode]
          );
          if (!cogsRes.rows[0]) {
            const err = new Error(`حساب تكلفة البضاعة ${cogsCode} غير موجود`);
            err.statusCode = 500;
            throw err;
          }
          cogsAccountCache.set(cogsCode, cogsRes.rows[0].id);
        }

        cogsLines.push({
          cogsAccountId: cogsAccountCache.get(cogsCode),
          inventoryAccountId: inventoryAccountCache.get(inventoryCode),
          itemName: item.item_name_ar || item.item_name,
          amount: lineCogs
        });
      }
    }

    const invoiceUpdateResult = await client.query(
      `UPDATE sales_invoices
       SET status = 'final', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [invoiceId]
    );

    if (!invoiceUpdateResult.rows[0]) {
      const err = new Error('فشل تحديث الفاتورة');
      err.statusCode = 500;
      throw err;
    }

    if (cogsLines.length > 0) {
      const cogsEntryResult = await client.query(
        `INSERT INTO journal_entries
         (entry_date, description, reference_type, reference_id, entry_type, posted_by, is_posted, project_id)
         VALUES ($1, $2, 'sales_invoice_cogs', $3, 'auto', $4, true, $5)
         RETURNING id`,
        [invoice.issue_date || new Date(), `COGS for Sales Invoice #${invoice.invoice_number}`, invoice.id, userId, invoice.project_id || null]
      );
      const cogsEntryId = cogsEntryResult.rows[0].id;

      for (const line of cogsLines) {
        await client.query(
          `INSERT INTO journal_entry_lines
           (journal_entry_id, account_id, description, debit_amount, credit_amount)
           VALUES
           ($1, $2, $3, $4, 0),
           ($1, $5, $6, 0, $7)`,
          [
            cogsEntryId,
            line.cogsAccountId,
            `COGS - ${line.itemName} - ${invoice.invoice_number}`,
            line.amount,
            line.inventoryAccountId,
            `Inventory relief - ${line.itemName} - ${invoice.invoice_number}`,
            line.amount
          ]
        );
      }
    }

    await client.query('COMMIT');
    return invoiceUpdateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`[Finalize Sales Invoice] ❌ ERROR:`);
    console.error(`[Finalize Sales Invoice] Message: ${error.message}`);
    console.error(`[Finalize Sales Invoice] Code: ${error.code}`);
    console.error(`[Finalize Sales Invoice] Detail: ${error.detail}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get invoice PDF path
 */
async function getInvoicePdfPath(invoiceId) {
  const result = await pool.query(
    `SELECT pdf_path FROM sales_invoices WHERE id = $1`,
    [invoiceId]
  );
  return result.rows[0]?.pdf_path || null;
}

module.exports = {
  processWonLead,
  createSalesInvoice,
  finalizeSalesInvoice,
  getWonLeads,
  getSalesInvoices,
  getSalesInvoiceById
};