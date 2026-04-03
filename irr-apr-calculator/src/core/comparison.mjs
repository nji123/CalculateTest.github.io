import { STANDARD_COMPARE_FIELDS, getPaymentCalculateCode } from '../config/terms.mjs';
import { toTrialFeeItem } from './fee-model.mjs';

export function buildTrialRequest(scenario, mode) {
  const requestMode = mode === 'both' ? 'apr' : mode;
  return {
    loanAmount: scenario.principal,
    loanTerm: scenario.periodNo,
    interestRate: requestMode === 'apr' ? scenario.r3 : scenario.irr_r3,
    serviceFeeRate: requestMode === 'apr'
      ? scenario.r1 - scenario.r3
      : scenario.irr_r1 - scenario.irr_r3,
    paymentCalculate: getPaymentCalculateCode(requestMode),
    termUnit: scenario.termUnit,
    termQuantity: scenario.termQuantity,
    feeItemList: scenario.feeItems
      .filter((feeItem) => feeItem.amount > 0)
      .map((feeItem) => toTrialFeeItem(feeItem)),
    vatPayFlag: false,
    insuranceFlag: false,
  };
}

export function extractServerItems(serverJson) {
  if (serverJson?.data?.repaymentItems) {
    return serverJson.data.repaymentItems;
  }
  if (serverJson?.repaymentItems) {
    return serverJson.repaymentItems;
  }
  if (Array.isArray(serverJson?.data)) {
    return serverJson.data;
  }
  if (Array.isArray(serverJson)) {
    return serverJson;
  }
  return null;
}

function getLocalFieldValue(period, fieldKey) {
  if (fieldKey === 'repaymentAmount') {
    return period.totalPayment ?? 0;
  }
  if (fieldKey === 'principal' || fieldKey === 'interest' || fieldKey === 'serviceFee') {
    return period[fieldKey] ?? 0;
  }
  const detail = period.feeItemDetails.find((feeItem) => feeItem.serverField === fieldKey);
  return detail?.amount ?? 0;
}

function getLocalFeeAmountByLabel(period, feeLabel) {
  const detail = period.feeItemDetails.find((feeItem) => feeItem.label === feeLabel);
  return detail?.amount ?? 0;
}

export function buildComparisonReport(localResult, serverJson) {
  const serverItems = extractServerItems(serverJson);
  if (!serverItems || serverItems.length === 0) {
    return {
      errorMessage: 'JSON 中未找到 repaymentItems，无法执行对账。',
    };
  }
  if (!localResult?.schedule?.length) {
    return {
      errorMessage: '当前页面没有可用于对账的本地还款计划。',
    };
  }

  const periodCount = Math.min(localResult.schedule.length, serverItems.length);
  const rows = [];
  let totalChecks = 0;
  let totalMatch = 0;

  for (let index = 0; index < periodCount; index += 1) {
    const localPeriod = localResult.schedule[index];
    const serverPeriod = serverItems[index];
    const items = [];

    STANDARD_COMPARE_FIELDS.forEach((field) => {
      const localValue = getLocalFieldValue(localPeriod, field.key);
      const serverValue = serverPeriod[field.key] == null ? 0 : Number(serverPeriod[field.key]);

      if (localValue === 0 && serverValue === 0) {
        return;
      }

      const diff = localValue - serverValue;
      const match = diff === 0;
      totalChecks += 1;
      if (match) {
        totalMatch += 1;
      }
      items.push({
        field: field.label,
        localValue,
        serverValue,
        diff,
        match,
      });
    });

    const unconventionalFees = serverPeriod.unconventionalFeeDTOList ?? [];
    unconventionalFees.forEach((feeItem) => {
      const feeLabel = feeItem.feeName || feeItem.name || '未知费用';
      const serverValue = Number(feeItem.feeAmount ?? feeItem.amount ?? 0);
      const localValue = getLocalFeeAmountByLabel(localPeriod, feeLabel);

      if (localValue === 0 && serverValue === 0) {
        return;
      }

      const diff = localValue - serverValue;
      const match = diff === 0;
      totalChecks += 1;
      if (match) {
        totalMatch += 1;
      }
      items.push({
        field: feeLabel,
        localValue,
        serverValue,
        diff,
        match,
      });
    });

    rows.push({
      period: index + 1,
      items,
      hasDiff: items.some((item) => !item.match),
    });
  }

  const periodWarning = localResult.schedule.length !== serverItems.length
    ? `期数不一致：本地 ${localResult.schedule.length} 期，服务端 ${serverItems.length} 期，当前只比较前 ${periodCount} 期。`
    : '';

  return {
    rows,
    totalChecks,
    totalMatch,
    mismatchCount: totalChecks - totalMatch,
    allMatch: totalMatch === totalChecks && !periodWarning,
    periodWarning,
    checkedPeriods: periodCount,
  };
}
