const { pool, query } = require('../../db');
const repo = require('./invoices.repository');
const contractRepo = require('../contracts/contracts.repository');
const clientRepo = require('../client/client.repository');
const journalService = require('../journal-entries/journal-entries.service');
const coaRepo = require('../coa/coa.repository');
const vatService = require('../../services/vat.service');
const ZATCAQRGenerator = require('../../services/zatca-qr.service');
const InvoicePDFService = require('../../services/invoice-pdf.service');
const { notifyRole, notify } = require('../../utils/notify');

// ============================================================================
// Invoices Service - Smart Energy ERP
// ============================================================================

async function createInvoice(data, currentUser) {
  const {
    contract_id, project_id, client_id,
    invoice_type, subtotal, tax_rate,
    payment_terms, notes, attachment_url, items
  } = data;

  const isValidContract = await repo.validateContractForProject(project_id, contract_id);
  if (!isValidContract) {
    const err = new Error('لا يمكن إصدار فاتورة لمشروع بدون عقد نشط وموقع');
    err.statusCode = 400;
    throw err;
  }

  const contract = await contractRepo.getContractById(contract_id);

  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  if (!['super_admin', 'general_manager', 'finance_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية إنشاء فواتير');
    err.statusCode = 403;
    throw err;
  }

  let calculatedVAT;
  let finalSubtotal  = parseFloat(subtotal || 0);
  let vatRate        = parseFloat(tax_rate || 15.00);
  let finalTaxAmount = 0;
  let finalTotal     = 0;

  if (items && Array.isArray(items) && items.length > 0) {
    calculatedVAT  = vatService.calculateInvoiceVAT(items);
    finalSubtotal  = calculatedVAT.subtotal;
    finalTaxAmount = calculatedVAT.vat_amount;
    finalTotal     = calculatedVAT.total;
  } else if (finalSubtotal > 0) {
    calculatedVAT  = vatService.calculateVAT(finalSubtotal, vatRate / 100);
    finalTaxAmount = calculatedVAT.vat_amount;
    finalTotal     = calculatedVAT.total;
  } else {
    const err = new Error('يجب توفير subtotal أو items لإنشاء الفاتورة');
    err.statusCode = 400;
    throw err;
  }

  const debit  = parseFloat(finalTotal.toFixed(2));
  const credit = parseFloat((finalSubtotal + finalTaxAmount).toFixed(2));
  if (debit !== credit) {
    const err = new Error(`خطأ محاسبي داخلي: المدين ${debit} لا يساوي الدائن ${credit}`);
    err.statusCode = 500;
    throw err;
  }

  const client_db = await pool.connect();

  try {
    await client_db.query('BEGIN');

    const invoiceNumber = await generateInvoiceNumber();

    // Step 1: حفظ الفاتورة
    const invoice = await repo.createInvoice({
      invoice_number: invoiceNumber,
      contract_id,
      project_id,
      client_id,
      invoice_type,
      subtotal:     finalSubtotal,
      tax_rate:     vatRate,
      tax_amount:   finalTaxAmount,
      total_amount: finalTotal,
      payment_terms,
      notes,
      attachment_url,
      created_by: currentUser.id
    }, client_db);

    // Step 2: توليد QR Code
    const qrCodeData = ZATCAQRGenerator.generate({
      seller_name:             'Smart Energy Services',
      vat_registration_number: vatService.VAT_CONFIG.registrationNumber,
      timestamp:               new Date().toISOString(),
      invoice_total:           finalTotal,
      vat_total:               finalTaxAmount
    });

    // Step 3: حفظ QR في DB
    await repo.updateInvoice(invoice.id, { qr_code_data: qrCodeData }, client_db);

    // Step 4: القيد المحاسبي
    const journalEntry = await createInvoiceJournalEntry(invoice, currentUser, client_db);

    // Step 5: حفظ journal_entry_id
    await repo.updateInvoice(invoice.id, { journal_entry_id: journalEntry.id }, client_db);

    // Step 6: ✅ FIX — بناء updatedInvoice من البيانات الموجودة بدون fetch من DB
    // getInvoiceById بترجع null داخل الـ transaction لأنها بتستخدم connection مختلف
    const updatedInvoice = {
      ...invoice,
      qr_code_data:     qrCodeData,
      journal_entry_id: journalEntry.id
    };

    // Step 7: توليد PDF بالبيانات الكاملة (بما فيها qr_code_data)
    const pdfPath = await InvoicePDFService.generateInvoicePDF(updatedInvoice);

    // Step 8: حفظ مسار الـ PDF
    await repo.updateInvoice(invoice.id, {
      pdf_path:         pdfPath,
      pdf_generated_at: new Date().toISOString()
    }, client_db);

    await client_db.query('COMMIT');

    // Step 9: جلب الفاتورة النهائية بعد COMMIT (هنا getInvoiceById هتشتغل صح)
    const completeInvoice = await repo.getInvoiceById(invoice.id);

    await notifyRole('finance_manager', {
      title:     'فاتورة جديدة صادرة',
      message:   `فاتورة "${invoiceNumber}" بقيمة ${finalTotal} SAR جاهزة للتحصيل`,
      type:      'success',
      entity_id: invoice.id
    });

    return completeInvoice;

  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
}

async function recordPayment(invoiceId, paymentData, currentUser) {
  const { amount, payment_method, reference_number } = paymentData;
  const invoice = await repo.getInvoiceById(invoiceId);

  if (!invoice) throw new Error('الفاتورة غير موجودة');

  const client_db = await pool.connect();

  try {
    await client_db.query('BEGIN');

    const updatedInvoice = await repo.addInvoicePayment(invoiceId, amount, client_db);

    const accountCode = (payment_method === 'cash') ? '1310' : '1330';
    const paymentAcc  = await coaRepo.getAccountByCode(accountCode);
    const arAcc       = await coaRepo.getAccountByCode('121');

    const lines = [
      {
        account_id:    paymentAcc.id,
        debit_amount:  parseFloat(amount),
        credit_amount: 0,
        description:   `تحصيل فاتورة رقم ${invoice.invoice_number}`
      },
      {
        account_id:    arAcc.id,
        debit_amount:  0,
        credit_amount: parseFloat(amount),
        description:   `سداد مديونية العميل - فاتورة ${invoice.invoice_number}`
      }
    ];

    await journalService.createJournalEntry({
      description:    `قيد تحصيل دفعة للفاتورة ${invoice.invoice_number}`,
      reference_type: 'payment',
      reference_id:   invoiceId,
      project_id:     invoice.project_id
    }, lines, currentUser, client_db);

    await client_db.query('COMMIT');
    return updatedInvoice;

  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
}

async function createInvoiceJournalEntry(invoice, currentUser, dbClient) {
  const arAccount  = await coaRepo.getAccountByCode('121');
  const revAccount = await coaRepo.getAccountByCode('4120');
  const vatAccount = await coaRepo.getAccountByCode('2220101');

  const lines = [
    {
      account_id:    arAccount.id,
      debit_amount:  parseFloat(invoice.total_amount),
      credit_amount: 0,
      description:   `إثبات مديونية - فاتورة ${invoice.invoice_number}`
    },
    {
      account_id:    revAccount.id,
      debit_amount:  0,
      credit_amount: parseFloat(invoice.subtotal),
      description:   `إيراد مشروع - فاتورة ${invoice.invoice_number}`
    },
    {
      account_id:    vatAccount.id,
      debit_amount:  0,
      credit_amount: parseFloat(invoice.tax_amount),
      description:   `ضريبة قيمة مضافة - فاتورة ${invoice.invoice_number}`
    }
  ];

  return await journalService.createJournalEntry({
    description:    `قيد إصدار فاتورة ${invoice.invoice_number}`,
    reference_type: 'invoice',
    reference_id:   invoice.id,
    project_id:     invoice.project_id,
    contract_id:    invoice.contract_id
  }, lines, currentUser, dbClient);
}

async function generateInvoiceNumber() {
  const result = await query(
    `SELECT 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
            LPAD((COUNT(*) + 1)::TEXT, 4, '0') as num
     FROM invoices WHERE issue_date = CURRENT_DATE`
  );
  return result.rows[0].num;
}

async function getUserById(userId) {
  const result = await query(
    `SELECT id, first_name, last_name FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0];
}

/**
 * Finalize invoice - change status from draft to final
 */
async function finalizeInvoice(invoiceId, currentUser) {
  console.log(`[Finalize Invoice] Finalizing invoice ID: ${invoiceId}`);
  
  const invoice = await repo.getInvoiceById(invoiceId);
  
  if (!invoice) {
    const err = new Error('الفاتورة غير موجودة');
    err.statusCode = 404;
    throw err;
  }
  
  // Must be in draft status
  if (invoice.status !== 'draft') {
    const err = new Error('يمكن فقط اعتماد الفواتير في حالة مسودة');
    err.statusCode = 400;
    throw err;
  }
  
  // Update status to final
  const updated = await repo.updateInvoice(invoiceId, {
    status: 'final'
  });
  
  console.log(`[Finalize Invoice] Invoice ${invoice.invoice_number} finalized successfully`);
  
  return updated;
}

/**
 * Generate tax invoice number
 * Format: TI-YYYY-NNNNN
 */
async function generateTaxInvoiceNumber() {
  const result = await query(`
    SELECT COUNT(*) as count FROM invoices WHERE is_tax_invoice = true
  `);
  const count = parseInt(result.rows[0].count) + 1;
  return `TI-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
}

/**
 * Generate tax invoice for a finalized sales invoice
 * This acts as a TRANSFER SERVICE:
 * 1. Fetches from sales_invoices table
 * 2. INSERTS new record into invoices table (tax invoice)
 * 3. Updates sales_invoices to mark as taxed
 */
async function generateTaxInvoice(salesInvoiceId, currentUser) {
  console.log(`[Tax Invoice] Generating for sales invoice ID: ${salesInvoiceId}`);
  
  // Step 1: Fetch the finalized sales invoice
  const salesInvoiceRepo = require('../sales/sales.repository');
  const salesInvoice = await salesInvoiceRepo.getSalesInvoiceById(salesInvoiceId);
  
  if (!salesInvoice) {
    const err = new Error('فاتورة المبيعات غير موجودة');
    err.statusCode = 404;
    throw err;
  }
  
  // Must be final status
  if (salesInvoice.status !== 'final') {
    const err = new Error('يجب تحويل الفاتورة إلى نهائية أولاً');
    err.statusCode = 400;
    throw err;
  }
  
  // Check if already has tax invoice
  if (salesInvoice.is_tax_invoice) {
    const err = new Error('الفاتورة الضريبية موجودة بالفعل');
    err.statusCode = 400;
    throw err;
  }
  
  // Step 2: Generate tax invoice number and UUID
  const taxInvoiceNo = await generateTaxInvoiceNumber();
  const crypto = require('crypto');
  const zatcaUUID = crypto.randomUUID();
  
  // Step 3: Generate ZATCA QR code
  console.log('[Tax Invoice] Generating ZATCA QR code');
  const qrCodeData = ZATCAQRGenerator.generate({
    seller_name: 'شركة الطاقة الذكية',
    vat_registration_number: vatService.VAT_CONFIG.registrationNumber,
    timestamp: new Date().toISOString(),
    invoice_total: parseFloat(salesInvoice.total_amount),
    vat_total: parseFloat(salesInvoice.vat_amount)
  });
  
  // Step 4: INSERT new record into invoices table
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`[Tax Invoice] INSERTING into invoices table: ${taxInvoiceNo}`);
    
    const insertResult = await client.query(
      `INSERT INTO invoices (
        project_id,
        client_id,
        invoice_number,
        issue_date,
        due_date,
        total_amount,
        tax_amount,
        subtotal,
        status,
        payment_status,
        amount_paid,
        is_tax_invoice,
        tax_invoice_no,
        zatca_uuid,
        zatca_status,
        qr_code_data,
        created_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        salesInvoice.project_id,
        salesInvoice.client_id,
        taxInvoiceNo,
        salesInvoice.issue_date,
        salesInvoice.due_date,
        parseFloat(salesInvoice.total_amount),
        parseFloat(salesInvoice.vat_amount),
        parseFloat(salesInvoice.subtotal),
        'final',
        salesInvoice.payment_status || 'unpaid',
        parseFloat(salesInvoice.amount_paid || 0),
        true,  // is_tax_invoice
        taxInvoiceNo,
        zatcaUUID,
        'pending',  // zatca_status
        qrCodeData,
        currentUser.id,
        new Date(),
        new Date()
      ]
    );
    
    const taxInvoice = insertResult.rows[0];
    const taxInvoiceId = taxInvoice.id;
    
    console.log(`[Tax Invoice] INSERTED with ID: ${taxInvoiceId}`);
    
    // Step 5: Generate PDF with tax invoice number
    console.log(`[Tax Invoice] Generating PDF: ${taxInvoiceNo}.pdf`);
    const pdfPath = await InvoicePDFService.generateInvoicePDF({
      ...taxInvoice,
      client_name: salesInvoice.client_name,
      project_name: salesInvoice.project_name
    }, {
      filename: `${taxInvoiceNo}.pdf`
    });
    
    // Update the invoices record with PDF path
    await client.query(
      `UPDATE invoices SET pdf_path = $1, updated_at = $2 WHERE id = $3`,
      [pdfPath, new Date(), taxInvoiceId]
    );
    
    console.log(`[Tax Invoice] PDF saved: ${pdfPath}`);
    
    // Step 6: Update sales_invoices to mark as taxed (HARD LOCK)
    console.log(`[Tax Invoice] 🔒 Setting is_tax_invoice = true for sales_invoices ID: ${salesInvoiceId}`);
    
    const updateResult = await client.query(
      `UPDATE sales_invoices 
       SET is_tax_invoice = true, 
           tax_invoice_id = $1,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2
       RETURNING id, invoice_number, is_tax_invoice, tax_invoice_id`,
      [taxInvoiceId, salesInvoiceId]
    );
    
    if (updateResult.rows[0]) {
      console.log(`[Tax Invoice] ✅ sales_invoices updated:`);
      console.log(`[Tax Invoice]   - ID: ${updateResult.rows[0].id}`);
      console.log(`[Tax Invoice]   - Invoice Number: ${updateResult.rows[0].invoice_number}`);
      console.log(`[Tax Invoice]   - is_tax_invoice: ${updateResult.rows[0].is_tax_invoice}`);
      console.log(`[Tax Invoice]   - tax_invoice_id: ${updateResult.rows[0].tax_invoice_id}`);
    } else {
      console.error(`[Tax Invoice] ❌ Failed to update sales_invoices ID: ${salesInvoiceId}`);
    }
    
    // Log the action
    await client.query(
      `INSERT INTO tax_invoice_logs (invoice_id, action, zatca_response, performed_by)
       VALUES ($1, 'generated', $2, $3)`,
      [taxInvoiceId, JSON.stringify({ 
        tax_invoice_no: taxInvoiceNo, 
        zatca_uuid: zatcaUUID,
        sales_invoice_id: salesInvoiceId 
      }), currentUser.id]
    );
    
    await client.query('COMMIT');
    
    console.log(`[Tax Invoice] ✅ Successfully generated tax invoice ${taxInvoiceNo}`);
    
    return {
      id: taxInvoiceId,
      tax_invoice_no: taxInvoiceNo,
      zatca_uuid: zatcaUUID,
      qr_code_data: qrCodeData,
      pdf_path: pdfPath
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Tax Invoice] ❌ Failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createInvoice,
  recordPayment,
  finalizeInvoice,
  generateTaxInvoice,
  getInvoiceById:        (id)        => repo.getInvoiceById(id),
  getProjectInvoices:    (projectId) => repo.getProjectInvoices(projectId),
  getProjectReceivables: (projectId) => repo.getProjectReceivables(projectId)
};