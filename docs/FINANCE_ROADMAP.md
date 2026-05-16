# 📊 Smart Energy ERP - Financial Module Roadmap

**Document Type:** Strategic Implementation Plan  
**Version:** 1.0.0  
**Date:** March 26, 2026  
**Status:** Draft - Awaiting PDF Requirements Review  
**Prepared By:** Senior Full-Stack Developer & Financial Systems Architect  

---

## 🎯 Executive Summary

This document outlines the complete roadmap to transform the Smart Energy ERP into a **certified VAT-compliant E-invoicing system** aligned with Saudi ZATCA (Zakat, Tax and Customs Authority) Phase 2 requirements.

### Current State Assessment

| Component | Status | Compliance Level |
|-----------|--------|------------------|
| Chart of Accounts | ✅ Implemented | 60% - Basic structure exists |
| Double-Entry Journal Entries | ✅ Implemented | 85% - Core logic working |
| Invoice Generation | ✅ Implemented | 70% - Missing ZATCA XML |
| VAT Calculation | ⚠️ Partial | 40% - Rate defined, not automated |
| E-Invoicing (XML/QR) | ❌ Not Started | 0% - Critical gap |
| Project Costing | ⚠️ Partial | 50% - Linked but incomplete |
| Asset Depreciation | ❌ Not Started | 0% - Missing entirely |
| Financial Reports | ⚠️ Partial | 30% - P&L only |

---

## 📋 PHASE 0: PDF Requirements Analysis

### Action Required

**Since the PDF file `دليل ومتطلبات حسابات شركة الطاقة الذكية.pdf` cannot be read programmatically, please provide the following information:**

#### Section A: Chart of Accounts Structure
```markdown
Please extract from PDF:
1. Complete account numbering system (e.g., 1 for Assets, 11 for Fixed Assets, etc.)
2. List all required accounts with their codes
3. Hierarchical levels (how many levels deep?)
4. Any special accounts mentioned (VAT, Withholding Tax, etc.)
```

#### Section B: VAT & E-Invoicing Requirements
```markdown
Please extract from PDF:
1. VAT rate(s) specified (standard 15%? reduced rates?)
2. E-invoicing format requirements (XML schema version?)
3. QR code specifications (what data must be encoded?)
4. Invoice validation rules
5. Integration requirements with ZATCA portal
```

#### Section C: Financial Reporting
```markdown
Please extract from PDF:
1. Required financial statements (Balance Sheet, P&L, Cash Flow?)
2. Reporting frequency (monthly, quarterly, annual?)
3. Specific KPIs or ratios required
4. Departmental vs. consolidated reporting needs
```

#### Section D: Project Accounting
```markdown
Please extract from PDF:
1. How should project costs be tracked?
2. Revenue recognition method (percentage of completion? completed contract?)
3. Work-in-progress (WIP) accounting requirements
4. Overhead allocation methods
```

#### Section E: Asset Management
```markdown
Please extract from PDF:
1. Depreciation methods required (straight-line? declining balance?)
2. Asset categories and useful lives
3. Disposal procedures
4. Revaluation requirements
```

---

## 🔍 CURRENT IMPLEMENTATION AUDIT

### 1. Chart of Accounts (COA)

#### ✅ What's Implemented

**Database Schema:**
```sql
CREATE TABLE chart_of_accounts (
  id SERIAL PRIMARY KEY,
  account_code VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
  parent_id INTEGER REFERENCES chart_of_accounts(id),
  normal_balance VARCHAR(10) NOT NULL DEFAULT 'debit',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Current Accounts (16 total):**
```
ASSETS (1000-1999)
├── 1000 - Assets (parent)
├── 1100 - Current Assets (parent)
│   ├── 1110 - Accounts Receivable
│   └── 1120 - Cash and Bank
├── 1310 - Cash on Hand
├── 1320 - Petty Cash
└── 1330 - Bank Account

LIABILITIES (2000-2999)
├── 2000 - Liabilities (parent)
├── 2100 - Current Liabilities (parent)
└── 2110 - VAT Payable ✅

REVENUE (4000-4999)
├── 4000 - Revenue (parent)
├── 4100 - Project Revenue
└── 4120 - Construction Revenue

EXPENSES (5000-6999)
├── 5000 - Expenses (parent)
├── 5100 - Project Expenses
└── 5110 - Materials Expense
```

**API Endpoints:**
```javascript
GET    /api/coa/tree              - Recursive tree structure
GET    /api/coa/:id               - Single account details
POST   /api/coa                   - Create new account
PUT    /api/coa/:id               - Update account
PATCH  /api/coa/:id/deactivate    - Soft delete
GET    /api/coa/balance/:id       - Account balance
```

#### ❌ What's Missing

1. **Hierarchical Numbering System**
   - Current: Flat codes (1000, 1100, 1110)
   - Required: Multi-level hierarchy (1, 11, 111, 1110) per PDF

2. **Account Subtypes**
   - Missing: Current Assets, Fixed Assets, Intangible Assets
   - Missing: Short-term vs Long-term Liabilities
   - Missing: Operating vs Non-operating Revenue/Expenses

3. **Complete Account Coverage**
   - No Equity accounts (Share Capital, Retained Earnings)
   - No Fixed Assets (Property, Equipment, Vehicles)
   - No Accumulated Depreciation accounts
   - No Withholding Tax accounts
   - No Deferred Revenue/Expense accounts
   - No Cost of Goods Sold breakdown

4. **Parent-Child Relationships**
   - Current migration doesn't set parent_id values
   - Tree structure exists but not populated

---

### 2. Journal Entries (Double-Entry Accounting)

#### ✅ What's Implemented

**Core Architecture:**
```javascript
// Two-table design
journal_entries (header)
├── entry_date
├── description
├── reference_type (invoice, payment, expense)
├── reference_id
├── project_id
├── is_posted

journal_entry_lines (details)
├── journal_entry_id
├── account_id
├── debit_amount
├── credit_amount
```

**Balance Validation:**
```javascript
async function validateEntryBalance(lines) {
  const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0);
  
  return {
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    difference: totalDebits - totalCredits
  };
}
```

**Automated Entry Creation:**
```javascript
// Invoice posting (from journal-entries.service.js)
async function createInvoiceJournalEntry(invoice, currentUser) {
  // Dr. Accounts Receivable (1110)
  // Cr. Project Revenue (4120)
  // Cr. VAT Payable (2110) [if tax_amount > 0]
}

// Expense recording
async function createExpenseJournalEntry(expense, currentUser) {
  // Dr. Expense Account
  // Cr. Petty Cash / Cash / Accounts Payable
}
```

**Trial Balance Report:**
```javascript
GET /api/journal-entries/trial-balance?startDate=2026-01-01&endDate=2026-03-31
```

#### ❌ What's Missing

1. **VAT Automation**
   - VAT calculation not integrated into invoice creation
   - No reverse charge mechanism
   - No input/output VAT reconciliation
   - No VAT return generation

2. **Payment Processing**
   - No payment receipt module
   - No bank reconciliation
   - No partial payment tracking
   - No payment allocation logic

3. **Adjustment Entries**
   - No accrual entries
   - No deferral entries
   - No correction/reversal mechanism
   - No audit trail for modifications

4. **Multi-Currency Support**
   - All amounts in SAR only
   - No exchange rate handling
   - No foreign currency revaluation

---

### 3. Invoices & E-Invoicing

#### ✅ What's Implemented

**Invoice Table:**
```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  purchase_request_id INTEGER REFERENCES purchase_requests(id),
  project_id INTEGER REFERENCES projects(id),
  client_id INTEGER, -- via projects.client_id
  issue_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(15,2),
  tax_amount DECIMAL(15,2), -- VAT field exists
  discount_amount DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  status VARCHAR(30) DEFAULT 'draft', -- draft, sent, paid, cancelled
  metadata JSONB, -- Flexible storage for additional data
  pdf_path VARCHAR(500), -- Generated PDF location
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**PDF Generation:**
```javascript
// Puppeteer-based professional PDF
async function generateInvoicePDF(invoiceId, saveToFile = true) {
  // - Fetches invoice data with items
  // - Renders HTML template (InvoiceTemplate.js)
  // - Generates A4 PDF with corporate branding
  // - Saves to uploads/invoices/invoice_{id}.pdf
  // - Updates invoice record with pdf_path
}
```

**Workflow:**
```
Draft Invoice → Finance Approval → Post → Generate PDF → Notify Stakeholders
```

#### ❌ What's Missing (CRITICAL FOR ZATCA COMPLIANCE)

1. **E-Invoicing XML Generation**
   - No UBL 2.1 XML format support
   - No ZATCA-specific schema compliance
   - No digital signature integration
   - No cryptographic stamp

2. **QR Code Generation**
   - Current: Placeholder in PDF template
   - Required: TLV-encoded Base64 QR with:
     * Seller Name
     * VAT Registration Number
     * Timestamp (ISO 8601)
     * Invoice Total (with VAT)
     * VAT Amount
     * Hash of previous invoice (for chaining)

