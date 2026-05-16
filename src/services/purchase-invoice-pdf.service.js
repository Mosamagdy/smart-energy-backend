const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Purchase Invoice PDF Generation Service using PDFKit
// Single A4 page — English only (internal document, no ZATCA)
// ============================================================================

async function generatePurchaseInvoicePDF(invoice) {
  return new Promise(async (resolve, reject) => {
    try {
      const invoicesDir = path.join(__dirname, '../../uploads/invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filename = `purchase-invoice-${invoice.invoice_number}.pdf`;
      const filePath = path.join(invoicesDir, filename);

      const PAGE_WIDTH    = 595;
      const PAGE_HEIGHT   = 842;
      const MARGIN        = 40;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 515

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        info: {
          Title:   `Purchase Invoice ${invoice.invoice_number}`,
          Author:  'Smart Energy ERP',
          Subject: 'Purchase Invoice'
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
      const colW = CONTENT_WIDTH / 2; // 257.5
      const ROW  = 18;

      // ── Helpers ────────────────────────────────────────────────────────────
      function labelRow(en, value, fontSize = 9, bold = false) {
        const fn = bold ? 'Helvetica-Bold' : 'Helvetica';
        const valueFn = (hasArabic(String(value)) && hasArabicFont) ? AR : fn;
        
        // Label (left column)
        doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#34495e')
           .text(en, MARGIN, Y, { width: colW, align: 'left' });
        
        // Value (right column) - with Arabic font support
        doc.font(valueFn).fontSize(fontSize).fillColor('#2c3e50')
           .text(String(value), MARGIN + colW, Y, { width: colW, align: 'right' });
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
      
      // Company Logo (positioned at top)
      const logoPath = path.join(__dirname, '../../public/image/logo.jpeg');
      const logoWidth = 70;
      const logoHeight = 70;
      const logoY = Y;
      
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, MARGIN, Y, { width: logoWidth, height: logoHeight });
      }
      
      // Company Name - PERFECTLY ALIGNED with logo midpoint
      const companyNameX = fs.existsSync(logoPath) ? MARGIN + logoWidth + 10 : MARGIN;
      // Center text vertically with logo: logo midpoint is at Y + (logoHeight / 2)
      const companyNameY = Y + (logoHeight / 2) - 10; // Adjusted for text baseline
      
      // Company Name (English - bold, professional)
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#1a5276')
         .text('Smart Energy Services', companyNameX, companyNameY, { width: colW - 20, align: 'left' });
      
      // Company Tagline (below company name)
      doc.font('Helvetica').fontSize(9).fillColor('#7f8c8d')
         .text('Smart Energy Solutions', companyNameX, companyNameY + 22, { width: colW - 20, align: 'left' });
      
      Y += logoHeight + 10; // Move Y past logo
      
      // Invoice Title - ARABIC ONLY (Professional)
      doc.font(ARB).fontSize(22).fillColor('#1a5276')
         .text(' مشتريات فاتورة', MARGIN, Y, { width: CONTENT_WIDTH, align: 'center' });
      Y += 32;

      divider('#1a5276', 2.5);

      // ══════════════════════════════════════════════════════════════════════
      // INVOICE DETAILS
      // ══════════════════════════════════════════════════════════════════════
      sectionTitle('Invoice Details');

      const invoiceDate = invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-GB') : 'N/A';
      const dueDate     = invoice.due_date     ? new Date(invoice.due_date).toLocaleDateString('en-GB')     : 'N/A';
      const status      = (invoice.status || 'DRAFT').toUpperCase();

      labelRow('Invoice No:', invoice.invoice_number || 'N/A');
      labelRow('Date:', invoiceDate);
      labelRow('Due Date:', dueDate);
      labelRow('Status:', status, 9, true);

      Y += 5;
      divider();

      // ══════════════════════════════════════════════════════════════════════
      // SUPPLIER INFORMATION
      // ══════════════════════════════════════════════════════════════════════
      sectionTitle('Supplier Information');
      
      const supplierName = invoice.supplier_name || 'N/A';
      labelRow('Name:', supplierName);
      
      if (invoice.supplier_email && !hasArabic(invoice.supplier_email)) {
        labelRow('Email:', invoice.supplier_email);
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

        const itemsTableX = MARGIN;
        const itemsTableW = CONTENT_WIDTH;
        const col1W = 30;   // #
        const col2W = Math.floor(itemsTableW * 0.40); // Item Name (Arabic)
        const col3W = 60;   // Quantity
        const col4W = 80;   // Unit Cost
        const col5W = itemsTableW - col1W - col2W - col3W - col4W; // Total

        const col1X = itemsTableX;
        const col2X = col1X + col1W;
        const col3X = col2X + col2W;
        const col4X = col3X + col3W;
        const col5X = col4X + col4W;

        const headerH = 24;
        const rowH = 20;

        // Header row with shaded background
        doc.rect(itemsTableX, Y, itemsTableW, headerH).fillColor('#1a5276').fill();

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
           .text('#', col1X + 3, Y + 7, { width: col1W - 6, align: 'center' });

        doc.font(ARB).fontSize(9).fillColor('#ffffff')
           .text('الصنف', col2X + 3, Y + 7, { width: col2W - 6, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
           .text('Quantity', col3X + 3, Y + 7, { width: col3W - 6, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
           .text('Unit Cost', col4X + 3, Y + 7, { width: col4W - 6, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
           .text('Total', col5X + 3, Y + 7, { width: col5W - 6, align: 'center' });

        Y += headerH;

        // Draw border around header
        doc.rect(itemsTableX, Y - headerH, itemsTableW, headerH)
           .lineWidth(0.5).strokeColor('#1a5276').stroke();

        // Item rows
        invoice.items.forEach((item, idx) => {
          const isEven = idx % 2 === 0;

          // Alternating row background
          if (isEven) {
            doc.rect(itemsTableX, Y, itemsTableW, rowH).fillColor('#f8f9fa').fill();
          }

          // Row border
          doc.rect(itemsTableX, Y, itemsTableW, rowH)
             .lineWidth(0.5).strokeColor('#bdc3c7').stroke();

          const itemTotal = parseFloat(item.total_amount) || (parseFloat(item.quantity) * parseFloat(item.unit_cost));
          const itemName = item.item_name_ar || item.item_name || 'N/A';

          // # column
          doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
             .text(String(idx + 1), col1X + 3, Y + 5, { width: col1W - 6, align: 'center' });

          // Item Name column (Arabic support)
          const itemFont = hasArabicFont && hasArabic(itemName) ? AR : 'Helvetica';
          doc.font(itemFont).fontSize(9).fillColor('#2c3e50')
             .text(itemName, col2X + 3, Y + 5, { width: col2W - 6, align: 'center' });

          // Quantity column
          doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
             .text(parseFloat(item.quantity).toFixed(3), col3X + 3, Y + 5, { width: col3W - 6, align: 'center' });

          // Unit Cost column
          doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
             .text(parseFloat(item.unit_cost).toFixed(2) + ' SAR', col4X + 3, Y + 5, { width: col4W - 6, align: 'center' });

          // Total column
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#1a5276')
             .text(itemTotal.toFixed(2) + ' SAR', col5X + 3, Y + 5, { width: col5W - 6, align: 'center' });

          Y += rowH;

          // Page break check
          if (Y > PAGE_HEIGHT - MARGIN - 100) {
            doc.addPage();
            Y = MARGIN;
          }
        });

        Y += 10;
        divider();
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
      const taxAmount    = parseFloat(invoice.tax_amount   || 0);
      const totalAmount  = parseFloat(invoice.total_amount || 0);
      const taxRate      = parseFloat(invoice.tax_rate     || 15);

      const rows = [
        { label: 'Subtotal',               value: `${subtotal.toFixed(2)} SAR`,    bold: false },
      ];

      // Only show VAT if tax is applied
      const isTaxApplied = invoice.is_tax_applied !== false; // Default to true
      if (isTaxApplied) {
        rows.push({ label: `VAT (${taxRate.toFixed(1)}%)`, value: `${taxAmount.toFixed(2)} SAR`,   bold: false });
      }

      rows.push({ label: 'TOTAL',                  value: `${totalAmount.toFixed(2)} SAR`, bold: true  });

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
      // PAYMENT TERMS & NOTES
      // ══════════════════════════════════════════════════════════════════════
      if (invoice.payment_terms) {
        divider();

        if (!hasArabic(invoice.payment_terms)) {
          sectionTitle('Payment Terms');
          doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
             .text(invoice.payment_terms, MARGIN, Y, { width: CONTENT_WIDTH });
          Y += 18;
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // FOOTER (NO QR CODE)
      // ══════════════════════════════════════════════════════════════════════
      const FOOTER_Y = PAGE_HEIGHT - MARGIN - 60;

      doc.moveTo(MARGIN, FOOTER_Y - 10)
         .lineTo(PAGE_WIDTH - MARGIN, FOOTER_Y - 10)
         .strokeColor('#bdc3c7').lineWidth(0.5).stroke();

      doc.font('Helvetica').fontSize(8).fillColor('#95a5a6')
         .text('This is a computer-generated purchase invoice. No signature required.',
               MARGIN, FOOTER_Y, { width: CONTENT_WIDTH, align: 'left' });

      doc.font('Helvetica').fontSize(7).fillColor('#95a5a6')
         .text(`Generated: ${new Date().toLocaleString('en-GB')}`,
               MARGIN, FOOTER_Y + 14, { width: CONTENT_WIDTH, align: 'left' });

      // Note: No QR code for purchase invoices
      doc.font('Helvetica').fontSize(7).fillColor('#95a5a6')
         .text('Internal document — not submitted to ZATCA',
               MARGIN, FOOTER_Y + 28, { width: CONTENT_WIDTH, align: 'left' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error',  (err) => reject(err));

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePurchaseInvoicePDF };
