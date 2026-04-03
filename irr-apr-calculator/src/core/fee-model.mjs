import {
  FEE_CATALOG,
  PARTICIPATION,
  PARTICIPATION_REQUEST_CODE,
  getFeeDefinition,
  getFeeDefinitionByServerField,
} from '../config/terms.mjs';

function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function normalizeParticipation(value) {
  if (Object.values(PARTICIPATION).includes(value)) {
    return value;
  }
  return PARTICIPATION.NONE;
}

export function createDefaultFeeItems() {
  return FEE_CATALOG.map((definition) => ({
    code: definition.code,
    label: definition.label,
    amount: definition.defaultAmount,
    participation: definition.defaultParticipation,
    serverField: definition.serverField ?? null,
  }));
}

export function createCustomFeeItem(index = 1) {
  return {
    code: `custom_fee_${index}`,
    label: `自定义费用 ${index}`,
    amount: 0,
    participation: PARTICIPATION.NONE,
    serverField: null,
  };
}

export function normalizeFeeItem(feeItem) {
  const definition = getFeeDefinition(feeItem.code);
  const fallbackLabel = definition?.label ?? '未命名费用';
  return {
    code: feeItem.code ?? definition?.code ?? 'custom_fee',
    label: String(feeItem.label ?? fallbackLabel).trim() || fallbackLabel,
    amount: toAmount(feeItem.amount),
    participation: normalizeParticipation(feeItem.participation ?? definition?.defaultParticipation),
    serverField: feeItem.serverField ?? definition?.serverField ?? null,
  };
}

export function normalizeFeeItems(feeItems) {
  return feeItems.map((feeItem) => normalizeFeeItem(feeItem));
}

export function shouldParticipateInInterest(participation) {
  return participation === PARTICIPATION.INTEREST || participation === PARTICIPATION.BOTH;
}

export function shouldParticipateInService(participation) {
  return participation === PARTICIPATION.SERVICE || participation === PARTICIPATION.BOTH;
}

export function sumFeeAmounts(feeItems, predicate) {
  return feeItems.reduce(
    (sum, feeItem) => (predicate(feeItem) ? sum + feeItem.amount : sum),
    0,
  );
}

export function createFeeDetail(feeItem, amount) {
  return {
    code: feeItem.code,
    label: feeItem.label,
    serverField: feeItem.serverField ?? null,
    participation: feeItem.participation,
    amount,
  };
}

export function toTrialFeeItem(feeItem) {
  const normalized = normalizeFeeItem(feeItem);
  return {
    name: normalized.serverField ?? normalized.label,
    amount: normalized.amount,
    participateCalculation: PARTICIPATION_REQUEST_CODE[normalized.participation],
  };
}

export function findFeeByServerField(serverField) {
  return getFeeDefinitionByServerField(serverField);
}
