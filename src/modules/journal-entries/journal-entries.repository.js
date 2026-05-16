const { query } = require('../../db');

// ============================================================================
// Journal Entries Repository - Double-Entry Accounting Core
// ============================================================================

/**
 * Create journal entry with transaction safety
 */
async function createJournalEntryWithLines(entryData, lines, client) {
  try {
    const {
      entry_number, entry_date, description, reference_type,
      reference_id, project_id, contract_id, posted_by
    } = entryData;

    // ✅ FIX: الـ INSERT متطابق مع الـ schema الفعلي
    // entry_number → INTEGER, مفيش text prefix
    const entryResult = await client.query(
      `INSERT INTO journal_entries (
        entry_number, entry_date, description, reference_type,
        reference_id, project_id, contract_id, posted_by, is_posted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
      RETURNING *`,
      [
        entry_number,   // ✅ INTEGER (مش string)
        entry_date,
        description,
        reference_type,
        reference_id,
        project_id,
        contract_id,
        posted_by
      ]
    );

    const entry = entryResult.rows[0];

    // Insert all lines
    for (const line of lines) {
      await client.query(
        `INSERT INTO journal_entry_lines 
          (journal_entry_id, account_id, description, debit_amount, credit_amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          entry.id,
          line.account_id,
          line.description || '',
          line.debit_amount || 0,
          line.credit_amount || 0
        ]
      );
    }

    return entry;
  } catch (error) {
    throw error;
  }
}

/**
 * Get journal entry by ID with lines
 */
async function getJournalEntryById(id) {
  const entryResult = await query(
    `SELECT 
       je.*,
       u.first_name || ' ' || u.last_name AS posted_by_name
     FROM journal_entries je
     LEFT JOIN users u ON u.id = je.posted_by
     WHERE je.id = $1 LIMIT 1`,
    [id]
  );

  const entry = entryResult.rows[0];

  if (!entry) {
    return null;
  }

  // Get lines
  const linesResult = await query(
    `SELECT 
       jel.*,
       ca.account_code,
       ca.account_name,
       ca.account_type
     FROM journal_entry_lines jel
     JOIN chart_of_accounts ca ON ca.id = jel.account_id
     WHERE jel.journal_entry_id = $1
     ORDER BY jel.id`,
    [id]
  );

  entry.lines = linesResult.rows;

  return entry;
}

/**
 * Get journal entries by reference
 */
async function getEntriesByReference(referenceType, referenceId) {
  const result = await query(
    `SELECT * FROM journal_entries 
     WHERE reference_type = $1 AND reference_id = $2
     ORDER BY created_at DESC`,
    [referenceType, referenceId]
  );

  return result.rows;
}

/**
 * Get entries for project
 */
async function getProjectEntries(projectId) {
  const result = await query(
    `SELECT 
       je.*,
       u.first_name || ' ' || u.last_name AS posted_by_name
     FROM journal_entries je
     LEFT JOIN users u ON u.id = je.posted_by
     WHERE je.project_id = $1
     ORDER BY je.entry_date DESC, je.created_at DESC`,
    [projectId]
  );

  return result.rows;
}

/**
 * Validate that debits equal credits
 */
async function validateEntryBalance(lines) {
  const totalDebits = lines.reduce((sum, line) => {
    const debitAmount = parseFloat(line.debit_amount || 0);
    return sum + (isNaN(debitAmount) ? 0 : debitAmount);
  }, 0);

  const totalCredits = lines.reduce((sum, line) => {
    const creditAmount = parseFloat(line.credit_amount || 0);
    return sum + (isNaN(creditAmount) ? 0 : creditAmount);
  }, 0);

  return {
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    totalDebits: parseFloat(totalDebits.toFixed(2)),
    totalCredits: parseFloat(totalCredits.toFixed(2)),
    difference: parseFloat((totalDebits - totalCredits).toFixed(2))
  };
}

/**
 * Get trial balance for date range
 */
async function getTrialBalance(startDate, endDate) {
  const sql = `
    SELECT 
      ca.id AS account_id,
      ca.account_code,
      ca.account_name,
      ca.account_type,
      COALESCE(SUM(jel.debit_amount), 0) AS total_debits,
      COALESCE(SUM(jel.credit_amount), 0) AS total_credits,
      COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) AS balance
    FROM chart_of_accounts ca
    LEFT JOIN journal_entry_lines jel ON jel.account_id = ca.id
    LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id
    WHERE je.is_posted = TRUE
      AND je.entry_date BETWEEN $1 AND $2
    GROUP BY ca.id, ca.account_code, ca.account_name, ca.account_type
    HAVING COALESCE(SUM(jel.debit_amount), 0) != COALESCE(SUM(jel.credit_amount), 0)
    ORDER BY ca.account_code
  `;

  const result = await query(sql, [startDate, endDate]);
  return result.rows;
}

/**
 * Get account balance up to date
 */
async function getAccountBalance(accountId, upToDate = null) {
  let sql = `
    SELECT 
      COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) AS balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON je.id = jel.journal_entry_id
    WHERE jel.account_id = $1 AND je.is_posted = TRUE
  `;

  const params = [accountId];

  if (upToDate) {
    sql += ` AND je.entry_date <= $${params.length + 1}`;
    params.push(upToDate);
  }

  const result = await query(sql, params);
  return result.rows[0]?.balance || 0;
}

module.exports = {
  createJournalEntryWithLines,
  getJournalEntryById,
  getEntriesByReference,
  getProjectEntries,
  validateEntryBalance,
  getTrialBalance,
  getAccountBalance,
};