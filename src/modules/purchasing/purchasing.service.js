const { pool, query } = require('../../db');
const repo = require('./purchasing.repository');
const coaRepo = require('../coa/coa.repository');
const journalService = require('../journal-entries/journal-entries.service');
const inventoryRepo = require('../inventory/inventory.repository');
const PurchaseInvoicePDF = require('../../services/purchase-invoice-pdf.service');
const notifRepo = require('../notifications/notifications.repository');

// ============================================================================
// Purchasing Service - Business Logic Layer
// ============================================================================

/**
 * Create Purchase Order
 */
async function createPO(data, currentUser) {
  const { items } = data;

  if (!items || !Array.isArray(items) || items.length === 0) {
    const err = new Error('الأصناف مطلوبة لإنشاء أمر شراء');
    err.statusCode = 400;
    throw err;
  }

  const client_db = await pool.connect();

  try {
    await client_db.query('BEGIN');

    const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();

    if (userRole === 'project_manager') {
      for (const item of items) {
        if (!item.item_id || !item.quantity) {
          const err = new Error('كل صنف يجب أن يحتوي على item_id, quantity');
          err.statusCode = 400;
          throw err;
        }
        item.unit_cost = 0;
      }
      data.supplier_id = null;
    } else {
      for (const item of items) {
        if (!item.item_id || !item.quantity || !item.unit_cost) {
          const err = new Error('كل صنف يجب أن يحتوي على item_id, quantity, unit_cost');
          err.statusCode = 400;
          throw err;
        }
      }
    }

    let subtotal = 0;
    for (const item of items) {
      const unitCost = item.unit_cost || 0;
      subtotal += item.quantity * unitCost;
    }

    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;
    const poNumber = await repo.generatePONumber();
    const status = userRole === 'project_manager' ? 'pending' : (data.status || 'draft');

    const po = await repo.createPO({
      po_number: poNumber,
      supplier_id: data.supplier_id || null,
      project_id: data.project_id,
      order_date: data.order_date || new Date(),
      expected_date: data.expected_date,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax_amount: parseFloat(taxAmount.toFixed(2)),
      total_amount: parseFloat(totalAmount.toFixed(2)),
      created_by: currentUser.id,
      notes: data.notes,
      status: status
    }, client_db);

    for (const item of items) {
      await client_db.query(
        `INSERT INTO purchase_order_items (po_id, item_id, quantity, unit_cost)
         VALUES ($1, $2, $3, $4)`,
        [po.id, item.item_id, item.quantity, item.unit_cost]
      );
    }

    await client_db.query('COMMIT');

    if (userRole === 'project_manager') {
      try {
        const { rows: procurementManagers } = await query(
          `SELECT u.id FROM users u 
           JOIN roles r ON u.role_id = r.id 
           WHERE r.name = 'procurement_manager'`
        );
        for (const manager of procurementManagers) {
          await notifRepo.createNotification({
            user_id: manager.id,
            title: 'طلب شراء جديد',
            message: `تم إنشاء طلب شراء جديد ${poNumber} من مدير المشروع - مشروع #${data.project_id}`,
            type: 'info',
            entity_type: 'purchase_order',
            entity_id: po.id
          });
        }
      } catch (notifError) {
        console.error('[Notification] Failed to create notifications:', notifError.message);
      }
    }

    const fullPO = await repo.getPOById(po.id);
    const poItems = await repo.getPOItems(po.id);
    return { ...fullPO, items: poItems };

  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
}

/**
 * Update PO with supplier and prices (Procurement Manager action)
 */
async function updatePO(poId, data, currentUser) {
  const userRole = (currentUser.role || currentUser.role_name || '').toLowerCase();

  if (!['super_admin', 'general_manager', 'procurement_manager'].includes(userRole)) {
    const err = new Error('ليس لديك صلاحية تعديل أوامر الشراء');
    err.statusCode = 403;
    throw err;
  }

  const { supplier_id, items, status } = data;

  if (!supplier_id) {
    const err = new Error('المورد مطلوب');
    err.statusCode = 400;
    throw err;
  }

  const client_db = await pool.connect();

  try {
    await client_db.query('BEGIN');

    const currentPO = await repo.getPOById(poId);
    if (!currentPO) {
      const err = new Error('أمر الشراء غير موجود');
      err.statusCode = 404;
      throw err;
    }

    // ✅ جيب الـ items الأصلية من الـ DB عشان نكمّل الـ quantity اللي مش بعتها الفرونت
    const existingItems = await repo.getPOItems(poId);

    let subtotal = 0;
    const resolvedItems = [];

    if (items && Array.isArray(items)) {
      for (const item of items) {
        // ✅ support both item_id and id (frontend may send either)
        const itemId = item.item_id ?? item.id;

        if (!itemId) {
          const err = new Error('كل صنف يجب أن يحتوي على item_id');
          err.statusCode = 400;
          throw err;
        }

        // ✅ unit_cost=0 is valid — only reject undefined/null
        if (item.unit_cost === undefined || item.unit_cost === null) {
          const err = new Error('كل صنف يجب أن يحتوي على unit_cost');
          err.statusCode = 400;
          throw err;
        }

        // ✅ لو quantity مش موجود، خد القيمة الأصلية من الـ DB
        const existingItem = existingItems.find(
          ei => ei.item_id === itemId || ei.id === itemId
        );
        const quantity = item.quantity || existingItem?.quantity || 1;
        const unitCost = parseFloat(item.unit_cost);

        subtotal += quantity * unitCost;
        resolvedItems.push({ item_id: itemId, quantity, unit_cost: unitCost });
      }
    }

    const taxAmount = subtotal * 0.15;
    const totalAmount = subtotal + taxAmount;

    await client_db.query(
      `UPDATE purchase_orders 
       SET supplier_id = $1,
           subtotal = $2,
           tax_amount = $3,
           total_amount = $4,
           status = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [
        supplier_id,
        parseFloat(subtotal.toFixed(2)),
        parseFloat(taxAmount.toFixed(2)),
        parseFloat(totalAmount.toFixed(2)),
        status || currentPO.status,
        poId
      ]
    );

    if (resolvedItems.length > 0) {
      await client_db.query(`DELETE FROM purchase_order_items WHERE po_id = $1`, [poId]);

      for (const item of resolvedItems) {
        await client_db.query(
          `INSERT INTO purchase_order_items (po_id, item_id, quantity, unit_cost)
           VALUES ($1, $2, $3, $4)`,
          [poId, item.item_id, item.quantity, item.unit_cost]
        );
      }
    }

    await client_db.query('COMMIT');

    const fullPO = await repo.getPOById(poId);
    const poItems = await repo.getPOItems(poId);
    return { ...fullPO, items: poItems };

  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
}

/**
 * Receive Goods (create GRN + update inventory + journal entry)
 */
async function receiveGoods(poId, receiptData, currentUser) {
  const { receipt_date, notes, items } = receiptData;

  if (!items || !Array.isArray(items) || items.length === 0) {
    const err = new Error('الأصناف المستلمة مطلوبة');
    err.statusCode = 400;
    throw err;
  }

  const client_db = await pool.connect();

  try {
    await client_db.query('BEGIN');

    const po = await repo.getPOById(poId);
    if (!po) {
      const err = new Error('أمر الشراء غير موجود');
      err.statusCode = 404;
      throw err;
    }

    if (po.status === 'cancelled' || po.status === 'received') {
      const err = new Error('لا يمكن استلام بضاعة لأمر شراء ملغي أو مكتمل');
      err.statusCode = 400;
      throw err;
    }

    const poItems = await repo.getPOItems(poId);
    let totalReceived = 0;
    const journalLines = [];

    for (const receiptItem of items) {
      const poItem = poItems.find(i => i.id === receiptItem.po_item_id);

      if (!poItem) {
        const err = new Error(`صنف ${receiptItem.po_item_id} غير موجود في أمر الشراء`);
        err.statusCode = 400;
        throw err;
      }

      const remainingQty = poItem.quantity - poItem.quantity_received;
      if (receiptItem.quantity_received > remainingQty) {
        const err = new Error(`الكمية المستلمة تتجاوز الكمية المطلوبة للصنف ${poItem.item_name}`);
        err.statusCode = 400;
        throw err;
      }

      const lineTotal = receiptItem.quantity_received * receiptItem.unit_cost;
      totalReceived += lineTotal;

      const invItem = await inventoryRepo.getItemById(poItem.item_id);
      if (!invItem) {
        const err = new Error(`الصنف ${poItem.item_id} غير موجود في المخزون`);
        err.statusCode = 404;
        throw err;
      }

      const inventoryAccount = await coaRepo.getAccountByCode(invItem.coa_account_code);
      if (!inventoryAccount) {
        const err = new Error(`حساب المخزون ${invItem.coa_account_code} غير موجود`);
        err.statusCode = 500;
        throw err;
      }

      journalLines.push({
        account_id: inventoryAccount.id,
        debit_amount: parseFloat(lineTotal.toFixed(2)),
        credit_amount: 0,
        description: `استلام مخزون: ${invItem.item_name} (${receiptItem.quantity_received} ${invItem.unit_of_measure})`
      });
    }

    // ✅ Get supplier's coa_account_code from suppliers table
    const supplierResult = await client_db.query(
      `SELECT coa_account_code FROM suppliers WHERE id = $1`,
      [po.supplier_id]
    );
    const supplierCoaCode = supplierResult.rows[0]?.coa_account_code || '21301';

    const supplierAccount = await coaRepo.getAccountByCode(supplierCoaCode);
    if (!supplierAccount) {
      const err = new Error('حساب الدائن غير موجود');
      err.statusCode = 500;
      throw err;
    }

    journalLines.push({
      account_id: supplierAccount.id,
      debit_amount: 0,
      credit_amount: parseFloat(totalReceived.toFixed(2)),
      description: `مقابل استلام بضاعة - ${po.po_number}`
    });

    const grnNumber = await repo.generateGRNNumber();

    const grn = await repo.createGRN({
      grn_number: grnNumber,
      po_id: poId,
      receipt_date: receipt_date || new Date(),
      created_by: currentUser.id,
      notes
    }, client_db);

    for (const receiptItem of items) {
      await repo.createGRNItems(grn.id, [{
        po_item_id: receiptItem.po_item_id,
        item_id: receiptItem.item_id,
        quantity_received: receiptItem.quantity_received,
        unit_cost: receiptItem.unit_cost
      }], client_db);

      await inventoryRepo.adjustStock(receiptItem.item_id, receiptItem.quantity_received, client_db);
    }

    await repo.updatePOItemsReceived(items, client_db);

    const updatedPOItems = await repo.getPOItems(poId);
    const allFullyReceived = updatedPOItems.every(item => item.quantity_received >= item.quantity);
    const anyReceived = updatedPOItems.some(item => item.quantity_received > 0);
    const newStatus = allFullyReceived ? 'received' : (anyReceived ? 'partial' : po.status);
    await repo.updatePOStatus(poId, newStatus, client_db);

    await journalService.createJournalEntry({
      description: `قيد استلام بضاعة - ${grnNumber}`,
      reference_type: 'goods_receipt',
      reference_id: grn.id,
      project_id: po.project_id
    }, journalLines, currentUser, client_db);

    await client_db.query('COMMIT');

    return await repo.getGRNById(grn.id);

  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
}

/**
 * Create Purchase Invoice with journal entry
 * Dr. Cost/Inventory + Dr. VAT Input / Cr. Accounts Payable
 */
async function createPurchaseInvoice(data, currentUser) {
  const { supplier_id, subtotal, is_tax_applied, tax_percentage } = data;

  if (!supplier_id || subtotal === undefined) {
    const err = new Error('المورد والمبلغ الفرعي مطلوبان');
    err.statusCode = 400;
    throw err;
  }

  const taxEnabled = is_tax_applied !== false;
  let taxRate = 0;
  let taxAmount = 0;
  let totalAmount = 0;
  const finalSubtotal = parseFloat(subtotal);

  if (taxEnabled) {
    taxRate = parseFloat(tax_percentage || 15.00);
    if (isNaN(taxRate) || taxRate < 0) {
      const err = new Error('نسبة الضريبة يجب أن تكون رقماً صحيحاً أكبر من أو تساوي صفر');
      err.statusCode = 400;
      throw err;
    }
    taxAmount = finalSubtotal * (taxRate / 100);
    totalAmount = finalSubtotal + taxAmount;
  } else {
    totalAmount = finalSubtotal;
  }

  const client_db = await pool.connect();

  try {
    await client_db.query('BEGIN');

    const invoiceNumber = await repo.generatePurchaseInvoiceNumber();

    const invoice = await repo.createPurchaseInvoice({
      invoice_number: invoiceNumber,
      supplier_id,
      po_id: data.po_id,
      grn_id: data.grn_id,
      project_id: data.project_id,
      invoice_date: data.invoice_date || new Date(),
      due_date: data.due_date,
      subtotal: parseFloat(finalSubtotal.toFixed(2)),
      tax_rate: parseFloat(taxRate.toFixed(2)),
      tax_amount: parseFloat(taxAmount.toFixed(2)),
      total_amount: parseFloat(totalAmount.toFixed(2)),
      is_tax_applied: taxEnabled,
      tax_percentage: parseFloat(taxRate.toFixed(2)),
      created_by: currentUser.id,
      notes: data.notes
    }, client_db);

    // Save line items
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      console.log(`[createPurchaseInvoice] Saving ${data.items.length} line items...`);
      await repo.createPurchaseInvoiceItems(invoice.id, data.items, client_db);
      console.log(`[createPurchaseInvoice] ✅ Line items saved successfully`);
    }

    // ✅ Get supplier's coa_account_code from suppliers table
    const supplierResult = await client_db.query(
      `SELECT coa_account_code FROM suppliers WHERE id = $1`,
      [supplier_id]
    );
    const supplierCoaCode = supplierResult.rows[0]?.coa_account_code || '21301';

    const supplierAccount = await coaRepo.getAccountByCode(supplierCoaCode);
    const vatInputAccount = await coaRepo.getAccountByCode('2220102');
    const costAccount     = await coaRepo.getAccountByCode('331');

    if (!supplierAccount || !vatInputAccount || !costAccount) {
      const err = new Error('حسابات دليل الحسابات المطلوبة غير موجودة (21301/21302, 2220102, 331)');
      err.statusCode = 500;
      throw err;
    }

    const lines = [
      {
        account_id: costAccount.id,
        debit_amount: parseFloat(finalSubtotal.toFixed(2)),
        credit_amount: 0,
        description: `تكلفة مشتريات - ${invoiceNumber}`
      }
    ];

    if (taxEnabled && taxAmount > 0) {
      lines.push({
        account_id: vatInputAccount.id,
        debit_amount: parseFloat(taxAmount.toFixed(2)),
        credit_amount: 0,
        description: `ضريبة مدخلات - ${invoiceNumber}`
      });
    }

    lines.push({
      account_id: supplierAccount.id,
      debit_amount: 0,
      credit_amount: parseFloat(totalAmount.toFixed(2)),
      description: `فاتورة مورد مستحقة - ${invoiceNumber}`
    });

    await journalService.createJournalEntry({
      description: `قيد فاتورة شراء ${invoiceNumber}`,
      reference_type: 'purchase_invoice',
      reference_id: invoice.id,
      project_id: invoice.project_id
    }, lines, currentUser, client_db);

    // Generate PDF
    const supplierResult2 = await client_db.query(
      `SELECT name FROM suppliers WHERE id = $1`, [supplier_id]
    );
    const invoiceForPDF = {
      ...invoice,
      supplier_name: supplierResult2.rows[0]?.name || 'N/A',
      supplier_email: null,
      project_name: null
    };

    const pdfPath = await PurchaseInvoicePDF.generatePurchaseInvoicePDF(invoiceForPDF);

    await client_db.query(
      `UPDATE purchase_invoices 
       SET pdf_path = $1, pdf_generated_at = $2, updated_at = NOW()
       WHERE id = $3`,
      [pdfPath, new Date().toISOString(), invoice.id]
    );

    await client_db.query('COMMIT');

    return { ...invoice, pdf_path: pdfPath };

  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
}

/**
 * Record supplier payment
 * Dr. Accounts Payable / Cr. Bank
 */
async function recordSupplierPayment(invoiceId, paymentData, currentUser) {
  const { amount } = paymentData;

  if (!amount || amount <= 0) {
    const err = new Error('مبلغ الدفع يجب أن يكون أكبر من صفر');
    err.statusCode = 400;
    throw err;
  }

  const client_db = await pool.connect();

  try {
    await client_db.query('BEGIN');

    const invoice = await repo.getPurchaseInvoiceById(invoiceId);
    if (!invoice) {
      const err = new Error('فاتورة الشراء غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    const remainingAmount = parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount);
    if (parseFloat(amount) > remainingAmount + 0.01) {
      const err = new Error(`مبلغ الدفع يتجاوز المتبقي. المتبقي: ${remainingAmount.toFixed(2)}`);
      err.statusCode = 400;
      throw err;
    }

    await repo.updatePurchaseInvoicePayment(invoiceId, amount, client_db);

    // ✅ Get supplier's coa_account_code
    const supplierResult = await client_db.query(
      `SELECT coa_account_code FROM suppliers WHERE id = $1`,
      [invoice.supplier_id]
    );
    const supplierCoaCode = supplierResult.rows[0]?.coa_account_code || '21301';

    const supplierAccount = await coaRepo.getAccountByCode(supplierCoaCode);
    const bankAccount     = await coaRepo.getAccountByCode('12401');

    if (!supplierAccount || !bankAccount) {
      const err = new Error('حسابات دليل الحسابات المطلوبة غير موجودة');
      err.statusCode = 500;
      throw err;
    }

    const lines = [
      {
        account_id: supplierAccount.id,
        debit_amount: parseFloat(parseFloat(amount).toFixed(2)),
        credit_amount: 0,
        description: `سداد دفعة لمورد - ${invoice.invoice_number}`
      },
      {
        account_id: bankAccount.id,
        debit_amount: 0,
        credit_amount: parseFloat(parseFloat(amount).toFixed(2)),
        description: `سداد فاتورة ${invoice.invoice_number}`
      }
    ];

    await journalService.createJournalEntry({
      description: `قيد سداد دفعة لمورد - ${invoice.invoice_number}`,
      reference_type: 'supplier_payment',
      reference_id: invoice.id,
      project_id: invoice.project_id
    }, lines, currentUser, client_db);

    await client_db.query('COMMIT');

    return await repo.getPurchaseInvoiceById(invoiceId);

  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
}

/**
 * Get PO by ID
 */
async function getPOById(id) {
  const po = await repo.getPOById(id);
  if (!po) {
    const err = new Error('أمر الشراء غير موجود');
    err.statusCode = 404;
    throw err;
  }
  const items = await repo.getPOItems(id);
  return { ...po, items };
}

/**
 * Get all POs
 */
async function getAllPOs(filters) {
  return repo.getAllPOs(filters);
}

/**
 * Get purchase invoice by ID
 */
async function getPurchaseInvoiceById(id) {
  const invoice = await repo.getPurchaseInvoiceWithItems(id);
  if (!invoice) {
    const err = new Error('فاتورة الشراء غير موجودة');
    err.statusCode = 404;
    throw err;
  }
  return invoice;
}

/**
 * Finalize Purchase Invoice - Increase stock and create journal entry
 */
async function finalizePurchaseInvoice(invoiceId, currentUser) {
  const client_db = await pool.connect();
  
  try {
    await client_db.query('BEGIN');
    
    // 1. Get invoice with items
    console.log(`[Finalize Purchase] === STARTING FINALIZATION ===`);
    console.log(`[Finalize Purchase] Invoice ID: ${invoiceId}`);
    
    const invoice = await repo.getPurchaseInvoiceWithItems(invoiceId);
    if (!invoice) {
      const err = new Error('فاتورة الشراء غير موجودة');
      err.statusCode = 404;
      throw err;
    }
    
    console.log(`[Finalize Purchase] Invoice found: ${invoice.invoice_number}`);
    console.log(`[Finalize Purchase] Status: ${invoice.status}`);
    console.log(`[Finalize Purchase] Items count: ${invoice.items?.length || 0}`);
    
    if (invoice.status === 'final') {
      const err = new Error('الفاتورة معتمدة بالفعل');
      err.statusCode = 400;
      throw err;
    }
    
    if (!invoice.items || invoice.items.length === 0) {
      console.error('[Finalize Purchase] ❌ No items found in invoice!');
      console.error('[Finalize Purchase] Invoice data:', JSON.stringify(invoice, null, 2));
      const err = new Error('الفاتورة لا تحتوي على أصناف');
      err.statusCode = 400;
      throw err;
    }
    
    // 2. Increase stock for each item
    console.log(`[Finalize Purchase] === INCREASING STOCK ===`);
    
    for (const item of invoice.items) {
      const qty = parseFloat(item.quantity);
      const inventoryItemId = parseInt(item.inventory_item_id);
      const warehouseId = parseInt(item.warehouse_id);
      
      console.log(`[Finalize Purchase] Processing item: ${item.item_name_ar || item.item_name}`);
      console.log(`  - Inventory Item ID: ${inventoryItemId}`);
      console.log(`  - Warehouse ID: ${warehouseId}`);
      console.log(`  - Quantity: ${qty}`);
      
      if (isNaN(qty) || qty <= 0) {
        const err = new Error(`كمية غير صحيحة للصنف ${item.item_name_ar || item.item_name}`);
        err.statusCode = 400;
        throw err;
      }
      
      if (isNaN(inventoryItemId)) {
        const err = new Error(`معرف الصنف غير صحيح: ${item.item_name_ar || item.item_name}`);
        err.statusCode = 400;
        throw err;
      }
      
      if (isNaN(warehouseId)) {
        const err = new Error(`معرف المستودع غير صحيح للصنف ${item.item_name_ar || item.item_name}`);
        err.statusCode = 400;
        throw err;
      }
      
      // Update warehouse_stock (ON CONFLICT for upsert)
      // NOTE: available_quantity is a GENERATED column - DO NOT insert or update it!
      await client_db.query(
        `INSERT INTO warehouse_stock (warehouse_id, item_id, quantity_on_hand, reserved_quantity)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (warehouse_id, item_id) 
         DO UPDATE SET 
           quantity_on_hand = warehouse_stock.quantity_on_hand + $3,
           updated_at = NOW()`,
        [warehouseId, inventoryItemId, qty]
      );
      
      // Create inventory movement
      await client_db.query(
        `INSERT INTO inventory_movements (inventory_item_id, movement_type, quantity, performed_by, notes, performed_at)
         VALUES ($1, 'in', $2, $3, $4, NOW())`,
        [inventoryItemId, qty, currentUser.id, `Stock increase from Purchase Invoice ${invoice.invoice_number}`]
      );
      
      console.log(`[Finalize Purchase] ✅ Added ${qty} units of ${item.item_name_ar || item.item_name} to warehouse ${warehouseId}`);
    }
    
    // 3. Create journal entry (if not already created)
    if (!invoice.journal_entry_id) {
      console.log(`[Finalize Purchase] === CREATING JOURNAL ENTRY ===`);
      
      const supplierResult = await client_db.query(
        `SELECT coa_account_code FROM suppliers WHERE id = $1`,
        [invoice.supplier_id]
      );
      const supplierCoaCode = supplierResult.rows[0]?.coa_account_code || '21301';
      
      console.log(`[Finalize Purchase] Supplier COA Code: ${supplierCoaCode}`);
      
      const supplierAccount = await coaRepo.getAccountByCode(supplierCoaCode);
      const vatInputAccount = await coaRepo.getAccountByCode('2220102');
      const inventoryAccount = await coaRepo.getAccountByCode('1201');
      
      if (!supplierAccount) {
        console.error('[Finalize Purchase] ❌ Supplier account not found:', supplierCoaCode);
        const err = new Error(`حساب المورد غير موجود: ${supplierCoaCode}`);
        err.statusCode = 500;
        throw err;
      }
      
      if (!inventoryAccount) {
        console.error('[Finalize Purchase] ❌ Inventory account (1201) not found');
        const err = new Error('حساب المخزون (1201) غير موجود');
        err.statusCode = 500;
        throw err;
      }
      
      // Parse amounts safely
      const subtotal = parseFloat(invoice.subtotal) || 0;
      const taxAmount = parseFloat(invoice.tax_amount) || 0;
      const totalAmount = parseFloat(invoice.total_amount) || 0;
      
      console.log(`[Finalize Purchase] Financial amounts:`);
      console.log(`  - Subtotal: ${subtotal}`);
      console.log(`  - Tax: ${taxAmount}`);
      console.log(`  - Total: ${totalAmount}`);
      
      // Create journal entry
      const entryResult = await client_db.query(
        `INSERT INTO journal_entries (entry_date, description, reference_type, reference_id, entry_type, posted_by, is_posted)
         VALUES ($1, $2, 'purchase_invoice', $3, 'auto', $4, true)
         RETURNING id`,
        [invoice.invoice_date, `Purchase Invoice ${invoice.invoice_number}`, invoice.id, currentUser.id]
      );
      
      const journalEntryId = entryResult.rows[0].id;
      
      // DEBIT: Inventory Account (1201) - Subtotal
      await client_db.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [journalEntryId, inventoryAccount.id, `Purchase Invoice ${invoice.invoice_number}`, subtotal, 0]
      );
      
      // DEBIT: VAT Input Account (if applicable)
      if (taxAmount > 0 && vatInputAccount) {
        await client_db.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount)
           VALUES ($1, $2, $3, $4, $5)`,
          [journalEntryId, vatInputAccount.id, `VAT Input - ${invoice.invoice_number}`, taxAmount, 0]
        );
      }
      
      // CREDIT: Supplier AP Account - Total
      await client_db.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [journalEntryId, supplierAccount.id, `Supplier Payable - ${invoice.invoice_number}`, 0, totalAmount]
      );
      
      // Link journal entry to invoice
      await client_db.query(
        `UPDATE purchase_invoices SET journal_entry_id = $1 WHERE id = $2`,
        [journalEntryId, invoice.id]
      );
      
      console.log(`[Finalize Purchase] ✅ Journal Entry created: ${journalEntryId}`);
      console.log(`[Finalize Purchase]   DEBIT Inventory (1201): ${subtotal}`);
      console.log(`[Finalize Purchase]   DEBIT VAT Input (2220102): ${taxAmount}`);
      console.log(`[Finalize Purchase]   CREDIT Supplier (${supplierCoaCode}): ${totalAmount}`);
    }
    
    // 4. Update invoice status to 'final'
    const result = await client_db.query(
      `UPDATE purchase_invoices SET status = 'final', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [invoiceId]
    );
    
    await client_db.query('COMMIT');
    
    console.log(`[Finalize Purchase] ✅ Invoice ${invoiceId} finalized successfully`);
    
    return result.rows[0];
    
  } catch (error) {
    await client_db.query('ROLLBACK');
    console.error('[Finalize Purchase] ❌ Error:', error.message);
    console.error('[Finalize Purchase] ❌ Stack:', error.stack);
    throw error;
  } finally {
    client_db.release();
  }
}

/**
 * Get all purchase invoices
 */
async function getAllPurchaseInvoices(filters) {
  return repo.getAllPurchaseInvoices(filters);
}

/**
 * Get purchasing dashboard
 */
async function getPurchasingDashboard() {
  const dashboardResult = await query(
    `SELECT
       (SELECT COUNT(*) FROM purchase_orders WHERE status IN ('draft', 'sent', 'partial')) AS open_pos,
       (SELECT COUNT(*) FROM purchase_orders WHERE status IN ('draft', 'sent'))            AS pending_receipts,
       (SELECT COUNT(*) FROM purchase_invoices WHERE status IN ('draft', 'partial'))       AS unpaid_invoices,
       (SELECT COALESCE(SUM(total_amount - paid_amount), 0)
        FROM purchase_invoices WHERE status != 'paid')                                     AS total_payables`
  );

  const row = dashboardResult.rows[0];
  return {
    open_pos:         parseInt(row.open_pos),
    pending_receipts: parseInt(row.pending_receipts),
    unpaid_invoices:  parseInt(row.unpaid_invoices),
    total_payables:   parseFloat(row.total_payables)
  };
}

module.exports = {
  createPO,
  updatePO,
  receiveGoods,
  createPurchaseInvoice,
  finalizePurchaseInvoice,
  recordSupplierPayment,
  getPOById,
  getAllPOs,
  getPurchaseInvoiceById,
  getAllPurchaseInvoices,
  getPurchasingDashboard
};