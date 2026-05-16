const repo = require('./treasury.repository');

// ============================================================================
// Treasury Service - Cash & Bank Balance Management
// ============================================================================

/**
 * Get treasury dashboard data
 */
async function getTreasuryDashboard() {
  const accounts = await repo.getCashAndBankAccounts();
  const recentTransactions = await repo.getRecentTransactions(10);
  const totalCash = await repo.getTotalCashBalance();
  const totalBank = await repo.getTotalBankBalance();

  // Separate cash and bank accounts
  const cashAccounts = accounts.filter(acc => acc.account_code === '12301');
  const bankAccounts = accounts.filter(acc => acc.account_code.startsWith('122'));

  return {
    total_cash: parseFloat(totalCash),
    total_bank: parseFloat(totalBank),
    total_treasury: parseFloat(totalCash) + parseFloat(totalBank),
    cash_accounts: cashAccounts.map(acc => ({
      ...acc,
      current_balance: parseFloat(acc.current_balance)
    })),
    bank_accounts: bankAccounts.map(acc => ({
      ...acc,
      current_balance: parseFloat(acc.current_balance)
    })),
    recent_transactions: recentTransactions.map(trans => ({
      ...trans,
      amount: parseFloat(trans.amount),
      debit_amount: parseFloat(trans.debit_amount),
      credit_amount: parseFloat(trans.credit_amount)
    }))
  };
}

module.exports = {
  getTreasuryDashboard,
};
