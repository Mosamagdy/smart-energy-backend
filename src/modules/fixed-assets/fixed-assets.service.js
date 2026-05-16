const { pool, query } = require('../../db');
const repo = require('./fixed-assets.repository');
const coaRepo = require('../coa/coa.repository');
const journalService = require('../journal-entries/journal-entries.service');

// ============================================================================
// Fixed Assets Service - Business Logic Layer
// ============================================================================

const categoryAccountMap = {
  leasehold:  { asset: '11101', accum: '11201', expense: '32301' },
  furniture:  { asset: '11102', accum: '11202', expense: '32302' },
  vehicle:    { asset: '11103', accum: '11203', expense: '32303' },
  machinery:  { asset: '11104', accum: '11204', expense: '32304' },
  computer:   { asset: '11105', accum: '11205', expense: '32305' },
  tools:      { asset: '11106', accum: '11206', expense: '32306' },
  software:   { asset: '11107', accum: '11207', expense: '32306' }
};

const VALID_CATEGORIES = Object.keys(categoryAccountMap);

// ── CRUD passthroughs (repo → service → controller) ────────────────────────
async function getAllAssets(filters = {}) {
  return repo.getAllAssets(filters);
}

async function getAssetById(id) {
  return repo.getAssetById(id);
}

async function updateAsset(id, data) {
  return repo.updateAsset(id, data);
}

async function deleteAsset(id) {
  return repo.deleteAsset(id);
}

// ── Business Logic ──────────────────────────────────────────────────────────

