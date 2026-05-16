const repo = require('./reports.repository');

// ============================================================================
// Financial Reports Service - Business Logic Layer
// ============================================================================

/**
 * Get trial balance
 * Returns all active accounts with debits, credits, and balances
 * Validates that Total Debit = Total Credit
 */
async function getTrialBalance({ startDate, endDate }) {
  const accounts = await repo.getTrialBalance(startDate, endDate);

  // Calculate totals
  const totalDebit  = accounts.reduce((sum, acc) => sum + parseFloat(acc.total_debit),  0);
  const totalCredit = accounts.reduce((sum, acc) => sum + parseFloat(acc.total_credit), 0);

  const groupedAccounts = {
    assets:      accounts.filter(a => a.account_type === 'asset'),
    liabilities: accounts.filter(a => a.account_type === 'liability'),
    equity:      accounts.filter(a => a.account_type === 'equity'),
    revenue:     accounts.filter(a => a.account_type === 'revenue'),
    expenses:    accounts.filter(a => a.account_type === 'expense'),
  };

  const rollupParentsWithActivity = accounts.filter(
    a => a.is_rollup_parent && (parseFloat(a.total_debit) > 0 || parseFloat(a.total_credit) > 0)
  );
  const inactiveWithActivity = accounts.filter(
    a => a.is_inactive_account && (parseFloat(a.total_debit) > 0 || parseFloat(a.total_credit) > 0)
  );

  // Calculate group totals — each account belongs to exactly ONE group now
  const calcGroupTotal = (group) => ({
    debit:  group.reduce((sum, a) => sum + parseFloat(a.total_debit),  0),
    credit: group.reduce((sum, a) => sum + parseFloat(a.total_credit), 0),
  });

  const groupTotals = {
    assets:      calcGroupTotal(groupedAccounts.assets),
    liabilities: calcGroupTotal(groupedAccounts.liabilities),
    equity:      calcGroupTotal(groupedAccounts.equity),
    revenue:     calcGroupTotal(groupedAccounts.revenue),
    expenses:    calcGroupTotal(groupedAccounts.expenses),
  };

  // Round all amounts
  const roundedAccounts = accounts.map(acc => ({
    ...acc,
    total_debit:  parseFloat(parseFloat(acc.total_debit).toFixed(2)),
    total_credit: parseFloat(parseFloat(acc.total_credit).toFixed(2)),
    balance:      parseFloat(parseFloat(acc.balance).toFixed(2)),
  }));

  return {
    report_date:   new Date().toISOString(),
    period_start:  startDate || 'All Time',
    period_end:    endDate   || 'All Time',
    accounts:      roundedAccounts,
    grouped_accounts: groupedAccounts,
    group_totals:  groupTotals,
    total_debit:   parseFloat(totalDebit.toFixed(2)),
    total_credit:  parseFloat(totalCredit.toFixed(2)),
    difference:    parseFloat((totalDebit - totalCredit).toFixed(2)),
    is_balanced:   Math.abs(totalDebit - totalCredit) < 0.01,
    account_count: accounts.length,
    accounts_with_activity: accounts.filter(
      a => parseFloat(a.total_debit) > 0 || parseFloat(a.total_credit) > 0
    ).length,
    warnings: {
      rollup_parents_with_activity: rollupParentsWithActivity.map(a => ({
        account_code: a.account_code,
        account_name: a.account_name,
        total_debit:  parseFloat(parseFloat(a.total_debit).toFixed(2)),
        total_credit: parseFloat(parseFloat(a.total_credit).toFixed(2)),
      })),
      inactive_accounts_with_activity: inactiveWithActivity.map(a => ({
        account_code: a.account_code,
        account_name: a.account_name,
        total_debit:  parseFloat(parseFloat(a.total_debit).toFixed(2)),
        total_credit: parseFloat(parseFloat(a.total_credit).toFixed(2)),
      })),
    },
  };
}

/**
 * Get balance sheet
 */
async function getBalanceSheet({ asOfDate }) {
  const accounts = await repo.getBalanceSheet(asOfDate);

  // Separate into Assets, Liabilities, and Equity
  const assets      = accounts.filter(acc => acc.account_type === 'asset');
  const liabilities = accounts.filter(acc => acc.account_type === 'liability');
  const equity      = accounts.filter(acc => acc.account_type === 'equity');

  // Calculate totals
  const totalAssets      = assets.reduce((sum, acc)      => sum + parseFloat(acc.balance), 0);
  const totalLiabilities = liabilities.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
  const totalEquity      = equity.reduce((sum, acc)      => sum + parseFloat(acc.balance), 0);

  // Round all amounts
  const roundAccount = (acc) => ({
    account_code:    acc.account_code,
    account_name:    acc.account_name,
    account_name_ar: acc.account_name_ar,
    report_category: acc.report_category,
    balance:         parseFloat(parseFloat(acc.balance).toFixed(2)),
  });

  return {
    as_of_date: asOfDate || new Date(),
    assets: {
      total:    parseFloat(totalAssets.toFixed(2)),
      accounts: assets.map(roundAccount),
    },
    liabilities: {
      total:    parseFloat(totalLiabilities.toFixed(2)),
      accounts: liabilities.map(roundAccount),
    },
    equity: {
      total:    parseFloat(totalEquity.toFixed(2)),
      accounts: equity.map(roundAccount),
    },
    total_liabilities_and_equity: parseFloat((totalLiabilities + totalEquity).toFixed(2)),
    is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  };
}