3. **Invoice Hashing & Chaining**
   - No UUID generation per invoice
   - No hash linking between invoices
   - No anti-tampering mechanism

4. **ZATCA Integration**
   - No API connection to ZATCA portal
   - No clearance/reporting distinction
   - No compliance check before submission
   - No error handling for rejected invoices

5. **Invoice Types**
   - No simplified invoice support (B2C)
   - No standard invoice (B2B) differentiation
   - No credit/debit note handling
   - No self-billing invoices

---

### 4. Project Costing & Profitability

#### ✅ What's Implemented

**Project-Invoice Linkage:**
```sql
invoices.project_id → projects.id
journal_entries.project_id → projects.id
purchase_requests.project_id → projects.id
```

**Profitability Query:**
```sql
SELECT 
  p.name AS project_name,
  SUM(CASE WHEN je.entry_type = 'credit' THEN je.amount ELSE 0 END) AS revenue,
  SUM(CASE WHEN je.entry_type = 'debit' THEN je.amount ELSE 0 END) AS expenses,
  (revenue - expenses) AS gross_profit
FROM projects p
LEFT JOIN journal_entries je ON je.project_id = p.id
GROUP BY p.id, p.name;
```

**Material Allocation:**
```javascript
POST /api/inventory/allocate-to-project
{
  "projectId": 5,
  "items": [{
    "inventory_item_id": 12,
    "quantity_requested": 100
  }]
}
// Creates inventory_movements with project_id
```

#### ❌ What's Missing

1. **Work-in-Progress (WIP)**
   - No WIP account tracking
   - No percentage-of-completion calculation
   - No revenue recognition timing
   - No cost-to-complete estimation

2. **Overhead Allocation**
   - No indirect cost distribution
   - No labor cost tracking by project
   - No equipment usage costing
   - No shared expense allocation

3. **Budget vs Actual**
   - No budget tracking at project level
   - No variance analysis
   - No commitment accounting
   - No forecasting

4. **Change Orders**
   - No variation order management
   - No scope change impact tracking
   - No revised budget approval workflow

---

### 5. Asset Management & Depreciation

#### ✅ What's Implemented

**Nothing** - This module does not exist yet.

#### ❌ What's Missing (COMPLETE MODULE REQUIRED)

1. **Fixed Assets Register**
   ```sql
   CREATE TABLE fixed_assets (
     id SERIAL PRIMARY KEY,
     asset_code VARCHAR(50) UNIQUE,
     asset_name VARCHAR(200),
     category VARCHAR(50), -- Building, Vehicle, Equipment
     acquisition_date DATE,
     acquisition_cost DECIMAL(15,2),
     useful_life_months INTEGER,
     depreciation_method VARCHAR(30), -- straight_line, declining_balance
     salvage_value DECIMAL(15,2),
     accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
     net_book_value DECIMAL(15,2),
     location VARCHAR(200),
     assigned_to INTEGER REFERENCES users(id),
     status VARCHAR(30) -- active, disposed, sold
   );
   ```

2. **Depreciation Engine**
   ```javascript
   // Monthly depreciation calculation
   async function calculateMonthlyDepreciation(assetId) {
     // Straight-line: (Cost - Salvage) / Useful Life
     // Declining Balance: Book Value × (2 / Useful Life)
   }
   
   // Auto-generate monthly journal entries
   // Dr. Depreciation Expense
   // Cr. Accumulated Depreciation
   ```

3. **Asset Disposal**
   - Sale proceeds tracking
   - Gain/loss calculation
   - Removal from register
   - Final journal entry

4. **Asset Transfers**
   - Inter-department transfers
   - Location changes
   - Custodian updates

---

### 6. Financial Reports

#### ✅ What's Implemented

**P&L Report:**
```javascript
GET /api/reports/profit-loss?startDate=2026-01-01&endDate=2026-03-31
```

**Trial Balance:**
```javascript
GET /api/journal-entries/trial-balance?startDate=...&endDate=...
```

#### ❌ What's Missing

1. **Balance Sheet**
   - Assets = Liabilities + Equity
   - Classified by current/non-current
   - Comparative periods

2. **Cash Flow Statement**
   - Operating activities
   - Investing activities
   - Financing activities
   - Indirect/direct method option

3. **VAT Return**
   - Output VAT (sales)
   - Input VAT (purchases)
   - Net VAT payable/refundable
   - Quarterly filing format

