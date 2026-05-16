const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const ZATCAQRGenerator = require('./zatca-qr.service');
const QRCode = require('qrcode');

// ============================================================================
// Sales Invoice PDF Generation Service using PDFKit
// Single A4 page — Professional layout with Arabic support
// ============================================================================

/**
 * Generate Sales Invoice PDF
 * @param {Object} invoice - Sales invoice data with client and project info
 * @returns {Promise<string>} - File path of generated PDF
 */
async function generateSalesInvoicePDF(invoice) {
  return new Promise(async (resolve, reject) => {
    try {
      const invoicesDir = path.join(__dirname, '../../uploads/invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Naming convention: sales_SI-2026-0001.pdf
      const filename = `sales_${invoice.invoice_number}.pdf`;
      const filePath = path.join(invoicesDir, filename);

      const PAGE_WIDTH    = 595;
      const PAGE_HEIGHT   = 842;
      const MARGIN        = 40;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        info: {
          Title:   `Sales Invoice ${invoice.invoice_number}`,
          Author:  'Smart Energy ERP',
          Subject: 'Sales Invoice'
        }
      });

      // ── Fonts ──────────────────────────────────────────────────────────────
      const arabicFontPath     = path.join(__dirname, '../../fonts/Amiri-Regular.ttf');
      const arabicFontBoldPath = path.join(__dirname, '../../fonts/Amiri-Bold.ttf');
      const hasArabicFont      = fs.existsSync(arabicFontPath);

      if (hasArabicFont) {
        doc.registerFont('Arabic-Regular', arabicFontPath);
        doc.registerFont('Arabic-Bold',    arabicFontBoldPath);
      }

      const AR  = hasArabicFont ? 'Arabic-Regular' : 'Helvetica';
      const ARB = hasArabicFont ? 'Arabic-Bold'    : 'Helvetica-Bold';

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      let Y    = MARGIN;
      const colW = CONTENT_WIDTH / 2;
      const ROW  = 18;

      // Generate ZATCA QR Code (TLV Base64 format)
      let qrCodeBuffer = null;
      try {
        const qrCodeData = ZATCAQRGenerator.generate({
          seller_name: 'Smart Energy Services',
          vat_registration_number: process.env.VAT_REGISTRATION_NUMBER || '300075588800003',
          timestamp: invoice.issue_date ? new Date(invoice.issue_date).toISOString() : new Date().toISOString(),
          invoice_total: parseFloat(invoice.total_amount || 0),
          vat_total: parseFloat(invoice.vat_amount || 0)
        });
        
        console.log(`[PDF Service] ZATCA QR Code generated: ${qrCodeData.substring(0, 50)}...`);
        
        // Convert Base64 TLV to QR image
        qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
          type: 'png',
          width: 120,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
      } catch (qrError) {
        console.error('[PDF Service] QR Code generation failed:', qrError.message);
      }

      // ── Helpers ────────────────────────────────────────────────────────────
      function labelRow(en, value, fontSize = 9, bold = false) {
        const fn = bold ? 'Helvetica-Bold' : 'Helvetica';
        const valueStr = String(value);
        const valueFn = (hasArabic(valueStr) && hasArabicFont) ? AR : fn;
        
        // Label (left column)
        doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#34495e')
           .text(en, MARGIN, Y, { width: colW, align: 'left' });
        
        // Value (right column) - with Arabic font support
        doc.font(valueFn).fontSize(fontSize).fillColor('#2c3e50')
           .text(valueStr, MARGIN + colW, Y, { width: colW, align: 'right' });
        Y += ROW;
      }

      function sectionTitle(en) {
        // Section background
        doc.rect(MARGIN - 5, Y - 3, CONTENT_WIDTH + 10, ROW + 6)
           .fillColor('#ecf0f1').fill();
        
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a5276')
           .text(en, MARGIN, Y, { width: CONTENT_WIDTH, align: 'left' });
        Y += ROW + 8;
      }

      function divider(color = '#bdc3c7', weight = 0.5) {
        doc.moveTo(MARGIN, Y).lineTo(PAGE_WIDTH - MARGIN, Y)
           .strokeColor(color).lineWidth(weight).stroke();
        Y += 10;
      }

      function hasArabic(text) {
        return /[\u0600-\u06FF]/.test(text || '');
      }

      // ══════════════════════════════════════════════════════════════════════
      // HEADER - Professional Corporate Layout
      // ══════════════════════════════════════════════════════════════════════
      
      // Company Logo
      const logoPath = path.join(__dirname, '../../public/image/logo.jpeg');
      const logoWidth = 70;
      const logoHeight = 70;
      const logoY = Y;
      
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, MARGIN, Y, { width: logoWidth, height: logoHeight });
      }
      
      // Company Name - PERFECTLY ALIGNED with logo midpoint
      const companyNameX = fs.existsSync(logoPath) ? MARGIN + logoWidth + 10 : MARGIN;
      const companyNameY = Y + (logoHeight / 2) - 10;
      
      // Company Name (English - bold, professional)
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#1a5276')
         .text('Smart Energy Services', companyNameX, companyNameY, { width: colW - 20, align: 'left' });
      
      // Company Tagline
      doc.font('Helvetica').fontSize(9).fillColor('#7f8c8d')
         .text('Smart Energy Solutions', companyNameX, companyNameY + 22, { width: colW - 20, align: 'left' });
      
      Y += logoHeight + 10;
      
      // Invoice Title - ARABIC (Professional)
      doc.font(ARB).fontSize(22).fillColor('#1a5276')
         .text('مبيعات فاتورة', MARGIN, Y, { width: CONTENT_WIDTH, align: 'center' });
      Y += 32;

      divider('#1a5276', 2.5);

      // ══════════════════════════════════════════════════════════════════════
      // INVOICE DETAILS
      // ══════════════════════════════════════════════════════════════════════
      sectionTitle('Invoice Details');

      const invoiceDate = invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-GB') : 'N/A';
      const dueDate     = invoice.due_date     ? new Date(invoice.due_date).toLocaleDateString('en-GB')     : 'N/A';
      const status      = (invoice.status || 'DRAFT').toUpperCase();

      labelRow('Invoice No:', invoice.invoice_number || 'N/A');
      labelRow('Issue Date:', invoiceDate);
      labelRow('Due Date:', dueDate);
      labelRow('Status:', status, 9, true);

      Y += 5;
      divider();

      // ══════════════════════════════════════════════════════════════════════
      // CLIENT INFORMATION
      // ══════════════════════════════════════════════════════════════════════
      sectionTitle('Client Information');
      
      const clientName = invoice.client_name || 'N/A';
      labelRow('Name:', clientName);
      
      if (invoice.contact_email && !hasArabic(invoice.contact_email)) {
        labelRow('Email:', invoice.contact_email);
      }

      if (invoice.contact_phone) {
        labelRow('Phone:', invoice.contact_phone);
      }

      if (invoice.project_name) {
        // Ensure project name is properly encoded for PDF
        const projectName = String(invoice.project_name).replace(/[^\x00-\x7F\u0600-\u06FF]/g, '');
        labelRow('Project:', projectName);
      }

      Y += 5;
      divider();

      // ══════════════════════════════════════════════════════════════════════
      // INVOICE ITEMS TABLE
      // ══════════════════════════════════════════════════════════════════════
      if (invoice.items && invoice.items.length > 0) {
        sectionTitle('Invoice Items');

        const ITEMS_TABLE_X = MARGIN;
        const ITEMS_TABLE_W = CONTENT_WIDTH;
        const COL1_W = 25;   // # (reduced)
        const COL2_W = Math.floor(ITEMS_TABLE_W * 0.32);  // Item Name (reduced from 0.35)
        const COL3_W = 50;   // Quantity (reduced from 15%)
        const COL4_W = 65;   // Unit Price (reduced from 20%)
        const COL5_W = 60;   // VAT (reduced from 20%)
        const COL6_W = ITEMS_TABLE_W - COL1_W - COL2_W - COL3_W - COL4_W - COL5_W;  // Total (remaining space)
        
        const COL1_X = ITEMS_TABLE_X;
        const COL2_X = COL1_X + COL1_W;
        const COL3_X = COL2_X + COL2_W;
        const COL4_X = COL3_X + COL3_W;
        const COL5_X = COL4_X + COL4_W;
        const COL6_X = COL5_X + COL5_W;
        const HEADER_H = 22;
        const ROW_H = 18;  // Reduced from 20 to save space

        // Header row
        doc.rect(ITEMS_TABLE_X, Y, ITEMS_TABLE_W, HEADER_H).fillColor('#1a5276').fill();
        
        const headerStyle = { font: 'Helvetica-Bold', fontSize: 7, fillColor: '#ffffff', align: 'center' };  // Reduced from 8 to 7
        doc.font(headerStyle.font).fontSize(headerStyle.fontSize).fillColor(headerStyle.fillColor)
           .text('#', COL1_X + 2, Y + 6, { width: COL1_W - 4, align: 'center' });
        doc.font(headerStyle.font).fontSize(headerStyle.fontSize).fillColor(headerStyle.fillColor)
           .text('Item', COL2_X + 2, Y + 6, { width: COL2_W - 4, align: 'left' });
        doc.font(headerStyle.font).fontSize(headerStyle.fontSize).fillColor(headerStyle.fillColor)
           .text('Qty', COL3_X + 2, Y + 6, { width: COL3_W - 4, align: 'center' });
        doc.font(headerStyle.font).fontSize(headerStyle.fontSize).fillColor(headerStyle.fillColor)
           .text('Unit Price', COL4_X + 2, Y + 6, { width: COL4_W - 4, align: 'right' });
        doc.font(headerStyle.font).fontSize(headerStyle.fontSize).fillColor(headerStyle.fillColor)
           .text('VAT', COL5_X + 2, Y + 6, { width: COL5_W - 4, align: 'center' });
        doc.font(headerStyle.font).fontSize(headerStyle.fontSize).fillColor(headerStyle.fillColor)
           .text('Total', COL6_X + 2, Y + 6, { width: COL6_W - 4, align: 'right' });
        
        Y += HEADER_H;

        // Item rows
        invoice.items.forEach((item, index) => {
          const isEven = index % 2 === 0;
          if (isEven) {
            doc.rect(ITEMS_TABLE_X, Y, ITEMS_TABLE_W, ROW_H).fillColor('#f8f9fa').fill();
          }

          doc.rect(ITEMS_TABLE_X, Y, ITEMS_TABLE_W, ROW_H)
             .lineWidth(0.3).strokeColor('#bdc3c7').stroke();

          const itemName = item.item_name_ar || item.item_name || 'N/A';
          const itemFn = (hasArabic(itemName) && hasArabicFont) ? AR : 'Helvetica';
          const quantity = parseFloat(item.quantity || 0);
          const unitPrice = parseFloat(item.unit_price || 0);
          const vatAmount = parseFloat(item.vat_amount || 0);
          const totalAmount = parseFloat(item.total_amount || 0);

          doc.font('Helvetica').fontSize(7).fillColor('#2c3e50')  // Reduced from 8 to 7
             .text(String(index + 1), COL1_X + 2, Y + 4, { width: COL1_W - 4, align: 'center' });
          
          doc.font(itemFn).fontSize(7).fillColor('#2c3e50')  // Reduced from 8 to 7
             .text(itemName, COL2_X + 2, Y + 4, { width: COL2_W - 4, align: 'left' });
          
          doc.font('Helvetica').fontSize(7).fillColor('#2c3e50')  // Reduced from 8 to 7
             .text(quantity.toFixed(2), COL3_X + 2, Y + 4, { width: COL3_W - 4, align: 'center' });
          
          doc.font('Helvetica').fontSize(7).fillColor('#2c3e50')  // Reduced from 8 to 7
             .text(`${unitPrice.toFixed(2)}`, COL4_X + 2, Y + 4, { width: COL4_W - 4, align: 'right' });
          
          doc.font('Helvetica').fontSize(7).fillColor('#2c3e50')  // Reduced from 8 to 7
             .text(`${vatAmount.toFixed(2)}`, COL5_X + 2, Y + 4, { width: COL5_W - 4, align: 'center' });
          
          doc.font('Helvetica-Bold').fontSize(7).fillColor('#1a5276')  // Reduced from 8 to 7
             .text(`${totalAmount.toFixed(2)}`, COL6_X + 2, Y + 4, { width: COL6_W - 4, align: 'right' });

          Y += ROW_H;
        });

        Y += 5;
      }

      // ══════════════════════════════════════════════════════════════════════
      // FINANCIAL SUMMARY
      // ══════════════════════════════════════════════════════════════════════
      sectionTitle('Financial Summary');

      const TABLE_X      = MARGIN;
      const TABLE_W      = CONTENT_WIDTH;
      const COL_LABEL_W  = Math.floor(TABLE_W * 0.6);
      const COL_VALUE_W  = TABLE_W - COL_LABEL_W;
      const COL_LABEL_X  = TABLE_X;
      const COL_VALUE_X  = TABLE_X + COL_LABEL_W;
      const TABLE_ROW_H  = 22;

      const subtotal     = parseFloat(invoice.subtotal     || 0);
      const vatAmount    = parseFloat(invoice.vat_amount   || 0);
      const totalAmount  = parseFloat(invoice.total_amount || 0);
      const vatRate      = parseFloat(invoice.vat_rate     || 15);

      const rows = [
        { label: 'Subtotal',               value: `${subtotal.toFixed(2)} SAR`,    bold: false },
        { label: `VAT (${vatRate.toFixed(1)}%)`, value: `${vatAmount.toFixed(2)} SAR`,   bold: false },
        { label: 'TOTAL',                  value: `${totalAmount.toFixed(2)} SAR`, bold: true  }
      ];

      rows.forEach((row) => {
        if (row.bold) {
          doc.rect(TABLE_X, Y, TABLE_W, TABLE_ROW_H).fillColor('#dce9f5').fill();
        }

        doc.rect(TABLE_X, Y, TABLE_W, TABLE_ROW_H)
           .lineWidth(0.5).strokeColor('#bdc3c7').stroke();

        const fn  = row.bold ? 'Helvetica-Bold' : 'Helvetica';
        const fs_ = row.bold ? 10 : 9;
        const valueColor = row.bold ? '#1a5276' : '#2c3e50';

        doc.font(fn).fontSize(fs_).fillColor('#2c3e50')
           .text(row.label, COL_LABEL_X + 5, Y + 5, { width: COL_LABEL_W - 10, align: 'left' });

        doc.font(fn).fontSize(fs_).fillColor(valueColor)
           .text(row.value, COL_VALUE_X + 5, Y + 5, { width: COL_VALUE_W - 10, align: 'right' });

        Y += TABLE_ROW_H;
      });

      Y += 10;

      // ══════════════════════════════════════════════════════════════════════
      // NOTES
      // ══════════════════════════════════════════════════════════════════════
      if (invoice.notes || invoice.description) {
        divider();
        sectionTitle('Notes');
        
        const notes = invoice.notes || invoice.description || '';
        const notesFn = (hasArabic(notes) && hasArabicFont) ? AR : 'Helvetica';
        
        doc.font(notesFn).fontSize(9).fillColor('#2c3e50')
           .text(notes, MARGIN, Y, { width: CONTENT_WIDTH });
        Y += 18;
      }

      // ══════════════════════════════════════════════════════════════════════
      // FOOTER
      // ══════════════════════════════════════════════════════════════════════
      const FOOTER_Y = PAGE_HEIGHT - MARGIN - 60;

      // Add ZATCA QR Code (bottom-left corner)
      if (qrCodeBuffer) {
        const qrSize = 100;
        const qrX = MARGIN;
        const qrY = FOOTER_Y - qrSize - 20;
        
        doc.image(qrCodeBuffer, qrX, qrY, { width: qrSize, height: qrSize });
        
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#1a5276')
           .text('ZATCA QR Code', qrX, qrY + qrSize + 3, { width: qrSize, align: 'center' });
      }

      doc.moveTo(MARGIN, FOOTER_Y - 10)
         .lineTo(PAGE_WIDTH - MARGIN, FOOTER_Y - 10)
         .strokeColor('#bdc3c7').lineWidth(0.5).stroke();

      doc.font('Helvetica').fontSize(8).fillColor('#95a5a6')
         .text('This is a computer-generated sales invoice from Smart Energy ERP.',
               MARGIN, FOOTER_Y, { width: CONTENT_WIDTH, align: 'left' });

      doc.font('Helvetica').fontSize(7).fillColor('#95a5a6')
         .text(`Generated: ${new Date().toLocaleString('en-GB')}`,
               MARGIN, FOOTER_Y + 14, { width: CONTENT_WIDTH, align: 'left' });

      doc.font('Helvetica').fontSize(7).fillColor('#95a5a6')
         .text('Official financial document — retains in your records',
               MARGIN, FOOTER_Y + 28, { width: CONTENT_WIDTH, align: 'left' });

      doc.end();

      stream.on('finish', () => {
        // Return relative path for storage in database
        const relativePath = `/uploads/invoices/${filename}`;
        resolve({ filePath, relativePath });
      });
      stream.on('error',  (err) => reject(err));

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateSalesInvoicePDF };
