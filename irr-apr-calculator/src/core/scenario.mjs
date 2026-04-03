import { normalizeFeeItems, shouldParticipateInInterest, shouldParticipateInService, sumFeeAmounts } from './fee-model.mjs';
import { floor5 } from './rounding.mjs';

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toPositiveInteger(value) {
  const numeric = Math.trunc(toNumber(value));
  return numeric > 0 ? numeric : 0;
}

export function buildScenario(rawInput) {
  const loanAmount = toNumber(rawInput.loanAmount);
  const downPayment = toNumber(rawInput.downPayment);
  const principal = loanAmount - downPayment;
  const periodNo = toPositiveInteger(rawInput.periods);
  const termUnit = rawInput.termUnit === 'W' ? 'W' : 'M';
  const yearDayCount = termUnit === 'W' ? 365 : 360;
  const termDayCount = termUnit === 'W' ? 7 : 30;
  const r1 = toNumber(rawInput.r1);
  const r3 = toNumber(rawInput.r3);
  const irr_r1 = toNumber(rawInput.irr_r1);
  const irr_r3 = toNumber(rawInput.irr_r3);
  const insRate = toNumber(rawInput.insRate);
  const insServiceRate = toNumber(rawInput.insServiceRate);
  const termQuantity = toPositiveInteger(rawInput.termQuantity) || 1;
  const compServiceRate = toNumber(rawInput.compServiceRate);
  const feeItems = normalizeFeeItems(rawInput.feeItems ?? []);

  const interestBaseFees = sumFeeAmounts(feeItems, (feeItem) =>
    shouldParticipateInInterest(feeItem.participation),
  );
  const serviceBaseFees = sumFeeAmounts(feeItems, (feeItem) =>
    shouldParticipateInService(feeItem.participation),
  );

  const interestBase = principal + interestBaseFees;
  const serviceBase = principal + serviceBaseFees;
  const aprPerMonthRate = r1 / 12;
  const aprDailyRate = floor5(r1 / yearDayCount);
  const aprServiceFeeRate = r1 - r3;
  const totalFeeAmount = sumFeeAmounts(feeItems, () => true);

  const errors = [];
  if (loanAmount <= 0) {
    errors.push('借款金额需要大于 0。');
  }
  if (downPayment < 0) {
    errors.push('首付金额不能为负数。');
  }
  if (principal <= 0) {
    errors.push('实际本金必须大于 0，请检查借款金额和首付金额。');
  }
  if (periodNo < 1) {
    errors.push('借款期数需要是大于 0 的整数。');
  }
  if (termQuantity < 1) {
    errors.push('termQuantity 需要是大于 0 的整数。');
  }
  feeItems.forEach((feeItem) => {
    if (feeItem.amount < 0) {
      errors.push(`费用项「${feeItem.label}」不能为负数。`);
    }
  });

  return {
    loanAmount,
    downPayment,
    principal,
    periodNo,
    termUnit,
    yearDayCount,
    termDayCount,
    r1,
    r3,
    irr_r1,
    irr_r3,
    insRate,
    insServiceRate,
    termQuantity,
    compServiceRate,
    feeItems,
    interestBaseFees,
    serviceBaseFees,
    interestBase,
    serviceBase,
    aprPerMonthRate,
    aprDailyRate,
    aprServiceFeeRate,
    totalFeeAmount,
    errors,
    isValid: errors.length === 0,
  };
}
