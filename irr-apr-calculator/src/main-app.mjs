import { calculateResults } from './core/engine.mjs';
import { createCustomFeeItem, createDefaultFeeItems } from './core/fee-model.mjs';
import { buildScenario } from './core/scenario.mjs';
import { loadCalculatorPageState, saveCalculatorPageState } from './page-state.mjs';
import { formatAmount, formatPercent, formatRate } from './ui/format.mjs';
import { renderFeeRows, renderResults, renderValidation } from './ui/render.mjs';

const COMPARE_PAGE_HREF = './irr-apr-compare.html';
const DEFAULT_API_URL = '';
const LEGACY_API_URL = 'http://localhost:8080/calculate/trial';

const dom = {
  loanAmount: document.getElementById('loanAmount'),
  downPayment: document.getElementById('downPayment'),
  periods: document.getElementById('periods'),
  termUnit: document.getElementById('termUnit'),
  irrR1: document.getElementById('irr_r1'),
  irrR3: document.getElementById('irr_r3'),
  aprR1: document.getElementById('r1'),
  aprR3: document.getElementById('r3'),
  insRate: document.getElementById('insRate'),
  insServiceRate: document.getElementById('insServiceRate'),
  termQuantity: document.getElementById('termQuantity'),
  compServiceRate: document.getElementById('compServiceRate'),
  validationArea: document.getElementById('validation-area'),
  feeBody: document.getElementById('fee-items-body'),
  addFeeButton: document.getElementById('add-fee-item'),
  openCompareButton: document.getElementById('open-compare-page'),
  resultArea: document.getElementById('result-area'),
  modeButtons: Array.from(document.querySelectorAll('[data-mode]')),
  derived: {
    principal: document.getElementById('d-principal'),
    interestBaseFees: document.getElementById('d-interest-base-fees'),
    serviceBaseFees: document.getElementById('d-service-base-fees'),
    interestBaseTotal: document.getElementById('d-interest-base-total'),
    serviceBaseTotal: document.getElementById('d-service-base-total'),
    ydc: document.getElementById('d-ydc'),
    tdc: document.getElementById('d-tdc'),
    aprPerMonthRate: document.getElementById('d-pmr'),
    aprServiceFeeRate: document.getElementById('d-sfr'),
    aprDailyRate: document.getElementById('d-r6'),
  },
};

const persistedState = loadCalculatorPageState();

function normalizeApiUrl(apiUrl) {
  if (!apiUrl || apiUrl === LEGACY_API_URL) {
    return DEFAULT_API_URL;
  }
  return apiUrl;
}

const state = {
  mode: persistedState?.mode ?? 'irr',
  nextCustomIndex: 1,
  feeItems: [],
  persistedComparison: persistedState?.comparison
    ? {
        ...persistedState.comparison,
        apiUrl: normalizeApiUrl(persistedState.comparison.apiUrl),
      }
    : {
        apiUrl: DEFAULT_API_URL,
        serverJson: null,
        serverJsonInput: '',
        expanded: true,
      },
};

function defaultInputs() {
  return {
    loanAmount: '3000000',
    downPayment: '0',
    periods: '12',
    termUnit: 'M',
    irr_r1: '0.4788',
    irr_r3: '0.408',
    r1: '0.4788',
    r3: '0.06',
    insRate: '0',
    insServiceRate: '0',
    termQuantity: '1',
    compServiceRate: '0.01',
  };
}

function normalizeFeeItems(feeItems) {
  const source = Array.isArray(feeItems) && feeItems.length
    ? feeItems
    : createDefaultFeeItems();

  return source.map((feeItem, index) => ({
    ...feeItem,
    id: feeItem.id ?? `fee-${index + 1}`,
    amountInput: feeItem.amountInput ?? String(feeItem.amount ?? 0),
  }));
}

function restoreState() {
  const inputs = {
    ...defaultInputs(),
    ...(persistedState?.inputs ?? {}),
  };

  dom.loanAmount.value = inputs.loanAmount;
  dom.downPayment.value = inputs.downPayment;
  dom.periods.value = inputs.periods;
  dom.termUnit.value = inputs.termUnit;
  dom.irrR1.value = inputs.irr_r1;
  dom.irrR3.value = inputs.irr_r3;
  dom.aprR1.value = inputs.r1;
  dom.aprR3.value = inputs.r3;
  dom.insRate.value = inputs.insRate;
  dom.insServiceRate.value = inputs.insServiceRate;
  dom.termQuantity.value = inputs.termQuantity;
  dom.compServiceRate.value = inputs.compServiceRate;

  state.feeItems = normalizeFeeItems(persistedState?.feeItems);
  state.nextCustomIndex = persistedState?.nextCustomIndex ?? (state.feeItems.length + 1);
}

function activateModeButtons() {
  dom.modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle('active-irr', isActive && button.dataset.mode !== 'apr');
    button.classList.toggle('active-apr', isActive && button.dataset.mode === 'apr');
  });
}

