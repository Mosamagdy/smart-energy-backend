const { pool, query } = require('../../db');

/**
 * Get sales invoice by ID with client and project info
 */
async function getSalesInvoiceById(id) {
  const result = await query(
    `SELECT 
       si.*,
       l.client_name,
       l.contact_email,
       l.contact_phone,
       p.name as project_name
     FROM sales_invoices si
     LEFT JOIN leads l ON si.lead_id = l.id
     LEFT JOIN projects p ON si.project_id = p.id
     WHERE si.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get sales invoice with line items
 */
async function getSalesInvoiceWithItems(id) {
  const invoice = await getSalesInvoiceById(id);
  
  if (!invoice) return null;

  const items = await query(
    `SELECT 
       sii.*,
       ii.item_code,
       ii.item_name,
       ii.item_name_ar,
       ii.unit_cost,
       ii.coa_account_code,
       ii.cost_account_code,
       w.warehouse_code,
       w.warehouse_name,
       w.warehouse_name_ar
     FROM sales_invoice_items sii
     JOIN inventory_items ii ON sii.inventory_item_id = ii.id
     JOIN warehouses w ON sii.warehouse_id = w.id
     WHERE sii.invoice_id = $1
     ORDER BY sii.id`,
    [id]
  );

  return {
    ...invoice,
    items: items.rows
  };
}

/**
 * Create line items for an invoice
 */
async function createInvoiceItems(invoiceId, items, client = null) {
  const queryFn = client ? client.query.bind(client) : query;
  
  const insertedItems = [];
  
  for (const item of items) {
    const result = await queryFn(
      `INSERT INTO sales_invoice_items (
        invoice_id, inventory_item_id, warehouse_id,
        quantity, unit_price, total_amount, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        invoiceId,
        item.inventory_item_id,
        item.warehouse_id,
        item.quantity,
        item.unit_price,
        item.total_amount,
        item.notes || null
      ]
    );
    
    insertedItems.push(result.rows[0]);
  }
  
  return insertedItems;
}

/**
 * Get available stock for an item in a warehouse
 */
async function getAvailableStock(warehouseId, itemId) {
  const result = await query(
    `SELECT quantity_on_hand, reserved_quantity, available_quantity
     FROM warehouse_stock
     WHERE warehouse_id = $1 AND item_id = $2`,
    [warehouseId, itemId]
  );
  
  return result.rows[0] || null;
}

/**
 * Update sales invoice
 */
async function updateSalesInvoice(id, data) {
  const allowedFields = [
    'status',
    'notes',
    'pdf_path',
    'is_tax_invoice',
    'tax_invoice_id'
  ];
  
  const keys = Object.keys(data).filter(key => allowedFields.includes(key));
  
  if (keys.length === 0) {
    return getSalesInvoiceById(id);
  }
  
  const setClauses = [];
  const values = [];
  
  keys.forEach((key, index) => {
    setClauses.push(`${key} = $${index + 1}`);
    values.push(data[key]);
  });
  
  const setClause = setClauses.join(', ');
  const allValues = [...values, id];
  
  const sql = `UPDATE sales_invoices SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
               WHERE id = $${keys.length + 1} RETURNING *`;
  
  const result = await query(sql, allValues);
  return result.rows[0] || null;
}

module.exports = {
  getSalesInvoiceById,
  getSalesInvoiceWithItems,
  updateSalesInvoice,
  createInvoiceItems,
  getAvailableStock
};