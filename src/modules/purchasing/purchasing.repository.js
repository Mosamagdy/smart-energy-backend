const { pool, query } = require('../../db');

// ============================================================================
// Purchasing Repository - Data Access Layer
// ============================================================================

// --- Purchase Orders ---

async function createPO(data, client) {
  const { po_number, supplier_id, project_id, order_date, expected_date, subtotal, tax_amount, total_amount, created_by, notes, status } = data;
  
  const queryFn = client.query.bind(client);
  const result = await queryFn(
    `INSERT INTO purchase_orders (
      po_number, supplier_id, project_id, order_date, expected_date,
      subtotal, tax_amount, total_amount, created_by, notes, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [po_number, supplier_id || null, project_id, order_date, expected_date, subtotal, tax_amount, total_amount, created_by, notes, status || 'draft']
  );
  return result.rows[0];
}

async function getPOById(id) {
  const result = await query(
    `SELECT 
       po.*,
       s.name AS supplier_name,
       s.supplier_code,
       p.name AS project_name,
       u.first_name || ' ' || u.last_name AS created_by_name
     FROM purchase_orders po
     LEFT JOIN suppliers s ON s.id = po.supplier_id
     LEFT JOIN projects p ON p.id = po.project_id
     LEFT JOIN users u ON u.id = po.created_by
     WHERE po.id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getAllPOs(filters = {}) {
  const { status, supplier_id, project_id } = filters;
  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (status) {
    whereClause += ` AND po.status = $${paramCount}`;
    values.push(status);
    paramCount++;
  }
  if (supplier_id) {
    whereClause += ` AND po.supplier_id = $${paramCount}`;
    values.push(supplier_id);
    paramCount++;
  }
  if (project_id) {
    whereClause += ` AND po.project_id = $${paramCount}`;
    values.push(project_id);
    paramCount++;
  }

  const result = await query(
    `SELECT 
       po.*,
       s.name AS supplier_name,
       s.supplier_code,
       p.name AS project_name
     FROM purchase_orders po
     LEFT JOIN suppliers s ON s.id = po.supplier_id
     LEFT JOIN projects p ON p.id = po.project_id
     ${whereClause}
     ORDER BY po.order_date DESC`,
    values
  );
  return result.rows;
}

async function updatePOStatus(id, status, client) {
  const queryFn = client.query.bind(client);
  const result = await queryFn(
    `UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0];
}

async function generatePONumber() {
  const result = await query(
    `SELECT 'PO-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0') as po_number FROM purchase_orders`
  );
  return result.rows[0].po_number;
}

async function getPOItems(poId) {
  const result = await query(
    `SELECT 
       poi.*,
       i.item_code,
       i.item_name,
       i.item_name_ar
     FROM purchase_order_items poi
     JOIN inventory_items i ON i.id = poi.item_id
     WHERE poi.po_id = $1
     ORDER BY poi.id`,
    [poId]
  );
  return result.rows;
}

// --- Goods Receipts ---

async function createGRN(data, client) {
  const { grn_number, po_id, receipt_date, created_by, notes } = data;
  const queryFn = client.query.bind(client);
  const result = await queryFn(
    `INSERT INTO goods_receipts (grn_number, po_id, receipt_date, created_by, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [grn_number, po_id, receipt_date, created_by, notes]
  );
  return result.rows[0];
}

async function getGRNById(id) {
  const result = await query(
    `SELECT 
       grn.*,
       po.po_number,
       s.name AS supplier_name,
       u.first_name || ' ' || u.last_name AS created_by_name
     FROM goods_receipts grn
     JOIN purchase_orders po ON po.id = grn.po_id
     JOIN suppliers s ON s.id = po.supplier_id
     LEFT JOIN users u ON u.id = grn.created_by
     WHERE grn.id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function generateGRNNumber() {
  const result = await query(
    `SELECT 'GRN-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0') as grn_number FROM goods_receipts`
  );
  return result.rows[0].grn_number;
}

async function createGRNItems(grnId, items, client) {
  const queryFn = client.query.bind(client);
  for (const item of items) {
    await queryFn(
      `INSERT INTO goods_receipt_items (grn_id, po_item_id, item_id, quantity_received, unit_cost)
       VALUES ($1, $2, $3, $4, $5)`,
      [grnId, item.po_item_id, item.item_id, item.quantity_received, item.unit_cost]
    );
  }
}

async function updatePOItemsReceived(items, client) {
  const queryFn = client.query.bind(client);
  for (const item of items) {
    await queryFn(
      `UPDATE purchase_order_items 
       SET quantity_received = quantity_received + $1
       WHERE id = $2`,
      [item.quantity_received, item.po_item_id]
    );
  }
}

// --- Purchase Invoices ---

async function createPurchaseInvoice(data, client) {
  const { invoice_number, supplier_id, po_id, grn_id, project_id, invoice_date, due_date, subtotal, tax_rate, tax_amount, total_amount, is_tax_applied, tax_percentage, created_by, notes } = data;
  const queryFn = client.query.bind(client);
  const result = await queryFn(
    `INSERT INTO purchase_invoices (
      invoice_number, supplier_id, po_id, grn_id, project_id, invoice_date, due_date,
      subtotal, tax_rate, tax_amount, total_amount, is_tax_applied, tax_percentage, created_by, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [invoice_number, supplier_id, po_id, grn_id, project_id, invoice_date, due_date, subtotal, tax_rate, tax_amount, total_amount, is_tax_applied, tax_percentage, created_by, notes]
  );
  return result.rows[0];
}

async function getPurchaseInvoiceById(id) {
  const result = await query(
    `SELECT 
       pi.*,
       s.name AS supplier_name,
       s.supplier_code,
       po.po_number,
       p.name AS project_name,
       u.first_name || ' ' || u.last_name AS created_by_name,
       je.entry_number AS journal_entry_number,
       je.entry_date AS journal_entry_date
     FROM purchase_invoices pi
     JOIN suppliers s ON s.id = pi.supplier_id
     LEFT JOIN purchase_orders po ON po.id = pi.po_id
     LEFT JOIN projects p ON p.id = pi.project_id
     LEFT JOIN users u ON u.id = pi.created_by
     LEFT JOIN journal_entries je ON je.id = pi.journal_entry_id
     WHERE pi.id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

async function getAllPurchaseInvoices(filters = {}) {
  const { status, supplier_id } = filters;
  let whereClause = 'WHERE 1=1';
  const values = [];
  let paramCount = 1;

  // Support multiple statuses (e.g., "draft,partial")
  if (status) {
    const statusArray = status.split(',').map(s => s.trim());
    if (statusArray.length === 1) {
      // Single status
      whereClause += ` AND pi.status = $${paramCount}`;
      values.push(statusArray[0]);
      paramCount++;
    } else {
      // Multiple statuses - use ANY(array)
      whereClause += ` AND pi.status = ANY($${paramCount})`;
      values.push(statusArray);
      paramCount++;
    }
    console.log('[PurchaseInvoice] Status filter:', status, '→ Array:', statusArray);
  }
  
  if (supplier_id) {
    whereClause += ` AND pi.supplier_id = $${paramCount}`;
    values.push(supplier_id);
    paramCount++;
  }

  console.log('[PurchaseInvoice] SQL Query:', whereClause);
  console.log('[PurchaseInvoice] Values:', values);

  const result = await query(
    `SELECT 
       pi.*,
       s.name AS supplier_name,
       s.supplier_code,
       po.po_number,
       p.name AS project_name,
       je.entry_number AS journal_entry_number,
       pi.remaining_amount
     FROM purchase_invoices pi
     JOIN suppliers s ON s.id = pi.supplier_id
     LEFT JOIN purchase_orders po ON po.id = pi.po_id
     LEFT JOIN projects p ON p.id = pi.project_id
     LEFT JOIN journal_entries je ON je.id = pi.journal_entry_id
     ${whereClause}
     ORDER BY pi.invoice_date DESC`,
    values
  );
  console.log('[PurchaseInvoice] Found', result.rows.length, 'invoices');
  return result.rows;
}

async function updatePurchaseInvoicePayment(id, amount, client) {
  const queryFn = client.query.bind(client);
  const result = await queryFn(
    `UPDATE purchase_invoices 
     SET paid_amount = paid_amount + $1,
         status = CASE
           WHEN paid_amount + $1 >= total_amount THEN 'paid'
           WHEN paid_amount + $1 > 0 THEN 'partial'
           ELSE status END,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [amount, id]
  );
  return result.rows[0];
}

async function updatePurchaseInvoice(id, data, client = null) {
  const allowedFields = ['status', 'paid_amount', 'pdf_path', 'pdf_generated_at', 'notes'];
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));

  if (keys.length === 0) {
    return getPurchaseInvoiceById(id);
  }

  const queryFn = client ? client.query.bind(client) : query;
  const setClauses = [];
  const values = [];

  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });

  const setClause = setClauses.join(', ');
  const allValues = [...values, id];

  const sql = `UPDATE purchase_invoices SET ${setClause}, updated_at = NOW() 
               WHERE id = $${keys.length + 1} RETURNING *`;

  const result = await queryFn(sql, allValues);
  return result.rows[0] || null;
}