function collectScenario() {
  return buildScenario({
    loanAmount: dom.loanAmount.value,
    downPayment: dom.downPayment.value,
    periods: dom.periods.value,
    termUnit: dom.termUnit.value,
    irr_r1: dom.irrR1.value,
    irr_r3: dom.irrR3.value,
    r1: dom.aprR1.value,
    r3: dom.aprR3.value,
    insRate: dom.insRate.value,
    insServiceRate: dom.insServiceRate.value,
    termQuantity: dom.termQuantity.value,
    compServiceRate: dom.compServiceRate.value,
    feeItems: state.feeItems.map((feeItem) => ({
      code: feeItem.code,
      label: feeItem.label,
      amount: feeItem.amountInput,
      participation: feeItem.participation,
      serverField: feeItem.serverField,
    })),
  });
}

function buildSnapshot() {
  return {
    mode: state.mode,
    nextCustomIndex: state.nextCustomIndex,
    inputs: {
      loanAmount: dom.loanAmount.value,
      downPayment: dom.downPayment.value,
      periods: dom.periods.value,
      termUnit: dom.termUnit.value,
      irr_r1: dom.irrR1.value,
      irr_r3: dom.irrR3.value,
      r1: dom.aprR1.value,
      r3: dom.aprR3.value,
      insRate: dom.insRate.value,
      insServiceRate: dom.insServiceRate.value,
      termQuantity: dom.termQuantity.value,
      compServiceRate: dom.compServiceRate.value,
    },
    feeItems: state.feeItems,
    comparison: state.persistedComparison,
  };
}

function syncDerivedFields(scenario) {
  dom.derived.principal.value = formatAmount(scenario.principal);
  dom.derived.interestBaseFees.value = formatAmount(scenario.interestBaseFees);
  dom.derived.serviceBaseFees.value = formatAmount(scenario.serviceBaseFees);
  dom.derived.interestBaseTotal.value = formatAmount(scenario.interestBase);
  dom.derived.serviceBaseTotal.value = formatAmount(scenario.serviceBase);
  dom.derived.ydc.value = String(scenario.yearDayCount);
  dom.derived.tdc.value = String(scenario.termDayCount);
  dom.derived.aprPerMonthRate.value = formatPercent(scenario.aprPerMonthRate, 6);
  dom.derived.aprServiceFeeRate.value = formatRate(scenario.aprServiceFeeRate);
  dom.derived.aprDailyRate.value = formatRate(scenario.aprDailyRate);
}

function render() {
  const scenario = collectScenario();
  const results = scenario.isValid ? calculateResults(scenario, state.mode) : { irr: null, apr: null };

  activateModeButtons();
  dom.validationArea.innerHTML = renderValidation(scenario.errors);
  dom.feeBody.innerHTML = renderFeeRows(state.feeItems, scenario.periodNo);
  syncDerivedFields(scenario);
  dom.resultArea.innerHTML = renderResults(results, scenario, state.mode);
  saveCalculatorPageState(buildSnapshot());
}

function updateFeeItem(feeId, field, value) {
  state.feeItems = state.feeItems.map((feeItem) => {
    if (feeItem.id !== feeId) {
      return feeItem;
    }
    if (field === 'amount') {
      return { ...feeItem, amountInput: value };
    }
    return { ...feeItem, [field]: value };
  });
}

function addCustomFeeItem() {
  const index = state.nextCustomIndex;
  const feeItem = createCustomFeeItem(index);
  state.feeItems = [
    ...state.feeItems,
    {
      ...feeItem,
      id: `fee-${Date.now()}-${index}`,
      amountInput: String(feeItem.amount),
    },
  ];
  state.nextCustomIndex += 1;
  render();
}

function openComparePage() {
  saveCalculatorPageState(buildSnapshot());
  window.location.href = COMPARE_PAGE_HREF;
}

restoreState();

dom.modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    render();
  });
});

[
  dom.loanAmount,
  dom.downPayment,
  dom.periods,
  dom.termUnit,
  dom.irrR1,
  dom.irrR3,
  dom.aprR1,
  dom.aprR3,
  dom.insRate,
  dom.insServiceRate,
  dom.termQuantity,
  dom.compServiceRate,
].forEach((element) => {
  element.addEventListener('input', render);
  element.addEventListener('change', render);
});

dom.feeBody.addEventListener('input', (event) => {
  const field = event.target.dataset.field;
  const row = event.target.closest('[data-fee-id]');
  if (!field || !row) {
    return;
  }
  updateFeeItem(row.dataset.feeId, field, event.target.value);
  render();
});

dom.feeBody.addEventListener('change', (event) => {
  const field = event.target.dataset.field;
  const row = event.target.closest('[data-fee-id]');
  if (!field || !row) {
    return;
  }
  updateFeeItem(row.dataset.feeId, field, event.target.value);
  render();
});

dom.feeBody.addEventListener('click', (event) => {
  const action = event.target.dataset.action;
  const feeId = event.target.dataset.feeId;
  if (action === 'remove-fee' && feeId) {
    state.feeItems = state.feeItems.filter((feeItem) => feeItem.id !== feeId);
    render();
  }
});

dom.addFeeButton.addEventListener('click', addCustomFeeItem);
dom.openCompareButton.addEventListener('click', openComparePage);

render();