4. **Management Reports**
   - Departmental P&L
   - Project profitability ranking
   - Aging reports (AR/AP)
   - Budget vs Actual variance

5. **Statutory Reports**
   - Zakat calculation base
   - Withholding tax summary
   - Employee benefits provision
   - Contingent liabilities disclosure

---

## 🗺️ PROPOSED IMPLEMENTATION PHASES

### PHASE 1: Core COA Enhancement & Database Schema (Week 1-2)

**Objective:** Align Chart of Accounts with PDF requirements and establish proper hierarchical structure.

#### Tasks:

1. **Analyze PDF Requirements**
   - Extract complete account list from PDF
   - Map existing accounts to new structure
   - Identify gaps

2. **Design Enhanced COA Schema**
   ```sql
   ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS level INTEGER;
   ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS account_subtype VARCHAR(50);
   ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS sort_order INTEGER;
   ```

3. **Create Migration Script**
   - Drop existing seed data
   - Insert complete account hierarchy from PDF
   - Set parent_id relationships correctly
   - Validate tree structure

4. **Update COA Service**
   - Add level-based queries
   - Improve tree building algorithm
   - Add account search/filter

5. **Testing**
   - Verify recursive queries work
   - Test account creation with parent
   - Validate no orphaned accounts

**Deliverables:**
- ✅ Complete COA matching PDF
- ✅ Working hierarchical queries
- ✅ Migration script tested
- ✅ API endpoints updated

**Success Criteria:**
- All accounts from PDF present
- Parent-child relationships correct
- Tree endpoint returns nested JSON
- No circular references

---

### PHASE 2: Automated Journal Entries & VAT Compliance (Week 3-4)

**Objective:** Implement full VAT automation and enhance journal entry workflows.

#### Tasks:

1. **VAT Configuration**
   ```javascript
   // config/vat.js
   module.exports = {
     standardRate: 0.15, // 15%
     reducedRates: {
       healthcare: 0.05,
       education: 0.00
     },
     vatRegistrationNumber: '3XXXXXXXXXXXXXXX' // From company profile
   };
   ```

2. **Enhance Invoice Creation**
   ```javascript
   async function createInvoice(data, user) {
     // Auto-calculate VAT
     const vatAmount = data.subtotal * VAT_RATE;
     
     INSERT INTO invoices (
       subtotal,
       tax_amount,      -- VAT
       total_amount     -- subtotal + VAT
     )
   }
   ```

3. **Improve Journal Entry Automation**
   ```javascript
   // When invoice posted:
   // Dr. Accounts Receivable (1110)        Total Amount
   //   Cr. Project Revenue (4120)          Subtotal
   //   Cr. VAT Payable (2110)              VAT Amount
   
   // When payment received:
   // Dr. Bank Account (1330)               Payment Amount
   //   Cr. Accounts Receivable (1110)      Payment Amount
   ```

4. **Input VAT Tracking**
   - Track VAT on purchases/expenses
   - Separate input VAT account (2111)
   - Monthly reconciliation query

5. **VAT Return Generator**
   ```javascript
   GET /api/reports/vat-return?quarter=Q1&year=2026
   
   Returns:
   {
     output_vat: 150000,  // VAT on sales
     input_vat: 50000,    // VAT on purchases
     net_vat_payable: 100000
   }
   ```

6. **Testing**
   - Create test invoices with VAT
   - Verify journal entries balanced
   - Check VAT return accuracy
   - Test partial payments

**Deliverables:**
- ✅ VAT auto-calculated on invoices
- ✅ Correct journal entries generated
- ✅ Input/output VAT tracked separately
- ✅ VAT return report functional

**Success Criteria:**
- All invoices include 15% VAT
- Journal entries always balanced
- VAT return matches manual calculation
- No rounding errors

---

### PHASE 3: E-Invoicing (ZATCA Phase 2 Compliance) (Week 5-7)

**Objective:** Generate ZATCA-compliant e-invoices with XML and QR codes.

#### Tasks:

1. **Install Dependencies**
   ```bash
   npm install xmlbuilder2 qrcode crypto-js uuid
   ```

