const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mosa123@localhost:5432/system'
});

async function createReceiptVouchersTable() {
  try {
    console.log('🔧 Creating receipt_vouchers table...\n');

    // Create receipt_vouchers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS receipt_vouchers (
        id SERIAL PRIMARY KEY,
        voucher_no VARCHAR(50) UNIQUE NOT NULL,
        client_id INTEGER NOT NULL REFERENCES users(id),
        receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
        amount DECIMAL(15,2) NOT NULL,
        payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'bank', 'check')),
        payment_account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
        reference_no VARCHAR(100),
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
        created_by INTEGER NOT NULL REFERENCES users(id),
        posted_by INTEGER REFERENCES users(id),
        posted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ receipt_vouchers table created\n');

    // Create receipt_voucher_invoices junction table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS receipt_voucher_invoices (
        id SERIAL PRIMARY KEY,
        receipt_voucher_id INTEGER NOT NULL REFERENCES receipt_vouchers(id) ON DELETE CASCADE,
        sales_invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id),
        amount_applied DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(receipt_voucher_id, sales_invoice_id)
      )
    `);

    console.log('✅ receipt_voucher_invoices table created\n');

    // Add paid_amount column to sales_invoices if not exists
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'sales_invoices' AND column_name = 'paid_amount'
        ) THEN
          ALTER TABLE sales_invoices ADD COLUMN paid_amount DECIMAL(15,2) DEFAULT 0;
        END IF;
      END $$;
    `);

    console.log('✅ sales_invoices.paid_amount column added/verified\n');

    // Add payment_status column to sales_invoices if not exists
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'sales_invoices' AND column_name = 'payment_status'
        ) THEN
          ALTER TABLE sales_invoices ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid' 
            CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
        END IF;
      END $$;
    `);

    console.log('✅ sales_invoices.payment_status column added/verified\n');

    console.log('🎉 Receipt Vouchers schema created successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createReceiptVouchersTable();
