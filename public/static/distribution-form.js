// Auto-calculation helpers
function sumFields(fieldIds) {
  return fieldIds.reduce((sum, id) => {
    const el = document.getElementById(id);
    return sum + (parseFloat(el?.value) || 0);
  }, 0);
}

function formatCurrency(value) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function recalculate() {
  // --- Prior Year Financials ---
  const priorAssetFields = [
    'prior_cash', 'prior_ic_receivables', 'prior_other_current',
    'prior_fixed', 'prior_intangible', 'prior_other_noncurrent'
  ];
  const priorTotalAssets = sumFields(priorAssetFields);
  document.getElementById('prior_total_assets').value = formatCurrency(priorTotalAssets);

  const priorEquityFields = [
    'prior_share_capital', 'prior_share_premium', 'prior_legal_reserves',
    'prior_retained_earnings', 'prior_other_reserves'
  ];
  const priorTotalEquity = sumFields(priorEquityFields);
  document.getElementById('prior_total_equity').value = formatCurrency(priorTotalEquity);

  const priorLiabilityFields = [
    'prior_bank_short', 'prior_bank_long', 'prior_ic_payables',
    'prior_other_liabilities', 'prior_contingent'
  ];
  const priorTotalLiabilities = sumFields(priorLiabilityFields);
  const priorTotalLiabEquity = priorTotalLiabilities + priorTotalEquity;
  document.getElementById('prior_total_liab_equity').value = formatCurrency(priorTotalLiabEquity);

  // Prior Net Working Capital = Current Assets - Current Liabilities
  const priorCurrentAssets = sumFields(['prior_cash', 'prior_ic_receivables', 'prior_other_current']);
  const priorCurrentLiab = sumFields(['prior_bank_short', 'prior_ic_payables', 'prior_other_liabilities']);
  document.getElementById('prior_nwc').value = formatCurrency(priorCurrentAssets - priorCurrentLiab);

  // --- Current Year Financials ---
  const currentAssetFields = [
    'current_cash', 'current_ic_receivables', 'current_other_current',
    'current_fixed', 'current_intangible', 'current_other_noncurrent'
  ];
  const currentTotalAssets = sumFields(currentAssetFields);
  document.getElementById('current_total_assets').value = formatCurrency(currentTotalAssets);

  const currentEquityFields = [
    'current_share_capital', 'current_share_premium', 'current_legal_reserves',
    'current_retained_earnings', 'current_other_reserves'
  ];
  const currentTotalEquity = sumFields(currentEquityFields);
  document.getElementById('current_total_equity').value = formatCurrency(currentTotalEquity);

  const currentLiabilityFields = [
    'current_bank_short', 'current_bank_long', 'current_ic_payables',
    'current_other_liabilities', 'current_contingent'
  ];
  const currentTotalLiabilities = sumFields(currentLiabilityFields);
  const currentTotalLiabEquity = currentTotalLiabilities + currentTotalEquity;
  document.getElementById('current_total_liab_equity').value = formatCurrency(currentTotalLiabEquity);

  // Current Net Working Capital
  const currentCurrentAssets = sumFields(['current_cash', 'current_ic_receivables', 'current_other_current']);
  const currentCurrentLiab = sumFields(['current_bank_short', 'current_ic_payables', 'current_other_liabilities']);
  document.getElementById('current_nwc').value = formatCurrency(currentCurrentAssets - currentCurrentLiab);

  // --- Free Cash Flow ---
  const fcfFields = ['net_op_cashflow', 'net_nonop_cashflow', 'net_investments'];
  const freeCashFlow = sumFields(fcfFields);
  document.getElementById('free_cash_flow').value = formatCurrency(freeCashFlow);
}

// Attach listeners on load
document.addEventListener('DOMContentLoaded', () => {
  const allInputs = document.querySelectorAll('input[type="number"]');
  allInputs.forEach(input => {
    if (!input.readOnly) {
      input.addEventListener('input', recalculate);
    }
  });

  // Form submission
  document.getElementById('distribution-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    console.log('Form data:', data);
    alert('Form submitted successfully! In a real Microsoft Forms integration, this data would be sent to your configured endpoint.');
  });
});