2. **Generate UBL 2.1 XML**
   ```javascript
   // services/e-invoice.service.js
   async function generateUBLInvoice(invoiceId) {
     const invoice = await getInvoiceData(invoiceId);
     
     const xml = builder.create({
       Invoice: {
         '@xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
         ID: invoice.invoice_number,
         IssueDate: invoice.issue_date,
         InvoiceTypeCode: '388', // Standard invoice
         SupplierParty: { ... },
         CustomerParty: { ... },
         LegalMonetaryTotal: {
           LineExtensionAmount: invoice.subtotal,
           TaxExclusiveAmount: invoice.subtotal,
           TaxInclusiveAmount: invoice.total_amount,
           PayableAmount: invoice.total_amount
         },
         TaxTotal: {
           TaxAmount: invoice.tax_amount,
           TaxSubtotal: {
             TaxableAmount: invoice.subtotal,
             TaxAmount: invoice.tax_amount,
             TaxCategory: {
               ID: 'S', // Standard rate
               Percent: 15,
               TaxScheme: { ID: 'VAT' }
             }
           }
         },
         InvoiceLine: invoice.items.map(item => ({
           ID: item.id,
           InvoicedQuantity: item.quantity,
           LineExtensionAmount: item.total_price,
           Item: { Name: item.item_name },
           Price: { PriceAmount: item.unit_price }
         }))
       }
     }).end({ prettyPrint: true });
     
     return xml;
   }
   ```

3. **Generate QR Code (TLV Format)**
   ```javascript
   const QRCode = require('qrcode');
   const crypto = require('crypto');
   
   async function generateZATCAQR(invoice) {
     // TLV (Tag-Length-Value) encoding
     const tags = {
       sellerName: 1,
       vatNumber: 2,
       timestamp: 3,
       totalWithVAT: 4,
       vatAmount: 5
     };
     
     const tlvData = Buffer.concat([
       encodeTLV(tags.sellerName, 'Smart Energy Services'),
       encodeTLV(tags.vatNumber, '3XXXXXXXXXXXXXXX'),
       encodeTLV(tags.timestamp, new Date().toISOString()),
       encodeTLV(tags.totalWithVAT, invoice.total_amount.toString()),
       encodeTLV(tags.vatAmount, invoice.tax_amount.toString())
     ]);
     
     const qrBase64 = tlvData.toString('base64');
     const qrImage = await QRCode.toDataURL(qrBase64);
     
     return { qrBase64, qrImage };
   }
   
   function encodeTLV(tag, value) {
     const valueBuffer = Buffer.from(value, 'utf8');
     return Buffer.concat([
       Buffer.from([tag]),
       Buffer.from([valueBuffer.length]),
       valueBuffer
     ]);
   }
   ```

4. **Invoice Hashing & Chaining**
   ```javascript
   async function generateInvoiceHash(invoice, previousInvoiceHash) {
     const hashInput = `${invoice.invoice_number}|${invoice.uuid}|${previousInvoiceHash}`;
     const hash = crypto.createHash('SHA-256').update(hashInput).digest('base64');
     
     // Store hash in invoice record
     await pool.query(
       `UPDATE invoices SET uuid = $1, previous_invoice_hash = $2, invoice_hash = $3 WHERE id = $4`,
       [uuidv4(), previousInvoiceHash, hash, invoice.id]
     );
     
     return hash;
   }
   ```

5. **Digital Signature (Phase 2 Advanced)**
   ```javascript
   // Requires CSR certificate from ZATCA
   async function signInvoice(xmlContent, privateKey) {
     const sign = crypto.createSign('SHA256');
     sign.update(xmlContent);
     const signature = sign.sign(privateKey, 'base64');
     
     // Embed signature in XML
     return injectSignature(xmlContent, signature);
   }
   ```

6. **Update PDF Template**
   - Add real QR code image
   - Include VAT registration number
   - Show invoice UUID
   - Display hash for verification

7. **ZATCA API Integration** (Optional - requires credentials)
   ```javascript
   async function submitToZATCA(invoiceXml) {
     const response = await axios.post(
       'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/clearance/single',
       invoiceXml,
       {
         headers: {
           'Accept-Language': 'en',
           'Authorization': `Bearer ${zatcaToken}`,
           'Content-Type': 'application/xml'
         }
       }
     );
     
     return response.data;
   }
   ```

8. **Testing**
   - Generate XML for sample invoice
   - Validate against ZATCA XSD schema
   - Scan QR code with validator app
   - Verify hash chain integrity

**Deliverables:**
- ✅ UBL 2.1 XML generation
- ✅ TLV-encoded QR code
- ✅ Invoice hashing/chaining
- ✅ Updated PDF with QR
- ✅ (Optional) ZATCA API integration

**Success Criteria:**
- XML validates against ZATCA schema
- QR code scannable and contains correct data
- Hash chain unbroken
- PDF displays all required fields

