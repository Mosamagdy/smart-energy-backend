const { query, pool } = require('../../db');
const { notifyRole, notify } = require('../../utils/notify');
const { generatePurchaseInvoicePDF } = require('../../services/purchase-invoice-pdf.service');
const path = require('path');
const fs = require('fs');

async function resolveCoaAccountId(client, candidateCodes = [], accountLabel = 'account') {
  for (const code of candidateCodes) {
    const result = await client.query(
      `SELECT id, account_code
       FROM chart_of_accounts
       WHERE account_code = $1 AND is_active = true
       ORDER BY id
       LIMIT 1`,
      [code]
    );
    if (result.rows[0]) {
      return result.rows[0];
    }
  }

  throw new Error(`Required COA ${accountLabel} not found. Tried codes: ${candidateCodes.join(', ')}`);
}

async function approveByProcurement(poId, approvalNotes, currentUser) {
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  if (!['super_admin', 'general_manager', 'procurement_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية الموافقة على أوامر الشراء');
    err.statusCode = 403;
    throw err;
  }

  const { rows: [po] } = await query(
    `SELECT po.*, p.name as project_name, p.project_manager_id,
            s.name as supplier_name,
            u.first_name || ' ' || u.last_name as creator_name
     FROM purchase_orders po
     JOIN projects p ON p.id = po.project_id
     LEFT JOIN suppliers s ON s.id = po.supplier_id
     LEFT JOIN users u ON u.id = po.created_by
     WHERE po.id = $1`,
    [poId]
  );

  if (!po) {
    const err = new Error('أمر الشراء غير موجود');
    err.statusCode = 404;
    throw err;
  }

  if (po.status !== 'pending_procurement') {
    const err = new Error('أمر الشراء ليس بانتظار مراجعة المشتريات');
    err.statusCode = 400;
    throw err;
  }

  const { rows: [updated] } = await query(
    `UPDATE purchase_orders 
     SET status = 'pending_finance',
         procurement_notes = $1,
         procurement_approved_by = $2,
         procurement_approved_at = NOW(),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [approvalNotes || 'موافقة مبدئية من المشتريات', currentUser.id, poId]
  );

  await notifyRole('finance_manager', {
    title: 'أمر شراء بانتظار الموافقة المالية',
    message: `أمر شراء رقم "${po.po_number}" لمشروع "${po.project_name}" بمبلغ ${po.total_amount} ريال بانتظار موافقتك`,
    type: 'warning',
    entity_type: 'purchase_order',
    entity_id: poId
  });

  if (po.project_manager_id) {
    await notify({
      user_id: po.project_manager_id,
      title: 'تمت الموافقة المبدئية على أمر الشراء',
      message: `تمت الموافقة المبدئية على أمر الشراء رقم ${po.po_number} وإرساله للإدارة المالية للمراجعة`,
      type: 'info',
      entity_type: 'purchase_order',
      entity_id: poId
    });
  }

  return updated;
}

async function approveByFinance(poId, approvalNotes, currentUser, isTaxApplied = true) {
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  if (!['super_admin', 'general_manager', 'finance_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية الموافقة المالية على أوامر الشراء');
    err.statusCode = 403;
    throw err;
  }

  const { rows: [po] } = await query(
    `SELECT po.*, p.name as project_name, p.project_manager_id, p.client_id,
            s.name as supplier_name,
            u.first_name || ' ' || u.last_name as creator_name
     FROM purchase_orders po
     JOIN projects p ON p.id = po.project_id
     LEFT JOIN suppliers s ON s.id = po.supplier_id
     LEFT JOIN users u ON u.id = po.created_by
     WHERE po.id = $1`,
    [poId]
  );

  if (!po) {
    const err = new Error('أمر الشراء غير موجود');
    err.statusCode = 404;
    throw err;
  }

  if (po.status !== 'pending_finance') {
    const err = new Error('أمر الشراء ليس بانتظار الموافقة المالية');
    err.statusCode = 400;
    throw err;
  }

  const { rows: [updated] } = await query(
    `UPDATE purchase_orders 
     SET status = 'approved',
         finance_notes = $1,
         finance_approved_by = $2,
         finance_approved_at = NOW(),
         approved_by = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [approvalNotes || 'موافقة مالية', currentUser.id, poId]
  );

  // ✅ PHASE 2: Automatic Invoice & Journal Entry Creation
  try {
    await createPurchaseInvoiceAndJournal(po, currentUser, isTaxApplied);
  } catch (invoiceError) {
    // CRITICAL: Invoice creation failed - this should NOT be silent
    console.error('[Invoice] ❌ === INVOICE CREATION FAILED IN approveByFinance ===');
    console.error('[Invoice] Error:', invoiceError.message);
    console.error('[Invoice] Stack:', invoiceError.stack);
    console.error('[Invoice] PO Data:', JSON.stringify({
      po_id: po.id,
      po_number: po.po_number,
      supplier_id: po.supplier_id,
      project_id: po.project_id,
      total_amount: po.total_amount
    }, null, 2));
    
    // ROLLBACK the PO approval since invoice creation failed
    await query(
      `UPDATE purchase_orders 
       SET status = 'pending_finance',
           finance_notes = NULL,
           finance_approved_by = NULL,
           finance_approved_at = NULL,
           approved_by = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [poId]
    );
    
    console.error('[Invoice] PO approval rolled back to pending_finance');
    
    // Re-throw the error to fail the entire operation
    throw invoiceError;
  }

  if (po.project_manager_id) {
    await notify({
      user_id: po.project_manager_id,
      title: '✅ تمت الموافقة على أمر الشراء',
      message: `تمت الموافقة المالية على أمر الشراء رقم "${po.po_number}" لمشروع "${po.project_name}". يمكن الآن إرساله للمورد.`,
      type: 'success',
      entity_type: 'purchase_order',
      entity_id: poId
    });
  }

  await notifyRole('general_manager', {
    title: 'تمت الموافقة على أمر شراء',
    message: `تمت الموافقة على أمر شراء رقم "${po.po_number}" لمشروع "${po.project_name}" بمبلغ ${po.total_amount} ريال`,
    type: 'info',
    entity_type: 'purchase_order',
    entity_id: poId
  });

  await notifyRole('procurement_manager', {
    title: 'أمر شراء جاهز للإرسال',
    message: `تمت الموافقة المالية على أمر الشراء رقم "${po.po_number}". يرجى إرساله للمورد: ${po.supplier_name}`,
    type: 'warning',
    entity_type: 'purchase_order',
    entity_id: poId
  });

  return updated;
}

async function rejectRequest(poId, rejectionReason, rejectionStage, currentUser) {
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  if (!['super_admin', 'general_manager', 'procurement_manager', 'finance_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية رفض أوامر الشراء');
    err.statusCode = 403;
    throw err;
  }

  const { rows: [po] } = await query(
    `SELECT po.*, p.name as project_name, p.project_manager_id,
            u.first_name || ' ' || u.last_name as creator_name
     FROM purchase_orders po
     JOIN projects p ON p.id = po.project_id
     LEFT JOIN users u ON u.id = po.created_by
     WHERE po.id = $1`,
    [poId]
  );

  if (!po) {
    const err = new Error('أمر الشراء غير موجود');
    err.statusCode = 404;
    throw err;
  }

  let statusUpdate, rejectedByField, rejectionReasonField;
  
  if (rejectionStage === 'procurement') {
    statusUpdate = 'draft';
    rejectedByField = 'procurement_rejected_by';
    rejectionReasonField = 'procurement_rejection_reason';
  } else {
    statusUpdate = 'pending_procurement';
    rejectedByField = 'finance_rejected_by';
    rejectionReasonField = 'finance_rejection_reason';
  }

  const { rows: [updated] } = await query(
    `UPDATE purchase_orders 
     SET status = $1,
         ${rejectedByField} = $2,
         ${rejectionReasonField} = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [statusUpdate, currentUser.id, rejectionReason, poId]
  );

  if (po.created_by) {
    await notify({
      user_id: po.created_by,
      title: '❌ تم رفض أمر الشراء',
      message: `تم رفض أمر الشراء رقم "${po.po_number}" لمشروع "${po.project_name}". السبب: ${rejectionReason}`,
      type: 'danger',
      entity_type: 'purchase_order',
      entity_id: poId
    });
  }

  if (po.project_manager_id) {
    await notify({
      user_id: po.project_manager_id,
      title: 'تم رفض أمر شراء',
      message: `تم رفض أمر الشراء رقم "${po.po_number}" الخاص بمشروع "${po.project_name}"`,
      type: 'danger',
      entity_type: 'purchase_order',
      entity_id: poId
    });
  }

  // ✅ Notify procurement_manager when finance rejects
  await notifyRole('procurement_manager', {
    title: '🔄 أمر شراء معاد من المالية',
    message: `تم رفض أمر الشراء رقم "${po.po_number}" من الإدارة المالية. السبب: ${rejectionReason}`,
    type: 'warning',
    entity_type: 'purchase_order',
    entity_id: poId
  });

  return updated;
}

async function getPendingFinanceApprovals(currentUser) {
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  if (!['super_admin', 'general_manager', 'finance_manager'].includes(userRole)) {
    return [];
  }

  const result = await query(
    `SELECT 
       po.*,
       p.name as project_name,
       p.status as project_status,
       s.name as supplier_name,
       u.first_name || ' ' || u.last_name as creator_name,
       u.email as creator_email,
       poi.count as items_count
     FROM purchase_orders po
     JOIN projects p ON p.id = po.project_id
     LEFT JOIN suppliers s ON s.id = po.supplier_id
     LEFT JOIN users u ON u.id = po.created_by
     LEFT JOIN (
       SELECT po_id, COUNT(*) as count
       FROM purchase_order_items
       GROUP BY po_id
     ) poi ON poi.po_id = po.id
     WHERE po.status = 'pending_finance'
     ORDER BY po.created_at DESC`
  );

  const approvals = await Promise.all(
    result.rows.map(async (approval) => {
      const itemsResult = await query(
        // ✅ FIX: أضفنا poi.item_id عشان الفرونت يقدر يستخدمه في الـ update
        `SELECT poi.id,
                poi.item_id,
                poi.quantity,
                poi.unit_cost,
                poi.total_cost,
                ii.item_name,
                ii.item_name_ar,
                ii.item_code
         FROM purchase_order_items poi
         JOIN inventory_items ii ON ii.id = poi.item_id
         WHERE poi.po_id = $1
         ORDER BY poi.id`,
        [approval.id]
      );
      
      return {
        ...approval,
        items: itemsResult.rows
      };
    })
  );

  return approvals;
}

async function getPendingProcurementApprovals(currentUser) {
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();
  
  if (!['super_admin', 'general_manager', 'procurement_manager'].includes(userRole)) {
    return [];
  }

  const result = await query(
    `SELECT 
       po.*,
       p.name as project_name,
       s.name as supplier_name,
       u.first_name || ' ' || u.last_name as creator_name,
       poi.count as items_count
     FROM purchase_orders po
     JOIN projects p ON p.id = po.project_id
     LEFT JOIN suppliers s ON s.id = po.supplier_id
     LEFT JOIN users u ON u.id = po.created_by
     LEFT JOIN (
       SELECT po_id, COUNT(*) as count
       FROM purchase_order_items
       GROUP BY po_id
     ) poi ON poi.po_id = po.id
     WHERE po.status IN ('pending', 'pending_procurement')
     ORDER BY po.created_at DESC`
  );

  const approvals = await Promise.all(
    result.rows.map(async (approval) => {
      const itemsResult = await query(
        // ✅ FIX: أضفنا poi.item_id عشان الفرونت يقدر يستخدمه في الـ update
        `SELECT poi.id,
                poi.item_id,
                poi.quantity,
                poi.unit_cost,
                poi.total_cost,
                ii.item_name,
                ii.item_code
         FROM purchase_order_items poi
         JOIN inventory_items ii ON ii.id = poi.item_id
         WHERE poi.po_id = $1
         ORDER BY poi.id`,
        [approval.id]
      );
      
      return {
        ...approval,
        items: itemsResult.rows
      };
    })
  );

  return approvals;
}

/**
 * ✅ PHASE 2: Automatic Purchase Invoice & Journal Entry Creation
 * Triggered when Finance Manager approves a PO
 */
async function createPurchaseInvoiceAndJournal(po, currentUser, isTaxApplied = true) {
  const client_db = await pool.connect();
  
  try {
    await client_db.query('BEGIN');

    console.log(`[Invoice] === STARTING INVOICE CREATION ===`);
    console.log(`[Invoice] PO Number: ${po.po_number}`);
    console.log(`[Invoice] PO ID: ${po.id}`);
    console.log(`[Invoice] Supplier ID: ${po.supplier_id}`);
    console.log(`[Invoice] Project ID: ${po.project_id}`);
    console.log(`[Invoice] PO Total Amount: ${po.total_amount}`);
    console.log(`[Invoice] Tax Applied: ${isTaxApplied}`);

    // 1. Generate Invoice Number: PINV-2026-XXXX
    const year = new Date().getFullYear();
    const invoiceNumResult = await client_db.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'PINV-${year}-(\\d+)') AS INTEGER)), 0) + 1 as next_num
       FROM purchase_invoices
       WHERE invoice_number LIKE 'PINV-${year}-%'`
    );
    const nextNum = invoiceNumResult.rows[0].next_num;
    const invoiceNumber = `PINV-${year}-${String(nextNum).padStart(4, '0')}`;

    // 2. Calculate tax based on isTaxApplied flag
    // IMPORTANT: Procurement Manager enters prices that ALREADY INCLUDE 15% VAT
    // So po.total_amount is TAX-INCLUSIVE
    const totalFromPO = parseFloat(po.total_amount);
    let subtotal, taxAmount, totalAmount;
    
    if (isTaxApplied) {
      // Toggle ON: Price already includes tax, just extract the VAT portion mathematically
      // VAT = Total - (Total / 1.15)
      // Subtotal = Total / 1.15
      subtotal = parseFloat((totalFromPO / 1.15).toFixed(2));
      taxAmount = parseFloat((totalFromPO - subtotal).toFixed(2));
      totalAmount = totalFromPO;
      console.log(`[Invoice] Tax INCLUSIVE: Total=${totalFromPO}, Subtotal=${subtotal}, Tax=${taxAmount}`);
    } else {
      // Toggle OFF: Deduct the 15% VAT from the price
      // New Total = Original Total / 1.15 (removing VAT)
      subtotal = parseFloat((totalFromPO / 1.15).toFixed(2));
      taxAmount = 0;
      totalAmount = subtotal;
      console.log(`[Invoice] Tax EXCLUDED: Original=${totalFromPO}, New Total (no tax)=${totalAmount}`);
    }

    // 3. Create Purchase Invoice
    console.log(`[Invoice] === PREPARING INSERT QUERY ===`);
    console.log(`[Invoice] Values to insert:`);
    console.log(`  - invoice_number: ${invoiceNumber}`);
    console.log(`  - supplier_id: ${po.supplier_id} (type: ${typeof po.supplier_id})`);
    console.log(`  - po_id: ${po.id} (type: ${typeof po.id})`);
    console.log(`  - project_id: ${po.project_id} (type: ${typeof po.project_id})`);
    console.log(`  - subtotal: ${subtotal} (type: ${typeof subtotal})`);
    console.log(`  - tax_rate: ${isTaxApplied ? 15.00 : 0}`);
    console.log(`  - tax_amount: ${taxAmount}`);
    console.log(`  - total_amount: ${totalAmount}`);
    console.log(`  - is_tax_applied: ${isTaxApplied} (type: ${typeof isTaxApplied})`);
    console.log(`  - tax_percentage: ${isTaxApplied ? 15.00 : 0}`);
    console.log(`  - created_by: ${currentUser.id} (type: ${typeof currentUser.id})`);
    console.log(`[Invoice] Checking for NULL values in mandatory columns...`);
    
    if (!po.supplier_id) {
      throw new Error(`CRITICAL: supplier_id is NULL/undefined for PO ${po.po_number}`);
    }
    if (!po.id) {
      throw new Error(`CRITICAL: po_id is NULL/undefined`);
    }
    if (!currentUser.id) {
      throw new Error(`CRITICAL: created_by (currentUser.id) is NULL/undefined`);
    }
    
    console.log(`[Invoice] ✅ All mandatory fields present`);
    console.log(`[Invoice] Executing INSERT query...`);
    const invoiceResult = await client_db.query(
      `INSERT INTO purchase_invoices (
        invoice_number, supplier_id, po_id, project_id, invoice_date,
        subtotal, tax_rate, tax_amount, total_amount, paid_amount,
        status, is_tax_applied, tax_percentage, created_by, notes
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8, 0, 'draft', $9, $10, $11, $12)
      RETURNING *`,
      [
        invoiceNumber,
        po.supplier_id,
        po.id,
        po.project_id,
        subtotal,
        isTaxApplied ? 15.00 : 0,
        taxAmount,
        totalAmount,
        isTaxApplied,
        isTaxApplied ? 15.00 : 0,
        currentUser.id,
        `Automatic invoice created from PO ${po.po_number} - Finance approved${isTaxApplied ? ' (VAT 15% applied)' : ' (No VAT)'}`
      ]
    );
    
    const invoice = invoiceResult.rows[0];
    console.log(`[Invoice] ✅ Invoice created successfully - ID: ${invoice.id}, Number: ${invoiceNumber}`);

    // 3.1. Fetch PO items and save them to purchase_invoice_items
    console.log(`[Invoice] === FETCHING PO ITEMS ===`);
    const poItemsResult = await client_db.query(
      `SELECT poi.*,
              ii.item_name,
              ii.item_name_ar,
              ii.item_code
       FROM purchase_order_items poi
       JOIN inventory_items ii ON ii.id = poi.item_id
       WHERE poi.po_id = $1
       ORDER BY poi.id`,
      [po.id]
    );

    console.log(`[Invoice] Found ${poItemsResult.rows.length} PO items`);

    if (poItemsResult.rows.length > 0) {
      // Save each PO item to purchase_invoice_items
      for (const poItem of poItemsResult.rows) {
        // Use default warehouse_id = 1 (since purchase_order_items doesn't have warehouse_id)
        const defaultWarehouseId = 1;
        
        await client_db.query(
          `INSERT INTO purchase_invoice_items (
            invoice_id, inventory_item_id, warehouse_id,
            quantity, unit_cost, notes
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            invoice.id,
            poItem.item_id, // This is the inventory_item_id
            defaultWarehouseId,
            poItem.quantity,
            poItem.unit_cost,
            `From PO ${po.po_number}`
          ]
        );
        
        console.log(`[Invoice] ✅ Saved item: ${poItem.item_name_ar || poItem.item_name} (Qty: ${poItem.quantity}, Cost: ${poItem.unit_cost}, Warehouse: ${defaultWarehouseId})`);
      }
    } else {
      console.warn(`[Invoice] ⚠️ No PO items found for PO ${po.po_number}`);
    }

    // 3.5 Generate PDF for the invoice
    try {
      console.log(`[PDF] Generating PDF for invoice ${invoiceNumber}...`);
      
      // Fetch complete invoice data WITH ITEMS for PDF generation
      const fullInvoiceData = await client_db.query(
        `SELECT 
           pi.*,
           s.name AS supplier_name,
           s.email AS supplier_email,
           s.phone AS supplier_phone,
           p.name AS project_name
         FROM purchase_invoices pi
         JOIN suppliers s ON s.id = pi.supplier_id
         LEFT JOIN projects p ON p.id = pi.project_id
         WHERE pi.id = $1`,
        [invoice.id]
      );

      if (fullInvoiceData.rows[0]) {
        // Fetch invoice items and attach to invoice object
        const invoiceItems = await client_db.query(
          `SELECT 
             pii.*,
             ii.item_code,
             ii.item_name,
             ii.item_name_ar,
             w.warehouse_name,
             w.warehouse_name_ar
           FROM purchase_invoice_items pii
           JOIN inventory_items ii ON pii.inventory_item_id = ii.id
           JOIN warehouses w ON pii.warehouse_id = w.id
           WHERE pii.invoice_id = $1
           ORDER BY pii.id`,
          [invoice.id]
        );

        // Attach items to the invoice object
        fullInvoiceData.rows[0].items = invoiceItems.rows;
        console.log(`[PDF] Attached ${invoiceItems.rows.length} items to invoice for PDF generation`);

        const pdfPath = await generatePurchaseInvoicePDF(fullInvoiceData.rows[0]);
        
        // Store relative path from backend root (uploads/invoices/...)
        // This will be accessible at: http://localhost:5000/uploads/invoices/...
        const relativePath = path.relative(path.join(__dirname, '../../'), pdfPath);
        console.log(`[PDF] PDF saved to: ${relativePath}`);
        console.log(`[PDF] Accessible at: http://localhost:${process.env.PORT || 5000}/${relativePath}`);

        // Update invoice with pdf_path
        await client_db.query(
          `UPDATE purchase_invoices SET pdf_path = $1, pdf_generated_at = NOW() WHERE id = $2`,
          [relativePath, invoice.id]
        );

        console.log(`[PDF] ✅ PDF generated and linked to invoice ${invoiceNumber}`);
      }
    } catch (pdfError) {
      // Don't fail the invoice creation if PDF generation fails
      console.error('[PDF] ❌ Failed to generate PDF:', pdfError.message);
      // Continue with journal entry creation even if PDF fails
    }

    // 4. Get COA Accounts with resilient fallback mapping
    // DEBIT: Cost/Inventory fallback chain
    const costAccount = await resolveCoaAccountId(
      client_db,
      ['331', '33', '31211', '311'],
      'Cost/Inventory'
    );

    // DEBIT: VAT Input fallback chain (only required when tax is applied)
    let vatAccount = null;
    if (isTaxApplied && taxAmount > 0) {
      vatAccount = await resolveCoaAccountId(
        client_db,
        ['2220102', '22102'],
        'VAT Input'
      );
    }

    // CREDIT: Supplier AP (supplier setting first, then known AP fallbacks)
    const supplierResult = await client_db.query(
      `SELECT coa_account_code FROM suppliers WHERE id = $1`,
      [po.supplier_id]
    );
    const supplierCoaCode = supplierResult.rows[0]?.coa_account_code || null;
    const payableCandidates = [
      supplierCoaCode,
      '21301',
      '213',
      '211',
      '220101',
      '2201',
      '220'
    ].filter(Boolean);
    const payableAccount = await resolveCoaAccountId(
      client_db,
      payableCandidates,
      'Accounts Payable'
    );

    // 5. Create Journal Entry Header
    const journalResult = await client_db.query(
      `INSERT INTO journal_entries (
        entry_date, description, reference_type, reference_id, project_id,
        created_by, is_posted, entry_type, transaction_date
      ) VALUES (CURRENT_DATE, $1, 'purchase_invoice', $2, $3, $4, true, 'auto', CURRENT_DATE)
      RETURNING *`,
      [
        `Purchase Invoice ${invoiceNumber} - PO ${po.po_number} - ${po.project_name}`,
        invoice.id,
        po.project_id,
        currentUser.id
      ]
    );
    
    const journalEntry = journalResult.rows[0];
    console.log(`[Journal] Created journal entry ${journalEntry.entry_number}`);

    // 6. Create Journal Entry Lines
    // Use the CALCULATED values from tax-inclusive logic, not PO values
    const lines = [
      {
        account_id: costAccount.id,
        debit_amount: subtotal, // ✅ Use calculated subtotal
        credit_amount: 0,
        description: `تكلفة مشتريات - ${invoiceNumber}`
      },
      {
        account_id: payableAccount.id,
        debit_amount: 0,
        credit_amount: totalAmount, // ✅ Use calculated totalAmount
        description: `فاتورة مورد مستحقة - ${invoiceNumber}`
      }
    ];

    if (isTaxApplied && taxAmount > 0 && vatAccount) {
      lines.splice(1, 0, {
        account_id: vatAccount.id,
        debit_amount: taxAmount,
        credit_amount: 0,
        description: `ضريبة مدخلات - ${invoiceNumber}`
      });
    }
    
    console.log(`[Journal] Journal Entry Lines:`);
    console.log(`  - DEBIT Cost/Inventory (${costAccount.account_code}): ${subtotal}`);
    if (isTaxApplied && taxAmount > 0 && vatAccount) {
      console.log(`  - DEBIT VAT Input (${vatAccount.account_code}): ${taxAmount}`);
    }
    console.log(`  - CREDIT Supplier AP (${payableAccount.account_code}): ${totalAmount}`);
    console.log(`  - Balanced: ${Math.abs((subtotal + taxAmount) - totalAmount) < 0.01}`);

    // 7. SAFETY CHECK: Validate Debits = Credits
    const totalDebit = lines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit_amount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      const err = new Error(`Journal entry unbalanced! Debit: ${totalDebit}, Credit: ${totalCredit}`);
      err.statusCode = 500;
      throw err;
    }

    console.log(`[Journal] Validation: Debit=${totalDebit}, Credit=${totalCredit} ✅ Balanced`);

    // 8. Insert Journal Lines
    for (const line of lines) {
      await client_db.query(
        `INSERT INTO journal_entry_lines (
          journal_entry_id, account_id, debit_amount, credit_amount, description
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          journalEntry.id,
          line.account_id,
          line.debit_amount,
          line.credit_amount,
          line.description
        ]
      );
    }

    // 9. Update Invoice with journal_entry_id
    await client_db.query(
      `UPDATE purchase_invoices SET journal_entry_id = $1 WHERE id = $2`,
      [journalEntry.id, invoice.id]
    );

    await client_db.query('COMMIT');

    console.log(`[Invoice] ✅ Invoice ${invoiceNumber} and Journal Entry ${journalEntry.entry_number} created successfully`);
    
    return { invoice, journalEntry };

  } catch (error) {
    await client_db.query('ROLLBACK');
    console.error('[Invoice] ❌ === INVOICE CREATION FAILED ===');
    console.error('[Invoice] Error:', error.message);
    console.error('[Invoice] Stack:', error.stack);
    console.error('[Invoice] PO Data:', JSON.stringify({
      po_number: po.po_number,
      po_id: po.id,
      supplier_id: po.supplier_id,
      total_amount: po.total_amount,
      is_tax_applied: isTaxApplied
    }, null, 2));
    throw error;
  } finally {
    client_db.release();
  }
}

module.exports = {
  approveByProcurement,
  approveByFinance,
  rejectRequest,
  getPendingFinanceApprovals,
  getPendingProcurementApprovals
};