async function generatePurchaseInvoiceNumber() {
  const result = await query(
    `SELECT 'PINV-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0') as invoice_number FROM purchase_invoices`
  );
  return result.rows[0].invoice_number;
}

/**
 * Create line items for a purchase invoice
 */
async function createPurchaseInvoiceItems(invoiceId, items, client) {
  const queryFn = client.query.bind(client);
  const insertedItems = [];
  
  for (const item of items) {
    const result = await queryFn(
      `INSERT INTO purchase_invoice_items (
        invoice_id, inventory_item_id, warehouse_id,
        quantity, unit_cost, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        invoiceId,
        item.inventory_item_id,
        item.warehouse_id,
        item.quantity,
        item.unit_cost,
        item.notes || null
      ]
    );
    insertedItems.push(result.rows[0]);
  }
  
  return insertedItems;
}

/**
 * Get purchase invoice with line items
 */
async function getPurchaseInvoiceWithItems(id) {
  const invoice = await getPurchaseInvoiceById(id);
  if (!invoice) return null;

  const items = await query(
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
    [id]
  );

  return {
    ...invoice,
    items: items.rows
  };
}

module.exports = {
  createPO, getPOById, getAllPOs, updatePOStatus, generatePONumber, getPOItems,
  createGRN, getGRNById, generateGRNNumber, createGRNItems, updatePOItemsReceived,
  createPurchaseInvoice, getPurchaseInvoiceById, getAllPurchaseInvoices, 
  updatePurchaseInvoicePayment, updatePurchaseInvoice, generatePurchaseInvoiceNumber,
  createPurchaseInvoiceItems, getPurchaseInvoiceWithItems
};