async function createAsset(data, currentUser) {
  const {
    asset_name, asset_name_ar, category,
    purchase_date, purchase_cost, salvage_value, useful_life_years,
    depreciation_method, project_id, notes
  } = data;

  if (!asset_name || !category || !purchase_date || !purchase_cost || !useful_life_years) {
    const err = new Error('جميع الحقول المطلوبة يجب تعبئتها: asset_name, category, purchase_date, purchase_cost, useful_life_years');
    err.statusCode = 400;
    throw err;
  }

  if (!VALID_CATEGORIES.includes(category)) {
    const err = new Error(`الفئة غير صالحة. يجب أن تكون واحدة من: ${VALID_CATEGORIES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const validMethods = ['straight_line', 'declining_balance'];
  const method = depreciation_method || 'straight_line';
  if (!validMethods.includes(method)) {
    const err = new Error('طريقة الإهلاك غير صالحة. يجب أن تكون: straight_line أو declining_balance');
    err.statusCode = 400;
    throw err;
  }

  const accounts    = categoryAccountMap[category];
  const assetNumber = await repo.generateAssetNumber();
  const client_db   = await pool.connect();

  try {
    await client_db.query('BEGIN');

    const asset = await repo.createAsset({
      asset_number: assetNumber,
      asset_name,
      asset_name_ar,
      category,
      coa_account_code:     accounts.asset,
      accum_depr_account:   accounts.accum,
      depr_expense_account: accounts.expense,
      purchase_date,
      purchase_cost:      parseFloat(purchase_cost),
      salvage_value:      parseFloat(salvage_value || 0),
      useful_life_years:  parseInt(useful_life_years),
      depreciation_method: method,
      project_id,
      created_by: currentUser.id,
      notes
    }, client_db);

    const assetAccount = await coaRepo.getAccountByCode(accounts.asset);
    const bankAccount  = await coaRepo.getAccountByCode('12401');

    if (!assetAccount || !bankAccount) {
      const err = new Error('حسابات دليل الحسابات المطلوبة غير موجودة');
      err.statusCode = 500;
      throw err;
    }

    const lines = [
      {
        account_id:    assetAccount.id,
        debit_amount:  parseFloat(purchase_cost),
        credit_amount: 0,
        description:   `شراء أصل ثابت: ${asset_name} (${assetNumber})`
      },
      {
        account_id:    bankAccount.id,
        debit_amount:  0,
        credit_amount: parseFloat(purchase_cost),
        description:   `سداد ثمن أصل ثابت: ${asset_name} (${assetNumber})`
      }
    ];

    await journalService.createJournalEntry({
      description:    `قيد شراء أصل ثابت ${assetNumber} - ${asset_name}`,
      reference_type: 'fixed_asset_purchase',
      reference_id:   asset.id,
      project_id:     asset.project_id
    }, lines, currentUser, client_db);

    await client_db.query('COMMIT');
    return asset;

  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
}

async function calculateMonthlyDepreciation(assetId) {
  const asset = await repo.getAssetById(assetId);

  if (!asset) {
    const err = new Error('الأصل الثابت غير موجود');
    err.statusCode = 404;
    throw err;
  }

  if (asset.status !== 'active') {
    const err = new Error('لا يمكن حساب الإهلاك لأصل غير نشط');
    err.statusCode = 400;
    throw err;
  }

  const purchaseCost    = parseFloat(asset.purchase_cost);
  const salvageValue    = parseFloat(asset.salvage_value);
  const usefulLifeYears = parseInt(asset.useful_life_years);
  const netBookValue    = parseFloat(asset.net_book_value);

  let monthlyDepreciation;

  if (asset.depreciation_method === 'straight_line') {
    monthlyDepreciation = (purchaseCost - salvageValue) / (usefulLifeYears * 12);
  } else {
    const annualRate    = 2 / usefulLifeYears;
    monthlyDepreciation = (netBookValue * annualRate) / 12;
  }

  const totalMonths     = usefulLifeYears * 12;
  const monthsUsed      = monthlyDepreciation > 0
    ? Math.floor(parseFloat(asset.accumulated_depr) / monthlyDepreciation)
    : 0;
  const remainingMonths = Math.max(0, totalMonths - monthsUsed);

  return {
    asset_id:               asset.id,
    asset_number:           asset.asset_number,
    asset_name:             asset.asset_name,
    monthly_amount:         parseFloat(monthlyDepreciation.toFixed(2)),
    annual_amount:          parseFloat((monthlyDepreciation * 12).toFixed(2)),
    method:                 asset.depreciation_method,
    remaining_months:       remainingMonths,
    current_net_book_value: netBookValue,
    salvage_value:          salvageValue
  };
}

async function runMonthlyDepreciation(currentUser) {
  const assets    = await repo.getActiveAssetsForDepreciation();
  const client_db = await pool.connect();

  try {
    await client_db.query('BEGIN');

    let processed        = 0;
    let totalDepreciation = 0;
    let entriesCreated   = 0;
    let skipped          = 0;

    for (const asset of assets) {
      try {
        const depreciation  = await calculateMonthlyDepreciation(asset.id);
        const monthlyAmount = depreciation.monthly_amount;

        if (depreciation.current_net_book_value <= depreciation.salvage_value) {
          skipped++;
          continue;
        }

        const expenseAccount   = await coaRepo.getAccountByCode(asset.depr_expense_account);
        const accumDeprAccount = await coaRepo.getAccountByCode(asset.accum_depr_account);

        if (!expenseAccount || !accumDeprAccount) {
          console.error(`Missing COA accounts for asset ${asset.asset_number}`);
          skipped++;
          continue;
        }

        const lines = [
          {
            account_id:    expenseAccount.id,
            debit_amount:  monthlyAmount,
            credit_amount: 0,
            description:   `مصاريف إهلاك - ${asset.asset_name} (${asset.asset_number})`
          },
          {
            account_id:    accumDeprAccount.id,
            debit_amount:  0,
            credit_amount: monthlyAmount,
            description:   `مجمع إهلاك - ${asset.asset_name} (${asset.asset_number})`
          }
        ];

        await journalService.createJournalEntry({
          description:    `قيد إهلاك شهري للأصل ${asset.asset_number}`,
          reference_type: 'depreciation',
          reference_id:   asset.id,
          project_id:     asset.project_id
        }, lines, currentUser, client_db);

        await repo.recordDepreciation(asset.id, monthlyAmount, client_db);

        processed++;
        totalDepreciation += monthlyAmount;
        entriesCreated++;

      } catch (error) {
        console.error(`Error processing asset ${asset.asset_number}:`, error.message);
        skipped++;
      }
    }

    await client_db.query('COMMIT');

    return {
      processed,
      total_depreciation: parseFloat(totalDepreciation.toFixed(2)),
      entries_created:    entriesCreated,
      skipped,
      run_date:           new Date().toISOString()
    };

  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
}

async function disposeAsset(assetId, disposalData, currentUser) {
  const { disposal_date, disposal_amount } = disposalData;

  if (!disposal_date || disposal_amount === undefined) {
    const err = new Error('تاريخ البيع ومبلغ البيع مطلوبان');
    err.statusCode = 400;
    throw err;
  }

  const asset = await repo.getAssetById(assetId);

  if (!asset) {
    const err = new Error('الأصل الثابت غير موجود');
    err.statusCode = 404;
    throw err;
  }

  if (!['active', 'fully_depreciated'].includes(asset.status)) {
    const err = new Error('لا يمكن التخلص من أصل غير نشط');
    err.statusCode = 400;
    throw err;
  }

  const netBookValue    = parseFloat(asset.net_book_value);
  const disposalAmt     = parseFloat(disposal_amount);
  const gainLoss        = parseFloat((disposalAmt - netBookValue).toFixed(2));
  const client_db       = await pool.connect();

  try {
    await client_db.query('BEGIN');

    const assetAccount     = await coaRepo.getAccountByCode(asset.coa_account_code);
    const accumDeprAccount = await coaRepo.getAccountByCode(asset.accum_depr_account);
    const bankAccount      = await coaRepo.getAccountByCode('12401');

    if (!assetAccount || !accumDeprAccount || !bankAccount) {
      const err = new Error('حسابات دليل الحسابات المطلوبة غير موجودة');
      err.statusCode = 500;
      throw err;
    }

    const lines = [
      {
        account_id:    accumDeprAccount.id,
        debit_amount:  parseFloat(asset.accumulated_depr),
        credit_amount: 0,
        description:   `إزالة مجمع الإهلاك - ${asset.asset_name} (${asset.asset_number})`
      },
      {
        account_id:    bankAccount.id,
        debit_amount:  disposalAmt,
        credit_amount: 0,
        description:   `إيرادات بيع أصل ثابت - ${asset.asset_name} (${asset.asset_number})`
      },
      {
        account_id:    assetAccount.id,
        debit_amount:  0,
        credit_amount: parseFloat(asset.purchase_cost),
        description:   `إزالة تكلفة الأصل - ${asset.asset_name} (${asset.asset_number})`
      }
    ];

    if (gainLoss > 0) {
      const otherIncomeAccount = await coaRepo.getAccountByCode('42');
      if (!otherIncomeAccount) {
        const err = new Error('حساب الإيرادات الأخرى غير موجود');
        err.statusCode = 500;
        throw err;
      }
      lines.push({
        account_id:    otherIncomeAccount.id,
        debit_amount:  0,
        credit_amount: gainLoss,
        description:   `ربح بيع أصل ثابت - ${asset.asset_name} (${asset.asset_number})`
      });
    } else if (gainLoss < 0) {
      const adminExpenseAccount = await coaRepo.getAccountByCode('32');
      if (!adminExpenseAccount) {
        const err = new Error('حساب المصاريف الإدارية غير موجود');
        err.statusCode = 500;
        throw err;
      }
      lines.push({
        account_id:    adminExpenseAccount.id,
        debit_amount:  Math.abs(gainLoss),
        credit_amount: 0,
        description:   `خسارة بيع أصل ثابت - ${asset.asset_name} (${asset.asset_number})`
      });
    }

    await journalService.createJournalEntry({
      description:    `قيد التخلص من الأصل ${asset.asset_number}`,
      reference_type: 'asset_disposal',
      reference_id:   asset.id,
      project_id:     asset.project_id
    }, lines, currentUser, client_db);

    const updatedAsset = await repo.disposeAsset(assetId, {
      disposal_date,
      disposal_amount:    disposalAmt,
      disposal_gain_loss: gainLoss
    }, client_db);

    await client_db.query('COMMIT');
    return updatedAsset;

  } catch (error) {
    await client_db.query('ROLLBACK');
    throw error;
  } finally {
    client_db.release();
  }
}

async function getDepreciationSchedule(assetId) {
  const asset = await repo.getAssetById(assetId);

  if (!asset) {
    const err = new Error('الأصل الثابت غير موجود');
    err.statusCode = 404;
    throw err;
  }

  const purchaseCost    = parseFloat(asset.purchase_cost);
  const salvageValue    = parseFloat(asset.salvage_value);
  const usefulLifeYears = parseInt(asset.useful_life_years);
  const purchaseDate    = new Date(asset.purchase_date);

  let schedule       = [];
  let currentAccumDepr = 0;
  let currentNBV     = purchaseCost;

  for (let year = 1; year <= usefulLifeYears; year++) {
    let yearlyDepreciation;

    if (asset.depreciation_method === 'straight_line') {
      yearlyDepreciation = (purchaseCost - salvageValue) / usefulLifeYears;
    } else {
      const annualRate   = 2 / usefulLifeYears;
      yearlyDepreciation = currentNBV * annualRate;
      if (currentNBV - yearlyDepreciation < salvageValue) {
        yearlyDepreciation = currentNBV - salvageValue;
      }
    }

    yearlyDepreciation  = parseFloat(yearlyDepreciation.toFixed(2));
    currentAccumDepr   += yearlyDepreciation;
    currentNBV         -= yearlyDepreciation;

    schedule.push({
      year,
      year_start:       new Date(purchaseDate.getFullYear() + year - 1, purchaseDate.getMonth(), purchaseDate.getDate()),
      year_end:         new Date(purchaseDate.getFullYear() + year, purchaseDate.getMonth(), purchaseDate.getDate() - 1),
      opening_nbv:      parseFloat((currentNBV + yearlyDepreciation).toFixed(2)),
      depreciation:     yearlyDepreciation,
      closing_nbv:      parseFloat(currentNBV.toFixed(2)),
      accumulated_depr: parseFloat(currentAccumDepr.toFixed(2))
    });
  }

  return {
    asset_id:            asset.id,
    asset_number:        asset.asset_number,
    asset_name:          asset.asset_name,
    purchase_cost:       purchaseCost,
    salvage_value:       salvageValue,
    useful_life_years:   usefulLifeYears,
    depreciation_method: asset.depreciation_method,
    schedule
  };
}

module.exports = {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  calculateMonthlyDepreciation,
  runMonthlyDepreciation,
  disposeAsset,
  getDepreciationSchedule,
  categoryAccountMap,
  VALID_CATEGORIES
};