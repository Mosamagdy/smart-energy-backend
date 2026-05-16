const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// ============================================================================
// Professional Invoice PDF Generation Service using PDFKit
// Single A4 page — ZATCA-compliant
// ============================================================================

function fixArabic(text) {
  if (!text) return '';
  try {
    return text.split(' ').reverse().join(' ');
  } catch (e) {
    return text;
  }
}

async function generateInvoicePDF(invoice, options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const invoicesDir = path.join(__dirname, '../../uploads/invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Use custom filename if provided (for tax invoices)
      const filename = options.filename || `invoice-${invoice.invoice_number}.pdf`;
      const filePath = path.join(invoicesDir, filename);
      
      // Return relative path for database storage
      const relativePath = `uploads/invoices/${filename}`;

      const PAGE_WIDTH    = 595;
      const PAGE_HEIGHT   = 842;
      const MARGIN        = 40;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 515

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        info: {
          Title:   `Invoice ${invoice.invoice_number}`,
          Author:  'Smart Energy ERP',
          Subject: 'Tax Invoice'
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
      function labelRow(en, ar, fontSize = 9) {
        doc.font('Helvetica').fontSize(fontSize).fillColor('#2c3e50')
           .text(en, MARGIN, Y, { width: colW, align: 'left' });
        doc.font(AR).fontSize(fontSize).fillColor('#2c3e50')
           .text(fixArabic(ar), MARGIN + colW, Y, { width: colW, align: 'right' });
        Y += ROW;
      }

      function sectionTitle(en, ar, fontSize = 11) {
        doc.font('Helvetica-Bold').fontSize(fontSize).fillColor('#1a5276')
           .text(en, MARGIN, Y, { width: colW, align: 'left' });
        doc.font(ARB).fontSize(fontSize).fillColor('#1a5276')
           .text(fixArabic(ar), MARGIN + colW, Y, { width: colW, align: 'right' });
        Y += ROW;
      }

      function divider(color = '#bdc3c7', weight = 0.5) {
        doc.moveTo(MARGIN, Y).lineTo(PAGE_WIDTH - MARGIN, Y)
           .strokeColor(color).lineWidth(weight).stroke();
        Y += 10;
      }

      // ══════════════════════════════════════════════════════════════════════
      // HEADER - Premium Corporate Design
      // ══════════════════════════════════════════════════════════════════════
      
      // Company Logo - Higher position, top-left corner
      const logoPath = path.join(__dirname, '../../public/image/logo.jpeg');
      const logoY = Y + 5; // Move higher
      const logoWidth = 60;
      const logoHeight = 60;
      
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, MARGIN, logoY, { width: logoWidth, height: logoHeight });
      }
      
      // Company name - Centered vertically with logo
      const companyNameY = logoY + (logoHeight / 2) - 8; // Center alignment
      const companyNameX = fs.existsSync(logoPath) ? MARGIN + logoWidth + 15 : MARGIN;
      
      doc.font('Helvetica-Bold').fontSize(18).fillColor('#1a5276')
         .text('Smart Energy Services', companyNameX, companyNameY, { 
           width: CONTENT_WIDTH - logoWidth - 30, 
           align: 'left',
           lineGap: 2
         });
      
      // Arabic company name - Right aligned
      doc.font(ARB).fontSize(16).fillColor('#1a5276')
         .text(fixArabic('خدمات الطاقة الذكية'), MARGIN + colW + 20, companyNameY + 2, { 
           width: colW - 30, 
           align: 'right' 
         });
      
      Y += logoHeight + 20;

      // Title - ONLY Arabic "فاتورة ضريبية" centered
      doc.font(ARB).fontSize(20).fillColor('#1a5276')
         .text(fixArabic('فاتورة ضريبية'), MARGIN, Y, { 
           width: CONTENT_WIDTH, 
           align: 'center' 
         });
      Y += 28;

      // Remove VAT Registration Number text (it's in QR code)
      // divider removed - will add cleaner one later

      Y += 5;
      divider('#1a5276', 2);

      // ══════════════════════════════════════════════════════════════════════
      // INVOICE DETAILS - Clean & Professional
      // ══════════════════════════════════════════════════════════════════════
      sectionTitle('Invoice Details', 'تفاصيل الفاتورة');

      const issueDate = invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-GB') : 'N/A';
      const dueDate   = invoice.due_date   ? new Date(invoice.due_date).toLocaleDateString('en-GB')   : 'N/A';

      // Show tax invoice number FIRST (if exists)
      if (invoice.is_tax_invoice && invoice.tax_invoice_no) {
        labelRow(`Tax Invoice No: ${invoice.tax_invoice_no}`, `رقم الفاتورة الضريبية: ${invoice.tax_invoice_no}`, 10);
      }
      
      labelRow(`Number: ${invoice.invoice_number}`, `الرقم: ${invoice.invoice_number}`, 9);
      labelRow(`Issue Date: ${issueDate}`, `تاريخ الإصدار: ${issueDate}`, 9);
      labelRow(`Due Date: ${dueDate}`, `تاريخ الاستحقاق: ${dueDate}`, 9);
      labelRow(`Status: ${(invoice.status || '').toUpperCase()}`, `الحالة: ${getStatusArabic(invoice.status)}`, 9);

      Y += 5;
      divider();

      // ══════════════════════════════════════════════════════════════════════
      // CLIENT INFORMATION
      // ══════════════════════════════════════════════════════════════════════
      sectionTitle('Client Information', 'معلومات العميل');
      labelRow(`Name: ${invoice.client_name || 'N/A'}`, `العميل: ${invoice.client_name || 'غير محدد'}`);
      if (invoice.client_email) {
        labelRow(`Email: ${invoice.client_email}`, `البريد: ${invoice.client_email}`);
      }

      Y += 5;
      divider();

      // ══════════════════════════════════════════════════════════════════════
      // FINANCIAL SUMMARY - Sales Invoice Style
      // ══════════════════════════════════════════════════════════════════════
      sectionTitle('Financial Summary', 'الملخص المالي', 12);
      Y += 3;

      // Table dimensions - matching Sales Invoice style
      const TABLE_X      = MARGIN;                    // 40
      const TABLE_W      = CONTENT_WIDTH;             // 515
      const COL_EN_W     = Math.floor(TABLE_W * 0.35); // 180
      const COL_AR_W     = Math.floor(TABLE_W * 0.35); // 180
      const COL_VAL_W    = TABLE_W - COL_EN_W - COL_AR_W; // 155
      const COL_EN_X     = TABLE_X;                        // 40
      const COL_AR_X     = TABLE_X + COL_EN_W;             // 220
      const COL_VAL_X    = TABLE_X + COL_EN_W + COL_AR_W;  // 400
      const TABLE_ROW_H  = 24;
      const HEADER_ROW_H = 28;

      const subtotal     = parseFloat(invoice.subtotal     || 0);
      const taxAmount    = parseFloat(invoice.tax_amount   || 0);
      const totalAmount  = parseFloat(invoice.total_amount || 0);
      const taxRate      = parseFloat(invoice.tax_rate     || 15);

      // Table Header - Blue gradient style
      doc.rect(TABLE_X, Y, TABLE_W, HEADER_ROW_H).fillColor('#1a5276').fill();
      
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
         .text('Description', COL_EN_X + 5, Y + 7, { width: COL_EN_W - 10, align: 'left' });
      doc.font(ARB).fontSize(10).fillColor('#ffffff')
         .text(fixArabic('البيان'), COL_AR_X, Y + 7, { width: COL_AR_W - 5, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
         .text('Amount', COL_VAL_X, Y + 7, { width: COL_VAL_W - 5, align: 'right' });
      
      Y += HEADER_ROW_H;

      // Table rows
      const rows = [
        { en: 'Subtotal',          ar: 'المجموع الفرعي',        value: `${subtotal.toFixed(2)} SAR`,    bold: false },
        { en: `VAT (${taxRate}%)`, ar: `ضريبة القيمة المضافة (${taxRate}%)`, value: `${taxAmount.toFixed(2)} SAR`, bold: false },
      ];

      rows.forEach((row, index) => {
        // Alternating row backgrounds
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
        doc.rect(TABLE_X, Y, TABLE_W, TABLE_ROW_H).fillColor(bgColor).fill();

        // Border
        doc.rect(TABLE_X, Y, TABLE_W, TABLE_ROW_H)
           .lineWidth(0.5).strokeColor('#dee2e6').stroke();

        const fn  = 'Helvetica';
        const fnA = AR;
        const fs_ = 10;

        // EN label
        doc.font(fn).fontSize(fs_).fillColor('#2c3e50')
           .text(row.en, COL_EN_X + 5, Y + 6, { width: COL_EN_W - 10, align: 'left' });

        // AR label
        doc.font(fnA).fontSize(fs_).fillColor('#2c3e50')
           .text(fixArabic(row.ar), COL_AR_X, Y + 6, { width: COL_AR_W - 5, align: 'right' });

        // Value
        doc.font(fn).fontSize(fs_).fillColor('#2c3e50')
           .text(row.value, COL_VAL_X, Y + 6, { width: COL_VAL_W - 5, align: 'right' });

        Y += TABLE_ROW_H;
      });

      // TOTAL row - Highlighted
      doc.rect(TABLE_X, Y, TABLE_W, TABLE_ROW_H).fillColor('#dce9f5').fill();
      doc.rect(TABLE_X, Y, TABLE_W, TABLE_ROW_H)
         .lineWidth(1.5).strokeColor('#1a5276').stroke();

      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a5276')
         .text('TOTAL', COL_EN_X + 5, Y + 6, { width: COL_EN_W - 10, align: 'left' });
      doc.font(ARB).fontSize(11).fillColor('#1a5276')
         .text(fixArabic('الإجمالي'), COL_AR_X, Y + 6, { width: COL_AR_W - 5, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a5276')
         .text(`${totalAmount.toFixed(2)} SAR`, COL_VAL_X, Y + 5, { width: COL_VAL_W - 5, align: 'right' });

      Y += TABLE_ROW_H;

      Y += 10;

      // ══════════════════════════════════════════════════════════════════════
      // PAYMENT TERMS & NOTES
      // ══════════════════════════════════════════════════════════════════════
      if (invoice.payment_terms || invoice.notes) {
        divider();

        if (invoice.payment_terms) {
          sectionTitle('Payment Terms', 'شروط الدفع');
          doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
             .text(invoice.payment_terms, MARGIN, Y, { width: CONTENT_WIDTH });
          Y += 18;
        }

      }

      // ══════════════════════════════════════════════════════════════════════
      // FOOTER + QR CODE - Premium Alignment
      // ══════════════════════════════════════════════════════════════════════
      const FOOTER_Y = PAGE_HEIGHT - MARGIN - 100;

      // Divider above footer - thicker
      doc.moveTo(MARGIN, FOOTER_Y - 10)
         .lineTo(PAGE_WIDTH - MARGIN, FOOTER_Y - 10)
         .strokeColor('#1a5276').lineWidth(1).stroke();

      // Footer text - Left side
      doc.font('Helvetica').fontSize(8).fillColor('#95a5a6')
         .text('This is a computer-generated tax invoice. No signature required.',
               MARGIN, FOOTER_Y, { width: CONTENT_WIDTH - 110, align: 'left' });

      doc.font('Helvetica').fontSize(7).fillColor('#95a5a6')
         .text(`Generated: ${new Date().toLocaleString('en-GB')}`,
               MARGIN, FOOTER_Y + 14, { width: CONTENT_WIDTH - 110, align: 'left' });

      // Remove VAT Reg number from footer (it's in QR code)

      // QR Code - Bottom right, properly aligned
      if (invoice.qr_code_data) {
        try {
          const qrBase64 = await QRCode.toDataURL(invoice.qr_code_data, {
            width: 100,
            margin: 1,
            errorCorrectionLevel: 'M'
          });

          const qrBuffer = Buffer.from(qrBase64.split(',')[1], 'base64');
          const qrSize = 90;
          const qrX = PAGE_WIDTH - MARGIN - qrSize;
          const qrY = FOOTER_Y - 5;

          doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

          // QR label below
          doc.font(ARB).fontSize(7).fillColor('#7f8c8d')
             .text(fixArabic('رمز هيئة الزكاة'), qrX, qrY + qrSize + 2, { width: qrSize, align: 'center' });

        } catch (qrErr) {
          console.warn('QR embed failed:', qrErr.message);
        }
      }

      doc.end();

      stream.on('finish', () => resolve(relativePath));
      stream.on('error',  (err) => reject(err));

    } catch (err) {
      reject(err);
    }
  });
}

function getStatusArabic(status) {
  const map = {
    draft:     'مسودة',
    pending:   'معلقة',
    partial:   'مدفوعة جزئياً',
    paid:      'مدفوعة',
    overdue:   'متأخرة',
    cancelled: 'ملغاة'
  };
  return map[status] || status;
}

module.exports = { generateInvoicePDF };