---

### PHASE 4: Project Costing & Manufacturing (Week 8-9)

**Objective:** Enhance project accounting with WIP, overhead allocation, and detailed costing.

#### Tasks:

1. **Work-in-Progress Tracking**
   ```sql
   ALTER TABLE projects ADD COLUMN IF NOT EXISTS wip_account_id INTEGER REFERENCES chart_of_accounts(id);
   ALTER TABLE projects ADD COLUMN IF NOT EXISTS percent_complete DECIMAL(5,2);
   ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_completion_date DATE;
   ```

2. **Revenue Recognition Methods**
   ```javascript
   // Percentage of Completion
   async function recognizeRevenueByPOC(projectId) {
     const project = await getProject(projectId);
     const totalCosts = await getProjectCosts(projectId);
     const totalBudget = project.total_budget;
     
     const percentComplete = totalCosts / totalBudget;
     const revenueToRecognize = project.contract_value * percentComplete;
     
     // Journal Entry:
     // Dr. WIP Asset
     // Cr. Unearned Revenue
   }
   ```

3. **Labor Cost Tracking**
   ```sql
   CREATE TABLE project_labor_hours (
     id SERIAL PRIMARY KEY,
     project_id INTEGER REFERENCES projects(id),
     employee_id INTEGER REFERENCES users(id),
     work_date DATE,
     hours_worked DECIMAL(5,2),
     hourly_rate DECIMAL(10,2),
     total_cost DECIMAL(10,2),
     description TEXT
   );
   ```

4. **Overhead Allocation**
   ```javascript
   async function allocateOverhead(projectId, month) {
     const totalOverhead = await getMonthlyOverhead(month);
     const totalDirectLabor = await getTotalDirectLabor(month);
     const projectLabor = await getProjectLabor(projectId, month);
     
     const allocationRate = projectLabor / totalDirectLabor;
     const allocatedOverhead = totalOverhead * allocationRate;
     
     // Journal Entry:
     // Dr. Project Overhead Expense
     // Cr. Overhead Control Account
   }
   ```

5. **Budget vs Actual Dashboard**
   ```javascript
   GET /api/projects/:id/budget-variance
   
   Returns:
   {
     budget: 500000,
     actual_costs: 320000,
     committed_costs: 50000,
     remaining_budget: 130000,
     variance_percent: -36,
     forecast_final_cost: 480000
   }
   ```

6. **Change Order Management**
   ```sql
   CREATE TABLE change_orders (
     id SERIAL PRIMARY KEY,
     project_id INTEGER REFERENCES projects(id),
     change_number VARCHAR(50),
     description TEXT,
     cost_impact DECIMAL(15,2),
     time_impact_days INTEGER,
     status VARCHAR(30), -- pending, approved, rejected
     approved_by INTEGER REFERENCES users(id),
     approved_at TIMESTAMP WITH TIME ZONE
   );
   ```

**Deliverables:**
- ✅ WIP tracking system
- ✅ Labor cost capture
- ✅ Overhead allocation engine
- ✅ Budget variance reports
- ✅ Change order workflow

**Success Criteria:**
- Accurate project profitability
- Real-time budget monitoring
- Proper revenue recognition
- Audit trail for changes

---

### PHASE 5: Asset Depreciation & Financial Reports (Week 10-12)

**Objective:** Complete fixed assets module and generate comprehensive financial statements.

#### Tasks:

1. **Fixed Assets Module**
   - Create tables (see Section 5 above)
   - Build CRUD APIs
   - Asset categorization
   - Barcode/QR code for physical tracking

2. **Depreciation Engine**
   ```javascript
   // Cron job: runs on 1st of each month
   async function runMonthlyDepreciation() {
     const assets = await getActiveAssets();
     
     for (const asset of assets) {
       const monthlyDepreciation = calculateDepreciation(asset);
       
       // Update accumulated depreciation
       await updateAssetDepreciation(asset.id, monthlyDepreciation);
       
       // Create journal entry
       await createJournalEntry({
         description: `Depreciation - ${asset.asset_name} - ${new Date().toLocaleDateString('ar-SA')}`,
         reference_type: 'depreciation',
         reference_id: asset.id,
         lines: [
           {
             account_code: '6400', // Depreciation Expense
             debit_amount: monthlyDepreciation
           },
           {
             account_code: '1590', // Accumulated Depreciation
             credit_amount: monthlyDepreciation
           }
         ]
       });
     }
   }
   ```

