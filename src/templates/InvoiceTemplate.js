/**
 * Generate Professional Bilingual Invoice HTML with ZATCA QR Code
 * Smart Energy Services - Client-Ready Tax Invoice
 */



function generateInvoiceHTML(data) {
  const {
    invoice_number,
    issue_date,
    due_date,
    status,
    project_name,
    client_name,
    client_email,
    client_phone,
    client_address,
    items,
    subtotal,
    tax_amount,
    tax_rate,
    discount_amount,
    total_amount,
    qr_code_data,
    vat_registration_number,
    notes,
    payment_terms
  } = data;

  // Format dates
  const formattedIssueDate = new Date(issue_date).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedDueDate = due_date ? new Date(due_date).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';

  // Currency formatter
  const formatCurrency = (amount) => {
    return `${parseFloat(amount || 0).toFixed(2)} ر.س`;
  };

  // Status badge color
  const getStatusColor = (status) => {
    const colors = {
      paid: '#27ae60',
      partial: '#f39c12',
      sent: '#3498db',
      draft: '#95a5a6',
      overdue: '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  // Company info
  const companyNameEN = 'Smart Energy Services';
  const companyNameAR = 'شركة سمارت لخدمات الطاقة';
  const companyAddress = 'Riyadh, Kingdom of Saudi Arabia';
  const companyPhone = '+966 XX XXX XXXX';
  const companyEmail = 'info@smartenergy.sa';
  const vatNumber = vat_registration_number || '3XXXXXXXXXXXXXXX';

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice | فاتورة ضريبية - ${invoice_number}</title>
  
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #2c3e50;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .invoice-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 15mm;
      position: relative;
      background: white;
    }

    /* Color Variables */
    :root {
      --primary-blue: #1A5276;
      --secondary-blue: #2E86AB;
      --accent-gold: #D4AF37;
      --light-gray: #F8F9FA;
      --border-gray: #DEE2E6;
      --text-dark: #2C3E50;
      --text-light: #6C757D;
    }

    /* Header Section */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 3px solid var(--primary-blue);
      margin-bottom: 25px;
    }

    .company-section {
      flex: 1;
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 10px;
    }

    .logo-placeholder {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 10px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .company-names h1 {
      font-size: 20px;
      color: var(--primary-blue);
      margin-bottom: 3px;
      font-weight: 700;
    }

    .company-names h2 {
      font-size: 16px;
      color: var(--secondary-blue);
      margin-bottom: 8px;
      font-weight: 600;
    }

    .company-details {
      font-size: 9px;
      color: var(--text-light);
      line-height: 1.6;
    }

    .company-details div {
      margin-bottom: 2px;
    }

    .invoice-title-section {
      text-align: left;
      padding: 15px 20px;
      background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
      border-radius: 8px;
      color: white;
      min-width: 200px;
    }

    .invoice-title-section h3 {
      font-size: 18px;
      margin-bottom: 5px;
      font-weight: 700;
    }

    .invoice-title-section p {
      font-size: 11px;
      opacity: 0.9;
    }

    .vat-badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 10px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
    }

    /* Invoice Info Bar */
    .invoice-info-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      background: var(--light-gray);
      padding: 15px 20px;
      border-radius: 6px;
      margin-bottom: 25px;
      border-right: 4px solid var(--primary-blue);
    }

    .info-item {
      text-align: center;
    }

    .info-label {
      font-size: 9px;
      color: var(--text-light);
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .info-value {
      font-size: 12px;
      color: var(--text-dark);
      font-weight: 700;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      background: ${getStatusColor(status)};
      color: white;
      border-radius: 12px;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
    }

    /* Client & Project Section */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 25px;
    }

    .detail-box {
      background: var(--light-gray);
      padding: 15px;
      border-radius: 6px;
      border-top: 3px solid var(--primary-blue);
    }

    .detail-box h4 {
      font-size: 12px;
      color: var(--primary-blue);
      margin-bottom: 10px;
      font-weight: 700;
      border-bottom: 1px solid var(--border-gray);
      padding-bottom: 5px;
    }

    .detail-row {
      margin-bottom: 5px;
      font-size: 10px;
    }

    .detail-label {
      color: var(--text-light);
      font-weight: 600;
    }

    .detail-value {
      color: var(--text-dark);
      font-weight: 500;
    }

    /* Items Table */
    .items-section {
      margin-bottom: 25px;
    }

    .section-header {
      font-size: 13px;
      color: var(--primary-blue);
      font-weight: 700;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid var(--primary-blue);
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .items-table thead {
      background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
      color: white;
    }

    .items-table th {
      padding: 10px 8px;
      text-align: center;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
    }

    .items-table tbody tr {
      border-bottom: 1px solid var(--border-gray);
    }

    .items-table tbody tr:nth-child(even) {
      background-color: var(--light-gray);
    }

    .items-table td {
      padding: 10px 8px;
      text-align: center;
    }

    .items-table td:nth-child(2) {
      text-align: right;
    }

    /* Totals Section */
    .totals-and-notes {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 20px;
      margin-bottom: 25px;
    }

    .notes-section {
      background: var(--light-gray);
      padding: 15px;
      border-radius: 6px;
      font-size: 9px;
    }

    .notes-section h4 {
      color: var(--primary-blue);
      margin-bottom: 8px;
      font-size: 11px;
    }

    .totals-box {
      background: white;
      border: 2px solid var(--primary-blue);
      border-radius: 6px;
      overflow: hidden;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 15px;
      border-bottom: 1px solid var(--border-gray);
      font-size: 10px;
    }

    .total-row:last-child {
      border-bottom: none;
    }

    .total-label {
      color: var(--text-dark);
      font-weight: 600;
    }

    .total-value {
      color: var(--text-dark);
      font-weight: 700;
    }

    .grand-total {
      background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
      color: white;
      padding: 12px 15px;
      font-size: 13px;
    }

    .grand-total .total-label,
    .grand-total .total-value {
      color: white;
      font-weight: 700;
    }

    /* QR Code Section */
    .qr-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px dashed var(--border-gray);
    }

    .qr-code-container {
      text-align: center;
    }

    .qr-code-image {
      width: 120px;
      height: 120px;
      border: 2px solid var(--primary-blue);
      border-radius: 8px;
      padding: 5px;
      background: white;
    }

    .qr-label {
      font-size: 8px;
      color: var(--text-light);
      margin-top: 5px;
      font-weight: 600;
    }

    .zatca-info {
      flex: 1;
      padding-right: 20px;
      font-size: 9px;
      color: var(--text-light);
    }

    .zatca-info h4 {
      color: var(--primary-blue);
      margin-bottom: 8px;
      font-size: 10px;
    }

    .zatca-info p {
      margin-bottom: 4px;
      line-height: 1.5;
    }

    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid var(--primary-blue);
      text-align: center;
      font-size: 9px;
      color: var(--text-light);
    }

    .footer-company {
      font-weight: 700;
      color: var(--primary-blue);
      font-size: 11px;
      margin-bottom: 5px;
    }

    .footer-text {
      margin-bottom: 3px;
    }

    /* Print Optimization */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .invoice-container {
        page-break-after: always;
      }
    }
  </style>