/**
 * Get profit and loss (income statement)
 * Structure: Revenue - COGS = Gross Profit - Operating Expenses = Net Profit
 */
async function getIncomeStatement({ startDate, endDate }) {
  const accounts = await repo.getIncomeStatement(startDate, endDate);

  // Group by P&L categories (pl_category is set in the SQL query)
  const revenue           = accounts.filter(acc => acc.pl_category === 'revenue');
  const cogs              = accounts.filter(acc => acc.pl_category === 'cogs');
  const operatingExpenses = accounts.filter(acc => acc.pl_category === 'operating_expense');
  const otherExpenses     = accounts.filter(acc => acc.pl_category === 'other_expense' || acc.pl_category === 'other');

  // ✅ Revenue: credit-normal accounts add to revenue; debit-normal (returns/discounts) subtract
  const totalRevenue = revenue.reduce((sum, acc) => {
    const balance = parseFloat(acc.balance);
    return acc.normal_balance === 'debit' ? sum - balance : sum + balance;
  }, 0);

  const totalCOGS              = cogs.reduce((sum, acc)              => sum + parseFloat(acc.balance), 0);
  const grossProfit            = totalRevenue - totalCOGS;
  const totalOperatingExpenses = operatingExpenses.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
  const totalOtherExpenses     = otherExpenses.reduce((sum, acc)     => sum + parseFloat(acc.balance), 0);
  const netProfit              = grossProfit - totalOperatingExpenses - totalOtherExpenses;

  // Round all amounts
  const roundAccount = (acc) => ({
    account_code:    acc.account_code,
    account_name:    acc.account_name,
    account_name_ar: acc.account_name_ar,
    normal_balance:  acc.normal_balance,
    report_category: acc.report_category,
    balance:         parseFloat(parseFloat(acc.balance).toFixed(2)),
  });

  return {
    period_start: startDate,
    period_end:   endDate,
    revenue: {
      total:    parseFloat(totalRevenue.toFixed(2)),
      accounts: revenue.map(roundAccount),
    },
    cogs: {
      total:    parseFloat(totalCOGS.toFixed(2)),
      accounts: cogs.map(roundAccount),
    },
    gross_profit: parseFloat(grossProfit.toFixed(2)),
    operating_expenses: {
      total:    parseFloat(totalOperatingExpenses.toFixed(2)),
      accounts: operatingExpenses.map(roundAccount),
    },
    other_expenses: {
      total:    parseFloat(totalOtherExpenses.toFixed(2)),
      accounts: otherExpenses.map(roundAccount),
    },
    net_profit:    parseFloat(netProfit.toFixed(2)),
    is_profitable: netProfit > 0,
  };
}

/**
 * Get account ledger
 */
async function getAccountLedger({ accountCode, startDate, endDate }) {
  // Get account details
  const account = await repo.getAccountByCode(accountCode);

  if (!account) {
    const err = new Error(`حساب ${accountCode} غير موجود في دليل الحسابات`);
    err.statusCode = 404;
    throw err;
  }

  // Get ledger entries
  const entries = await repo.getAccountLedger(accountCode, startDate, endDate);

  // ✅ opening balance = balance BEFORE the first entry in range (not the first entry's running total)
  const openingBalance = entries.length > 0 ? parseFloat(entries[0].running_balance) : 0;
  const closingBalance = entries.length > 0
    ? parseFloat(entries[entries.length - 1].running_balance)
    : 0;

  // Round amounts
  const roundedEntries = entries.map(entry => ({
    entry_date:        entry.entry_date,
    entry_number:      entry.entry_number,
    entry_description: entry.entry_description,
    line_description:  entry.line_description,
    debit:            parseFloat(parseFloat(entry.debit).toFixed(2)),
    credit:           parseFloat(parseFloat(entry.credit).toFixed(2)),
    running_balance:  parseFloat(parseFloat(entry.running_balance).toFixed(2)),
  }));

  return {
    account_code:    account.account_code,
    account_name:    account.account_name,
    account_name_ar: account.account_name_ar,
    account_type:    account.account_type,
    normal_balance:  account.normal_balance,
    period_start:    startDate,
    period_end:      endDate,
    opening_balance: parseFloat(openingBalance.toFixed(2)),
    closing_balance: parseFloat(closingBalance.toFixed(2)),
    entries:         roundedEntries,
  };
}

