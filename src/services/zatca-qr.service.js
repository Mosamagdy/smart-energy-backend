// ============================================================================
// ZATCA E-Invoicing QR Code Generator
// Saudi Tax Authority - Phase 2 Compliance
// TLV (Tag-Length-Value) Encoding with Base64
// ============================================================================

/**
 * ZATCA QR Code Generator
 * Implements TLV encoding as per ZATCA specifications
 */
class ZATCAQRGenerator {
  
  /**
   * Generate QR code data for invoice
   * @param {object} invoiceData - Invoice details
   * @returns {string} Base64-encoded TLV QR code data
   */
  static generate(invoiceData) {
    const {
      seller_name,
      vat_registration_number,
      timestamp,
      invoice_total,
      vat_total
    } = invoiceData;
    
    // Validate required fields
    if (!seller_name || !vat_registration_number || !timestamp || 
        invoice_total === undefined || vat_total === undefined) {
      throw new Error('Missing required fields for QR code generation');
    }
    
    // Build TLV structures
    const tlvTags = [
      this.createTLV(1, seller_name),                    // Tag 1: Seller Name
      this.createTLV(2, vat_registration_number),        // Tag 2: VAT Registration Number
      this.createTLV(3, timestamp),                      // Tag 3: Timestamp (ISO 8601)
      this.createTLV(4, invoice_total.toFixed(2)),       // Tag 4: Invoice Total (with VAT)
      this.createTLV(5, vat_total.toFixed(2))            // Tag 5: VAT Total
    ];
    
    // Concatenate all TLV bytes
    const concatenated = Buffer.concat(tlvTags);
    
    // Encode to Base64
    return concatenated.toString('base64');
  }
  
  /**
   * Create a single TLV (Tag-Length-Value) structure
   * @param {number} tag - Tag identifier (1-5)
   * @param {string} value - Value to encode
   * @returns {Buffer} TLV encoded buffer
   */
  static createTLV(tag, value) {
    // Convert value to UTF-8 buffer
    const valueBuffer = Buffer.from(value, 'utf-8');
    
    // Length of value in bytes
    const length = valueBuffer.length;
    
    // Create TLV buffer: [Tag][Length][Value]
    const tlvBuffer = Buffer.alloc(2 + length);
    tlvBuffer[0] = tag;           // Tag (1 byte)
    tlvBuffer[1] = length;        // Length (1 byte)
    valueBuffer.copy(tlvBuffer, 2); // Value (variable length)
    
    return tlvBuffer;
  }
  
  /**
   * Decode QR code data (for verification)
   * @param {string} base64Data - Base64 encoded QR data
   * @returns {object} Decoded invoice data
   */
  static decode(base64Data) {
    const buffer = Buffer.from(base64Data, 'base64');
    const result = {};
    
    let offset = 0;
    while (offset < buffer.length) {
      const tag = buffer[offset];
      const length = buffer[offset + 1];
      const value = buffer.slice(offset + 2, offset + 2 + length).toString('utf-8');
      
      switch (tag) {
        case 1:
          result.seller_name = value;
          break;
        case 2:
          result.vat_registration_number = value;
          break;
        case 3:
          result.timestamp = value;
          break;
        case 4:
          result.invoice_total = parseFloat(value);
          break;
        case 5:
          result.vat_total = parseFloat(value);
          break;
      }
      
      offset += 2 + length;
    }
    
    return result;
  }
  
  /**
   * Generate QR code with cryptographic hash (Phase 2 advanced)
   * @param {object} invoiceData - Full invoice data
   * @param {string} previousInvoiceHash - Hash from previous invoice
   * @param {string} digitalSignature - Digital signature (from ZATCA)
   * @returns {object} QR code data with hash
   */
  static generateWithHash(invoiceData, previousInvoiceHash, digitalSignature) {
    const basicQR = this.generate({
      seller_name: invoiceData.seller_name,
      vat_registration_number: invoiceData.vat_registration_number,
      timestamp: invoiceData.timestamp,
      invoice_total: invoiceData.invoice_total,
      vat_total: invoiceData.vat_total
    });
    
    // For Phase 2, additional tags are added:
    // Tag 6: Previous Invoice Hash
    // Tag 7: Digital Signature
    // Tag 8: Public Key
    
    const extendedTags = [
      this.createTLV(6, previousInvoiceHash || ''),
      this.createTLV(7, digitalSignature || '')
    ];
    
    const basicBuffer = Buffer.from(basicQR, 'base64');
    const extendedBuffers = extendedTags.map(tag => tag);
    
    const fullBuffer = Buffer.concat([basicBuffer, ...extendedBuffers]);
    
    return {
      qr_code_base64: fullBuffer.toString('base64'),
      basic_qr: basicQR,
      has_hash: true
    };
  }
  
  /**
   * Format timestamp for ZATCA (ISO 8601 with timezone)
   * @param {Date} date - Invoice date
   * @returns {string} Formatted timestamp
   */
  static formatTimestamp(date = new Date()) {
    return date.toISOString();
  }
  
  /**
   * Validate QR code format
   * @param {string} base64QR - QR code to validate
   * @returns {boolean} Is valid
   */
  static validate(base64QR) {
    try {
      const decoded = this.decode(base64QR);
      
      // Check required fields
      if (!decoded.seller_name || 
          !decoded.vat_registration_number || 
          !decoded.timestamp ||
          decoded.invoice_total === undefined ||
          decoded.vat_total === undefined) {
        return false;
      }
      
      // Validate VAT number format (Saudi: 15 digits starting with 3)
      const vatPattern = /^3\d{14}$/;
      if (!vatPattern.test(decoded.vat_registration_number.replace(/[\s-]/g, ''))) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = ZATCAQRGenerator;