3. **Balance Sheet Report**
   ```javascript
   GET /api/reports/balance-sheet?asOfDate=2026-03-31
   
   Returns classified balance sheet:
   {
     assets: {
       current: { ... },
       non_current: { ... }
     },
     liabilities: {
       current: { ... },
       non_current: { ... }
     },
     equity: { ... }
   }
   ```

4. **Cash Flow Statement**
   ```javascript
   GET /api/reports/cash-flow?period=Q1&year=2026
   
   Three sections:
   - Operating Activities (Net Income + Adjustments)
   - Investing Activities (Asset purchases/sales)
   - Financing Activities (Loans, equity)
   ```

5. **Departmental P&L**
   ```javascript
   GET /api/reports/departmental-pl?departmentId=5&month=2026-03
   
   Shows revenue and expenses by department
   Enables profit center analysis
   ```

6. **Aging Reports**
   ```javascript
   GET /api/reports/ar-aging   // Accounts Receivable aging
   GET /api/reports/ap-aging   // Accounts Payable aging
   
   Buckets: Current, 1-30, 31-60, 61-90, 90+ days
   ```

7. **Export Capabilities**
   - Excel export for all reports
   - PDF generation with charts
   - Email scheduling (monthly reports)

**Deliverables:**
- ✅ Fixed assets register
- ✅ Automated depreciation
- ✅ Balance sheet report
- ✅ Cash flow statement
- ✅ Departmental P&L
- ✅ Aging reports
- ✅ Export functionality

**Success Criteria:**
- Depreciation calculated correctly
- Balance sheet balances (A = L + E)
- Cash flow reconciles to bank
- Reports match manual calculations

---

## 🧪 TESTING STRATEGY

### Test Tokens (From tokens.md)

**Finance Manager:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ODQsImVtYWlsIjoibW9zYWVsd2F5bHlAZ21haWwuY29tIiwicm9sZSI6ImZpbmFuY2VfbWFuYWdlciIsInJvbGVfaWQiOjEzLCJkZXBhcnRtZW50X2lkIjoxMiwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3NzU0NDgzMDIsImV4cCI6MTc3NjA1MzEwMn0.e5bVt1lSzr_B3Sdbu6F7w3DdMPK8Luq1WUsrJGcgguU
```

**Super Admin:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NzIsImVtYWlsIjoic3VwZXJAZ21haWwuY29tIiwicm9sZSI6InN1cGVyX2FkbWluIiwicm9sZV9pZCI6MSwiZGVwYXJ0bWVudF9pZCI6bnVsbCwicGVybWlzc2lvbnMiOlsic3lzdGVtOm1hbmFnZSIsImRlcGFydG1lbnRzOmNyZWF0ZSIsImRlcGFydG1lbnRzOnJlYWQiLCJkZXBhcnRtZW50czp1cGRhdGUiLCJkZXBhcnRtZW50czpkZWxldGUiLCJ1c2VyczpjcmVhdGUiLCJ1c2VyczpyZWFkIiwidXNlcnM6dXBkYXRlIiwidXNlcnM6ZGVsZXRlIiwibGVhZHM6Y3JlYXRlIiwibGVhZHM6cmVhZCIsImxlYWRzOnVwZGF0ZSIsImxlYWRzOmRlbGV0ZSIsImluc3BlY3Rpb25zOmNyZWF0ZSIsImluc3BlY3Rpb25zOnJlYWQiLCJpbnNwZWN0aW9uczp1cGRhdGUiLCJxdW90YXRpb25zOmNyZWF0ZSIsInF1b3RhdGlvbnM6cmVhZCIsInF1b3RhdGlvbnM6dXBkYXRlIiwicXVvdGF0aW9uczphcHByb3ZlIiwicHJvamVjdHM6Y3JlYXRlIiwicHJvamVjdHM6cmVhZCIsInByb2plY3RzOm1hbmFnZSIsImZpbmFuY2U6cmVhZCIsImZpbmFuY2U6bWFuYWdlIiwicmVwb3J0czpyZWFkIiwiZGVwYXJ0bWVudDpyZWFkIiwiZGVwYXJ0bWVudDptYW5hZ2UiLCJpbnNwZWN0aW9uczphc3NpZ24iLCJpbnNwZWN0aW9uczpyZXBvcnQiLCJxdW90YXRpb25zOmZpbmFuY2VfYXBwcm92ZSIsInF1b3RhdGlvbnM6Z21fYXBwcm92ZSIsInByb2plY3RzOmFzc2lnbiIsIm5vdGlmaWNhdGlvbnM6cmVhZCIsImNsaWVudDp2aWV3X3F1b3RhdGlvbiIsImNsaWVudDphcHByb3ZlX3F1b3RhdGlvbiIsImVtcGxveWVlczpjcmVhdGUiLCJlbXBsb3llZXM6cmVhZCIsImVtcGxveWVlczp1cGRhdGUiLCJlbXBsb3llZXM6ZGVsZXRlIiwibGVhdmVzOmNyZWF0ZSIsImxlYXZlczpyZWFkIiwibGVhdmVzOmFwcHJvdmUiLCJldmFsdWF0aW9uczpjcmVhdGUiLCJldmFsdWF0aW9uczpyZWFkIl0sImlhdCI6MTc3NTQ0NzY1MywiZXhwIjoxNzc2MDUyNDUzfQ.MNiuR4x7pbL6DGEbA5kMym_E8wdbf61gyxqkbTt8SuA
```