/**
 * Get receivables aging
 */
async function getReceivablesAging({ asOfDate }) {
  const details = await repo.getReceivablesAging(asOfDate);

  // Calculate summary by aging bucket
  const summary = {
    current: 0,
    '1-30':  0,
    '31-60': 0,
    '61-90': 0,
    '90+':   0,
    total:   0,
  };

  const roundedDetails = details.map(detail => {
    const outstanding = parseFloat(detail.outstanding);
    const bucket      = detail.aging_bucket;

    if (summary[bucket] !== undefined) {
      summary[bucket] += outstanding;
    }
    summary.total += outstanding;

    return {
      ...detail,
      outstanding:  parseFloat(outstanding.toFixed(2)),
      days_overdue: parseInt(detail.days_overdue),
    };
  });

  return {
    as_of_date: asOfDate || new Date(),
    summary: {
      current: parseFloat(summary.current.toFixed(2)),
      '1-30':  parseFloat(summary['1-30'].toFixed(2)),
      '31-60': parseFloat(summary['31-60'].toFixed(2)),
      '61-90': parseFloat(summary['61-90'].toFixed(2)),
      '90+':   parseFloat(summary['90+'].toFixed(2)),
      total:   parseFloat(summary.total.toFixed(2)),
    },
    details: roundedDetails,
  };
}

/**
 * Get payables aging (placeholder for Phase 5)
 */
async function getPayablesAging({ asOfDate }) {
  return {
    as_of_date: asOfDate || new Date(),
    summary: {
      current: 0,
      '1-30':  0,
      '31-60': 0,
      '61-90': 0,
      '90+':   0,
      total:   0,
    },
    details: [],
    note: 'Purchase invoices module will be implemented in Phase 5',
  };
}

/**
 * Get cash flow statement
 */
async function getCashFlow({ startDate, endDate }) {
  const cashFlowData = await repo.getCashFlow(startDate, endDate);

  const netCashFlow = cashFlowData.operating + cashFlowData.investing + cashFlowData.financing;

  return {
    period_start: startDate,
    period_end:   endDate,
    operating_activities: {
      net_cash_flow: parseFloat(cashFlowData.operating.toFixed(2)),
      description:   'Cash flows from operating activities (invoices and payments)',
    },
    investing_activities: {
      net_cash_flow: parseFloat(cashFlowData.investing.toFixed(2)),
      description:   'Cash flows from investing activities (fixed assets)',
    },
    financing_activities: {
      net_cash_flow: parseFloat(cashFlowData.financing.toFixed(2)),
      description:   'Cash flows from financing activities',
    },
    net_change_in_cash: parseFloat(netCashFlow.toFixed(2)),
    is_positive:        netCashFlow >= 0,
  };
}

/**
 * Get project material spend vs invoiced amount
 */
async function getProjectCostVsInvoiced({ projectId, startDate, endDate }) {
  const rows = await repo.getProjectCostVsInvoiced({ projectId, startDate, endDate });

  const totals = rows.reduce((acc, row) => {
    acc.material_spend  += parseFloat(row.material_spend  || 0);
    acc.invoiced_amount += parseFloat(row.invoiced_amount || 0);
    acc.gross_margin    += parseFloat(row.gross_margin    || 0);
    return acc;
  }, { material_spend: 0, invoiced_amount: 0, gross_margin: 0 });

  return {
    filters: {
      projectId:  projectId  || null,
      startDate:  startDate  || null,
      endDate:    endDate    || null,
    },
    totals: {
      material_spend:  parseFloat(totals.material_spend.toFixed(2)),
      invoiced_amount: parseFloat(totals.invoiced_amount.toFixed(2)),
      gross_margin:    parseFloat(totals.gross_margin.toFixed(2)),
    },
    projects: rows.map((row) => ({
      ...row,
      material_spend:  parseFloat(parseFloat(row.material_spend  || 0).toFixed(2)),
      invoiced_amount: parseFloat(parseFloat(row.invoiced_amount || 0).toFixed(2)),
      gross_margin:    parseFloat(parseFloat(row.gross_margin    || 0).toFixed(2)),
    })),
  };
}

module.exports = {
  getTrialBalance,
  getBalanceSheet,
  getIncomeStatement,
  getAccountLedger,
  getReceivablesAging,
  getPayablesAging,
  getCashFlow,
  getProjectCostVsInvoiced,
};