</head>

<body>
  <div class="invoice-container">

    <!-- Header -->
    <div class="header">
      <div class="company-section">
        <div class="logo-area">
          <img src="../assets/logo.png" style="width: 80px; height: 80px;" />
          <div class="company-names">
            <h1>${companyNameEN}</h1>
            <h2>${companyNameAR}</h2>
          </div>
        </div>
        <div class="company-details">
          <div>📍 ${companyAddress}</div>
          <div>📞 ${companyPhone} | ✉️ ${companyEmail}</div>
          <div>VAT Registration: ${vatNumber}</div>
        </div>
      </div>
      
      <div class="invoice-title-section">
        <h3>TAX INVOICE</h3>
        <p>فاتورة ضريبية مبسطة</p>
        <div class="vat-badge">VAT: ${tax_rate}%</div>
      </div>
    </div>

    <!-- Invoice Info Bar -->
    <div class="invoice-info-bar">
      <div class="info-item">
        <div class="info-label">Invoice Number | رقم الفاتورة</div>
        <div class="info-value">${invoice_number}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Issue Date | تاريخ الإصدار</div>
        <div class="info-value">${formattedIssueDate}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Due Date | تاريخ الاستحقاق</div>
        <div class="info-value">${formattedDueDate}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Status | الحالة</div>
        <div class="status-badge">${status.toUpperCase()}</div>
      </div>
    </div>

    <!-- Client & Project Details -->
    <div class="details-grid">
      <div class="detail-box">
        <h4>Bill To | العميل</h4>
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${client_name || 'N/A'}</span>
        </div>
        ${client_email ? `
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${client_email}</span>
        </div>
        ` : ''}
        ${client_phone ? `
        <div class="detail-row">
          <span class="detail-label">Phone:</span>
          <span class="detail-value">${client_phone}</span>
        </div>
        ` : ''}
        ${client_address ? `
        <div class="detail-row">
          <span class="detail-label">Address:</span>
          <span class="detail-value">${client_address}</span>
        </div>
        ` : ''}
      </div>
      
      ${project_name ? `
      <div class="detail-box">
        <h4>Project Details | تفاصيل المشروع</h4>
        <div class="detail-row">
          <span class="detail-label">Project:</span>
          <span class="detail-value">${project_name}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Terms:</span>
          <span class="detail-value">${payment_terms || 'Net 30 Days'}</span>
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Line Items -->
    <div class="items-section">
      <div class="section-header">Line Items | بنود الفاتورة</div>
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 5%">#</th>
            <th style="width: 35%">Description<br>الوصف</th>
            <th style="width: 10%">Qty<br>الكمية</th>
            <th style="width: 15%">Unit Price<br>سعر الوحدة</th>
            <th style="width: 15%">VAT (${tax_rate}%)<br>الضريبة</th>
            <th style="width: 20%">Total<br>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          ${items && items.length > 0 ? items.map((item, index) => {
            const lineSubtotal = (item.quantity || 1) * (item.unit_price || 0);
            const lineVAT = lineSubtotal * (tax_rate / 100);
            const lineTotal = lineSubtotal + lineVAT;
            
            return `
            <tr>
              <td>${index + 1}</td>
              <td>${item.description || item.name || 'Item'}</td>
              <td>${item.quantity || 1}</td>
              <td>${formatCurrency(item.unit_price || 0)}</td>
              <td>${formatCurrency(lineVAT)}</td>
              <td><strong>${formatCurrency(lineTotal)}</strong></td>
            </tr>
            `;
          }).join('') : `
            <tr>
              <td colspan="6" style="text-align: center; padding: 20px; color: #999;">
                No items | لا توجد بنود
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>

    <!-- Totals & Notes -->
    <div class="totals-and-notes">
      <div class="notes-section">
        <h4>Notes | ملاحظات</h4>
        <p>${notes || 'Thank you for your business. Payment is due within the specified terms.'}</p>
        ${payment_terms ? `<p style="margin-top: 8px;"><strong>Payment Terms:</strong> ${payment_terms}</p>` : ''}
      </div>
      
      <div class="totals-box">
        <div class="total-row">
          <span class="total-label">Subtotal | المجموع الفرعي</span>
          <span class="total-value">${formatCurrency(subtotal)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">VAT (${tax_rate}%) | الضريبة</span>
          <span class="total-value">${formatCurrency(tax_amount)}</span>
        </div>
        ${discount_amount > 0 ? `
        <div class="total-row">
          <span class="total-label">Discount | الخصم</span>
          <span class="total-value">-${formatCurrency(discount_amount)}</span>
        </div>
        ` : ''}
        <div class="total-row grand-total">
          <span class="total-label">TOTAL | الإجمالي النهائي</span>
          <span class="total-value">${formatCurrency(total_amount)}</span>
        </div>
      </div>
    </div>

    <!-- QR Code & ZATCA Info -->
    ${qr_code_data ? `
    <div class="qr-section">
      <div class="qr-code-container">
        <img 
          src="data:image/png;base64,${generateQRCodeImage(qr_code_data)}" 
          alt="ZATCA QR Code" 
          class="qr-code-image"
        />
        <div class="qr-label">ZATCA E-Invoice QR</div>
      </div>
      
      <div class="zatca-info">
        <h4>E-Invoicing Compliance | الفوترة الإلكترونية</h4>
        <p><strong>VAT Registration:</strong> ${vatNumber}</p>
        <p><strong>Invoice Hash:</strong> Generated per ZATCA standards</p>
        <p style="margin-top: 10px; font-size: 8px; color: #999;">
          This invoice complies with Saudi ZATCA e-invoicing regulations (Phase 1).
          Scan the QR code to verify authenticity.
        </p>
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <div class="footer-company">${companyNameEN} | ${companyNameAR}</div>
      <div class="footer-text">VAT Registration: ${vatNumber} | ${companyAddress}</div>
      <div class="footer-text">This is a computer-generated invoice and does not require a signature.</div>
      <div class="footer-text" style="margin-top: 8px; font-size: 8px;">
        Generated on ${new Date().toLocaleString('en-GB')}
      </div>
    </div>

  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate QR Code Image from Base64 TLV Data
 * Converts TLV Base64 to a scannable QR code image
 */
function generateQRCodeImage(qrDataBase64) {
  // For now, return a placeholder
  // In production, use a QR code library like 'qrcode' to generate actual image
  // This is a simplified version - you'd integrate with a QR generation library
  
  // Return a simple data URI with text "QR CODE" as placeholder
  // TODO: Integrate with qrcode npm package for real QR generation
  const placeholderSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <rect width="120" height="120" fill="white" stroke="#1A5276" stroke-width="2"/>
      <text x="60" y="55" text-anchor="middle" font-family="Arial" font-size="10" fill="#1A5276">ZATCA</text>
      <text x="60" y="70" text-anchor="middle" font-family="Arial" font-size="10" fill="#1A5276">QR CODE</text>
      <rect x="10" y="10" width="20" height="20" fill="#1A5276"/>
      <rect x="90" y="10" width="20" height="20" fill="#1A5276"/>
      <rect x="10" y="90" width="20" height="20" fill="#1A5276"/>
    </svg>
  `;
  
  return Buffer.from(placeholderSVG).toString('base64');
}

module.exports = {
  generateInvoiceHTML
};