### Testing Protocol Per Phase

For each phase:
1. ✅ Unit tests for service functions
2. ✅ Integration tests for API endpoints
3. ✅ Database transaction testing
4. ✅ Edge case validation (null values, zero amounts)
5. ✅ Role-based access control verification
6. ✅ Error handling and rollback testing

---

## 📅 TIMELINE & MILESTONES

| Phase | Duration | Start Date | End Date | Key Deliverable |
|-------|----------|------------|----------|-----------------|
| **Phase 1** | 2 weeks | Week 1 | Week 2 | Complete COA hierarchy |
| **Phase 2** | 2 weeks | Week 3 | Week 4 | VAT automation |
| **Phase 3** | 3 weeks | Week 5 | Week 7 | ZATCA e-invoicing |
| **Phase 4** | 2 weeks | Week 8 | Week 9 | Project costing |
| **Phase 5** | 3 weeks | Week 10 | Week 12 | Assets & reports |
| **Total** | **12 weeks** | | | **Full VAT compliance** |

---

## ⚠️ RISKS & MITIGATION

### Risk 1: PDF Requirements Misalignment
**Risk:** Implementation doesn't match PDF specifications  
**Mitigation:** Early review with stakeholders after Phase 1

### Risk 2: ZATCA API Changes
**Risk:** ZATCA updates technical requirements  
**Mitigation:** Follow official ZATCA developer portal updates

### Risk 3: Performance Degradation
**Risk:** Complex queries slow down system  
**Mitigation:** Database indexing, query optimization, caching

### Risk 4: Data Integrity Issues
**Risk:** Unbalanced journal entries corrupt financials  
**Mitigation:** Strict validation, database constraints, audit trails

---

## 🎯 SUCCESS METRICS

### Technical Metrics
- [ ] 100% of PDF requirements implemented
- [ ] All journal entries balanced (debits = credits)
- [ ] VAT calculations accurate to 2 decimal places
- [ ] E-invoice XML validates against ZATCA schema
- [ ] QR codes scannable and contain correct data
- [ ] Reports generate in < 5 seconds

### Business Metrics
- [ ] Zero manual journal entries required
- [ ] Invoice generation time < 2 seconds
- [ ] Month-end closing reduced from 5 days to 1 day
- [ ] VAT return preparation automated
- [ ] Project profitability visible in real-time

---

## 📞 NEXT STEPS

### Immediate Actions (Today)

1. **Review this document** with stakeholders
2. **Extract PDF requirements** and fill in Phase 0 section
3. **Confirm account codes** from PDF match proposed structure
4. **Identify any missing modules** not covered in phases
5. **Get approval** to proceed with Phase 1

### Questions for You

❓ **Question 1:** Can you provide the text content of the PDF or summarize the key requirements?

❓ **Question 2:** Are there any specific accounts or features mentioned in the PDF that are not covered in my proposed phases?

❓ **Question 3:** Do you need additional test tokens for other roles (e.g., auditor, accountant)?

❓ **Question 4:** Should I prioritize ZATCA integration (Phase 3) before project costing (Phase 4), or keep the current order?

❓ **Question 5:** Is there a target go-live date for VAT compliance?

---

## 📝 DOCUMENT CONTROL

**Author:** Senior Full-Stack Developer & Financial Systems Architect  
**Review Date:** March 26, 2026  
**Next Review:** After PDF requirements clarification  
**Version History:**
- v1.0.0 (March 26, 2026) - Initial draft based on current implementation

**Distribution:** Project stakeholders, finance team, IT management

---

**END OF ROADMAP**
