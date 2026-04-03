import { buildComparisonReport, buildTrialRequest } from './core/comparison.mjs';
import { calculateResults, getComparisonMode } from './core/engine.mjs';
import { createCustomFeeItem, createDefaultFeeItems } from './core/fee-model.mjs';
import { buildScenario } from './core/scenario.mjs';
import { loadCalculatorPageState, saveCalculatorPageState } from './page-state.mjs';
import { formatAmount, formatPercent, formatRate } from './ui/format.mjs';
import { renderComparisonReport, renderFeeRows, renderResults, renderValidation } from './ui/render.mjs';

const MAIN_PAGE_HREF = './irr-apr-calculator.html';
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
  resultArea: document.getElementById('result-area'),
  compareResult: document.getElementById('compare-result'),
  apiUrl: document.getElementById('api-url'),
  callApiButton: document.getElementById('call-api'),
  serverJson: document.getElementById('server-json'),
  importJsonButton: document.getElementById('import-json'),
  backButton: document.getElementById('back-to-calculator'),
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
  comparison: {
    serverJson: persistedState?.comparison?.serverJson ?? null,
    errorMessage: '',
    expanded: persistedState?.comparison?.expanded ?? true,
    loading: false,
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

  dom.apiUrl.value = normalizeApiUrl(persistedState?.comparison?.apiUrl);
  dom.serverJson.value = persistedState?.comparison?.serverJsonInput
    ?? (persistedState?.comparison?.serverJson
      ? JSON.stringify(persistedState.comparison.serverJson, null, 2)
      : '');

  state.feeItems = normalizeFeeItems(persistedState?.feeItems);
  state.nextCustomIndex = persistedState?.nextCustomIndex ?? (state.feeItems.length + 1);
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
    comparison: {
      apiUrl: normalizeApiUrl(dom.apiUrl.value.trim()),
      serverJson: state.comparison.serverJson,
      serverJsonInput: dom.serverJson.value,
      expanded: state.comparison.expanded,
    },
  };
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

function renderComparisonState(scenario, results) {
  if (state.comparison.loading) {
    dom.compareResult.innerHTML = '<div class="compare-summary compare-pass">正在调用服务端接口，请稍候...</div>';
    return;
  }
  if (state.comparison.errorMessage) {
    dom.compareResult.innerHTML = renderComparisonReport({
      errorMessage: state.comparison.errorMessage,
    }, state.comparison.expanded);
    return;
  }
  if (!state.comparison.serverJson) {
    dom.compareResult.innerHTML = renderComparisonReport(null, state.comparison.expanded);
    return;
  }

  const comparisonMode = getComparisonMode(state.mode);
  const localResult = results[comparisonMode];
  const report = scenario.isValid
    ? buildComparisonReport(localResult, state.comparison.serverJson)
    : { errorMessage: '当前输入存在错误，请先修正后再执行对账。' };
  dom.compareResult.innerHTML = renderComparisonReport(report, state.comparison.expanded);
}

function render() {
  const scenario = collectScenario();
  const results = scenario.isValid ? calculateResults(scenario, state.mode) : { irr: null, apr: null };

  activateModeButtons();
  dom.validationArea.innerHTML = renderValidation(scenario.errors);
  dom.feeBody.innerHTML = renderFeeRows(state.feeItems, scenario.periodNo);
  syncDerivedFields(scenario);
  dom.resultArea.innerHTML = renderResults(results, scenario, state.mode);
  renderComparisonState(scenario, results);
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

async function callServerApi() {
  const scenario = collectScenario();
  if (!scenario.isValid) {
    state.comparison.serverJson = null;
    state.comparison.errorMessage = '当前输入存在错误，请先修正后再调用服务端接口。';
    render();
    return;
  }

  const url = dom.apiUrl.value.trim();
  if (!url) {
    state.comparison.serverJson = null;
    state.comparison.errorMessage = '请输入服务端试算接口地址。';
    render();
    return;
  }

  state.comparison.loading = true;
  state.comparison.errorMessage = '';
  renderComparisonState(scenario, calculateResults(scenario, state.mode));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildTrialRequest(scenario, state.mode)),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const serverJson = await response.json();
    state.comparison.serverJson = serverJson;
    state.comparison.expanded = true;
    dom.serverJson.value = JSON.stringify(serverJson, null, 2);
  } catch (error) {
    state.comparison.serverJson = null;
    state.comparison.errorMessage = `API 调用失败：${error.message}`;
  } finally {
    state.comparison.loading = false;
    render();
  }
}

function importServerJson() {
  const rawJson = dom.serverJson.value.trim();
  if (!rawJson) {
    state.comparison.serverJson = null;
    state.comparison.errorMessage = '请先粘贴服务端返回的 JSON。';
    render();
    return;
  }

  try {
    state.comparison.serverJson = JSON.parse(rawJson);
    state.comparison.errorMessage = '';
    state.comparison.expanded = true;
  } catch (error) {
    state.comparison.serverJson = null;
    state.comparison.errorMessage = `JSON 解析失败：${error.message}`;
  }
  render();
}

function goBackToCalculator() {
  saveCalculatorPageState(buildSnapshot());
  window.location.href = MAIN_PAGE_HREF;
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
dom.callApiButton.addEventListener('click', callServerApi);
dom.importJsonButton.addEventListener('click', importServerJson);
dom.backButton.addEventListener('click', goBackToCalculator);

dom.compareResult.addEventListener('click', (event) => {
  if (event.target.dataset.action === 'toggle-compare') {
    state.comparison.expanded = !state.comparison.expanded;
    render();
  }
});

render();
