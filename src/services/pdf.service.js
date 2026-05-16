const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { generateInvoiceHTML } = require('../templates/InvoiceTemplate');

// ============================================================================
// PDF Generation Service - Puppeteer with HTML Templates
// ============================================================================

/**
 * Get invoice data with all details
 */
async function getInvoiceData(invoiceId) {
  // Get invoice with PR and project details
  const invoiceResult = await pool.query(
    `SELECT 
      i.*,
      pr.id as pr_id,
      pr.status as pr_status,
      p.name as project_name,
      p.description as project_description,
      u.first_name || ' ' || u.last_name as created_by_name,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone
     FROM invoices i
     LEFT JOIN purchase_requests pr ON pr.id = i.purchase_request_id
     LEFT JOIN projects p ON p.id = i.project_id
     LEFT JOIN clients c ON c.id = p.client_id
     LEFT JOIN users u ON u.id = i.created_by
     WHERE i.id = $1`,
    [invoiceId]
  );
  
  if (invoiceResult.rows.length === 0) {
    return null;
  }
  
  const invoice = invoiceResult.rows[0];
  
  // Get PR items if available
  let items = [];
  if (invoice.pr_id) {
    const itemsResult = await pool.query(
      `SELECT 
        item_name as name,
        quantity_approved as quantity,
        unit_price,
        total_price
       FROM purchase_request_items
       WHERE purchase_request_id = $1
       ORDER BY id`,
      [invoice.pr_id]
    );
    items = itemsResult.rows;
  }
  
 const metadata = typeof invoice.metadata === 'string' 
    ? JSON.parse(invoice.metadata) 
    : (invoice.metadata || {});

  // تحويل كل القيم لأرقام لضمان الحسابات
  const subtotal = parseFloat(invoice.total_amount || 0);
  const tax = parseFloat(metadata.tax || 0);
  const discount = parseFloat(metadata.discount || 0);
  const finalTotal = subtotal + tax - discount;

  return {
    ...invoice,
    items,
    metadata,
    subtotal: subtotal.toFixed(2), // نبعتها جاهزة للـ PDF بصيغة رقمين عشريين
    tax: tax.toFixed(2),
    discount: discount.toFixed(2),
    final_total: finalTotal.toFixed(2)
  };
}


/**
 * Generate professional bilingual PDF using Puppeteer
 */
async function generateInvoicePDF(invoiceId, saveToFile = true) {
  const invoiceData = await getInvoiceData(invoiceId);
  
  if (!invoiceData) {
    throw new Error('Invoice not found');
  }
  
  let browser = null;
  
  try {
    // Launch Puppeteer in headless mode
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    // Create new page
    const page = await browser.newPage();
    
    // Generate HTML from template
    const htmlContent = generateInvoiceHTML(invoiceData);
    
    // Set HTML content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Add styles explicitly
    await page.addStyleTag({
      content: `
        @page {
          size: A4;
          margin: 0;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `
    });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      },
      preferCSSPageSize: true,
      displayHeaderFooter: false
    });
    
    // Save to file if requested
    let filePath = null;
    let filename = null;
    
    if (saveToFile) {
      const invoicesDir = path.join(__dirname, '../../uploads/invoicess');
      
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }
      
      filename = `invoice_${invoiceId}.pdf`;
      filePath = path.join(invoicesDir, filename);
      
      fs.writeFileSync(filePath, pdfBuffer);
    }
    
    // Close browser
    await browser.close();
    
    return {
      buffer: pdfBuffer,
      filePath,
      filename
    };
    
  } catch (error) {
    console.error('Puppeteer PDF generation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    // Ensure browser is closed
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Generate and send PDF as buffer (for email attachments)
 */
async function generateInvoicePDFBuffer(invoiceId) {
  return await generateInvoicePDF(invoiceId, false);
}

module.exports = {
  generateInvoicePDF,
  generateInvoicePDFBuffer,
  getInvoiceData
};