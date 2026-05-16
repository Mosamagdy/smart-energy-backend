const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// ============================================================================
// Professional Credit Note PDF - Original Clean Layout
// Smart Energy Corporate Design - One Page Document
// ============================================================================

function fixArabic(text) {
  if (!text) return '';
  try {
    return text.split(' ').reverse().join(' ');
  } catch (e) {
    return text;
  }
}

async function generateCreditNotePDF(creditNote) {
  return new Promise(async (resolve, reject) => {
    try {
      const invoicesDir = path.join(__dirname, '../../uploads/invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filename = `credit-note-${creditNote.credit_note_number}.pdf`;
      const filePath = path.join(invoicesDir, filename);
      const relativePath = `uploads/invoices/${filename}`;

      const PAGE_WIDTH    = 595;
      const PAGE_HEIGHT   = 842;
      const MARGIN        = 40;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        info: {
          Title:   `Credit Note ${creditNote.credit_note_number}`,
          Author:  'Smart Energy ERP',
          Subject: 'Sales Return - Credit Note'
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
      // HEADER
      // ══════════════════════════════════════════════════════════════════════
      const logoPath = path.join(__dirname, '../../public/image/logo.jpeg');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, MARGIN, Y, { width: 50, height: 50 });
      }
      doc.font(ARB).fontSize(18).fillColor('#1a5276')
         .text(fixArabic('خدمات الطاقة الذكية'), MARGIN + 65, Y + 12, { width: CONTENT_WIDTH - 80, align: 'right' });
      Y += 65;

      doc.rect(MARGIN, Y, CONTENT_WIDTH, 2).fillColor('#1a5276').fill();
      Y += 12;
      sectionTitle('CREDIT NOTE', 'إشعار دائن', 14);
      Y += 8;
      divider();

      // ══════════════════════════════════════════════════════════════════════
      // DETAILS
      // ══════════════════════════════════════════════════════════════════════
      labelRow('Credit Note #', creditNote.credit_note_number || 'N/A');
      
      const returnDate = creditNote.return_date 
        ? new Date(creditNote.return_date).toLocaleDateString('en-GB') 
        : 'N/A';
      labelRow('Return Date', returnDate);
      
      labelRow('Original Invoice', creditNote.original_invoice_number || 'N/A');
      labelRow('Status', getStatusArabic(creditNote.status));
      divider();

      // ══════════════════════════════════════════════════════════════════════
      // CLIENT INFORMATION (Arabic Only)
      // ══════════════════════════════════════════════════════════════════════
      sectionTitle('CLIENT INFORMATION', 'بيانات العميل');
      
      // Display ONLY Arabic client name (no English to avoid gibberish)
      const clientArabic = creditNote.client_name_ar || 'العميل';
      labelRow('', clientArabic);
      
      if (creditNote.project_name) {
        labelRow('', `المشروع: ${creditNote.project_name}`);
      }
      divider();

      // ══════════════════════════════════════════════════════════════════════
      // REASON
      // ══════════════════════════════════════════════════════════════════════
      sectionTitle('RETURN REASON', 'سبب المرتجع');
      if (creditNote.reason) {
        doc.font(AR).fontSize(9).fillColor('#2c3e50')
           .text(fixArabic(creditNote.reason), MARGIN + colW, Y, { width: colW, align: 'right' });
        Y += ROW;
      }
      if (creditNote.notes) {
        doc.font(AR).fontSize(8).fillColor('#7f8c8d')
           .text(fixArabic(creditNote.notes), MARGIN + colW, Y, { width: colW, align: 'right' });
        Y += ROW;
      }
      divider();

      // ══════════════════════════════════════════════════════════════════════
      // ITEMS TABLE
      // ══════════════════════════════════════════════════════════════════════
      if (creditNote.items && creditNote.items.length > 0) {
        sectionTitle('RETURNED ITEMS', 'البنود المرتجعة');
        
        const TABLE_X = MARGIN;
        const TABLE_W = CONTENT_WIDTH;
        const COL_DESC_W = Math.floor(TABLE_W * 0.40);
        const COL_QTY_W  = Math.floor(TABLE_W * 0.15);
        const COL_PRICE_W= Math.floor(TABLE_W * 0.20);
        const COL_TOTAL_W= TABLE_W - COL_DESC_W - COL_QTY_W - COL_PRICE_W;
        
        const COL_DESC_X  = TABLE_X;
        const COL_QTY_X   = TABLE_X + COL_DESC_W;
        const COL_PRICE_X = TABLE_X + COL_DESC_W + COL_QTY_W;
        const COL_TOTAL_X = TABLE_X + COL_DESC_W + COL_QTY_W + COL_PRICE_W;
        
        const TABLE_ROW_H = 22;
        const HEADER_ROW_H = 24;

        // Header row
        doc.rect(TABLE_X, Y, TABLE_W, HEADER_ROW_H).fillColor('#1a5276').fill();
        
        doc.font('Helvetica').fontSize(9).fillColor('#ffffff')
           .text('Description', COL_DESC_X + 5, Y + 7, { width: COL_DESC_W - 10, align: 'left' });
        doc.font('Helvetica').fontSize(9).fillColor('#ffffff')
           .text('Qty', COL_QTY_X, Y + 7, { width: COL_QTY_W, align: 'center' });
        doc.font('Helvetica').fontSize(9).fillColor('#ffffff')
           .text('Unit Price', COL_PRICE_X, Y + 7, { width: COL_PRICE_W, align: 'right' });
        doc.font('Helvetica').fontSize(9).fillColor('#ffffff')
           .text('Total', COL_TOTAL_X, Y + 7, { width: COL_TOTAL_W - 5, align: 'right' });
        
        doc.font(ARB).fontSize(9).fillColor('#ffffff')
           .text(fixArabic('البيان'), COL_DESC_X + 5, Y + 7, { width: COL_DESC_W - 10, align: 'right' });
        doc.font(ARB).fontSize(9).fillColor('#ffffff')
           .text(fixArabic('الكمية'), COL_QTY_X, Y + 7, { width: COL_QTY_W, align: 'center' });
        doc.font(ARB).fontSize(9).fillColor('#ffffff')
           .text(fixArabic('سعر الوحدة'), COL_PRICE_X, Y + 7, { width: COL_PRICE_W, align: 'right' });
        doc.font(ARB).fontSize(9).fillColor('#ffffff')
           .text(fixArabic('الإجمالي'), COL_TOTAL_X, Y + 7, { width: COL_TOTAL_W - 5, align: 'right' });
        
        Y += HEADER_ROW_H;

        // Data rows
        let totalAmount = 0;
        creditNote.items.forEach((item, index) => {
          const isEven = index % 2 === 0;
          if (!isEven) {
            doc.rect(TABLE_X, Y, TABLE_W, TABLE_ROW_H).fillColor('#f8f9fa').fill();
          }
          
          const itemTotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
          totalAmount += itemTotal;
          
          // ✅ ENGLISH ONLY - Display as plain text (no fixArabic)
          const descEN = `Return for Invoice ${creditNote.original_invoice_number || creditNote.original_invoice_id || 'N/A'}`;
          
          doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
             .text(descEN, COL_DESC_X + 5, Y + 4, { width: COL_DESC_W - 10, align: 'left' });
          doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
             .text(String(item.quantity || 0), COL_QTY_X, Y + 4, { width: COL_QTY_W, align: 'center' });
          doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
             .text(`${Number(item.unit_price || 0).toFixed(2)} SAR`, COL_PRICE_X, Y + 4, { width: COL_PRICE_W, align: 'right' });
          doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
             .text(`${itemTotal.toFixed(2)} SAR`, COL_TOTAL_X, Y + 4, { width: COL_TOTAL_W - 5, align: 'right' });
          
          // Arabic row below
          doc.font(ARB).fontSize(8).fillColor('#7f8c8d')
             .text(fixArabic('البيان'), COL_DESC_X + 5, Y + 4, { width: COL_DESC_W - 10, align: 'right' });
          doc.font(ARB).fontSize(8).fillColor('#7f8c8d')
             .text(fixArabic('الكمية'), COL_QTY_X, Y + 4, { width: COL_QTY_W, align: 'center' });
          doc.font(ARB).fontSize(8).fillColor('#7f8c8d')
             .text(fixArabic('سعر الوحدة'), COL_PRICE_X, Y + 4, { width: COL_PRICE_W, align: 'right' });
          doc.font(ARB).fontSize(8).fillColor('#7f8c8d')
             .text(fixArabic('الإجمالي'), COL_TOTAL_X, Y + 4, { width: COL_TOTAL_W - 5, align: 'right' });
          
          Y += TABLE_ROW_H;
          doc.moveTo(TABLE_X, Y).lineTo(TABLE_X + TABLE_W, Y)
             .strokeColor('#ecf0f1').lineWidth(0.5).stroke();
        });

        Y += 10;

        // ══════════════════════════════════════════════════════════════════
        // FINANCIAL SUMMARY
        // ══════════════════════════════════════════════════════════════════
        sectionTitle('TOTALS', 'الإجماليات');
        
        const taxAmount = Number(creditNote.tax_amount || 0);
        const totalWithTax = totalAmount + taxAmount;
        
        const SUMMARY_X = MARGIN + colW * 0.5;
        const SUMMARY_W = colW;
        const ROW_H = 20;

        // Subtotal row
        doc.rect(SUMMARY_X, Y, SUMMARY_W, ROW_H).fillColor('#ecf0f1').fill();
        doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
           .text('Subtotal', SUMMARY_X + 5, Y + 5, { width: SUMMARY_W / 2 - 5, align: 'left' });
        doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
           .text(`${totalAmount.toFixed(2)} SAR`, SUMMARY_X + SUMMARY_W / 2, Y + 5, { width: SUMMARY_W / 2 - 5, align: 'right' });
        doc.font(ARB).fontSize(9).fillColor('#2c3e50')
           .text(fixArabic('الإجمالي'), MARGIN + colW, Y + 5, { width: colW, align: 'right' });
        doc.font(ARB).fontSize(9).fillColor('#2c3e50')
           .text(`${totalAmount.toFixed(2)} ريال`, MARGIN, Y + 5, { width: colW, align: 'left' });
        Y += ROW_H;

        // Tax row
        doc.rect(SUMMARY_X, Y, SUMMARY_W, ROW_H).fillColor('#ffffff').fill();
        doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
           .text(`VAT (15%)`, SUMMARY_X + 5, Y + 5, { width: SUMMARY_W / 2 - 5, align: 'left' });
        doc.font('Helvetica').fontSize(9).fillColor('#2c3e50')
           .text(`${taxAmount.toFixed(2)} SAR`, SUMMARY_X + SUMMARY_W / 2, Y + 5, { width: SUMMARY_W / 2 - 5, align: 'right' });
        doc.font(ARB).fontSize(9).fillColor('#2c3e50')
           .text(fixArabic('الضريبة'), MARGIN + colW, Y + 5, { width: colW, align: 'right' });
        doc.font(ARB).fontSize(9).fillColor('#2c3e50')
           .text(`${taxAmount.toFixed(2)} ريال`, MARGIN, Y + 5, { width: colW, align: 'left' });
        Y += ROW_H;

        // Total row - highlighted
        doc.rect(SUMMARY_X, Y, SUMMARY_W, ROW_H).fillColor('#1a5276').fill();
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
           .text('TOTAL', SUMMARY_X + 5, Y + 5, { width: SUMMARY_W / 2 - 5, align: 'left' });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff')
           .text(`${totalWithTax.toFixed(2)} SAR`, SUMMARY_X + SUMMARY_W / 2, Y + 5, { width: SUMMARY_W / 2 - 5, align: 'right' });
        doc.font(ARB).fontSize(10).fillColor('#ffffff')
           .text(fixArabic('الإجمالي النهائي'), MARGIN + colW, Y + 5, { width: colW, align: 'right' });
        doc.font(ARB).fontSize(10).fillColor('#ffffff')
           .text(`${totalWithTax.toFixed(2)} ريال`, MARGIN, Y + 5, { width: colW, align: 'left' });
        Y += ROW_H + 10;

        divider('#1a5276', 1.5);

        Y += 12;
      }

      Y += 5;

      // ══════════════════════════════════════════════════════════════════════
      // QR CODE & FOOTER
      // ══════════════════════════════════════════════════════════════════════
      const qrSize = 80;
      const qrX = MARGIN;
      const qrY = Y;

      try {
        const qrData = JSON.stringify({
          companyName: fixArabic('خدمات الطاقة الذكية'),
          creditNoteNumber: creditNote.credit_note_number,
          returnDate: creditNote.return_date || '',
          totalAmount: `${(Number(creditNote.total_amount || 0) + Number(creditNote.tax_amount || 0)).toFixed(2)} ريال`,
          taxAmount: `${Number(creditNote.tax_amount || 0).toFixed(2)} ريال`
        });
        
        const qrBuffer = await QRCode.toBuffer(qrData, { width: qrSize, margin: 1 });
        const qrPath = path.join(invoicesDir, `qr-${Date.now()}.png`);
        fs.writeFileSync(qrPath, qrBuffer);
        
        doc.image(qrPath, qrX, qrY, { width: qrSize, height: qrSize });
        fs.unlinkSync(qrPath);
        
        doc.font(AR).fontSize(7).fillColor('#7f8c8d')
           .text(fixArabic('رمز الاستجابة السريعة - هيئة الزكاة والضريبة'), qrX, qrY + qrSize + 5, { width: qrSize, align: 'center' });
      } catch (qrError) {
        console.warn('[CreditNote PDF] QR code generation failed:', qrError.message);
      }

      // Signature area (right side)
      const sigX = PAGE_WIDTH - MARGIN - 150;
      doc.moveTo(sigX, qrY + 40).lineTo(PAGE_WIDTH - MARGIN, qrY + 40)
         .strokeColor('#bdc3c7').lineWidth(1).stroke();
      doc.font(AR).fontSize(8).fillColor('#7f8c8d')
         .text(fixArabic('التوقيع والختم'), sigX, qrY + 45, { width: 150, align: 'center' });

      // Footer line
      const footerY = PAGE_HEIGHT - 50;
      doc.moveTo(MARGIN, footerY).lineTo(PAGE_WIDTH - MARGIN, footerY)
         .strokeColor('#bdc3c7').lineWidth(0.5).stroke();
      
      doc.font('Helvetica').fontSize(7).fillColor('#95a5a6')
         .text('Smart Energy ERP System', MARGIN, footerY + 5, { width: CONTENT_WIDTH, align: 'center' });

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
    final:     'نهائي',
    cancelled: 'ملغي'
  };
  return map[status] || status;
}

module.exports = { generateCreditNotePDF };
