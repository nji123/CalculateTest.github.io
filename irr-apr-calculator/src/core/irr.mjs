import { calculateInsuranceBreakdown, createComprehensiveServiceFeeDetail, sumBy } from './common.mjs';
import { createFeeDetail, shouldParticipateInInterest } from './fee-model.mjs';
import {
  ceilInt,
  divideRoundUpLikeBigDecimal,
  floorInt,
  floorScale,
  roundInt,
  scaleRoundUpLikeBigDecimal,
} from './rounding.mjs';

export function calculateIrr(scenario) {
  const {
    principal,
    periodNo,
    irr_r1,
    irr_r3,
    interestBase,
    feeItems,
    yearDayCount,
    termDayCount,
    insRate,
    insServiceRate,
    termQuantity,
    compServiceRate,
  } = scenario;

  if (principal <= 0 || periodNo < 1 || irr_r3 <= 0) {
    return null;
  }

  const monthRate = floorScale(irr_r3 / 12, 12);
  const growthFactor = Math.pow(1 + monthRate, periodNo);
  const pmt = scaleRoundUpLikeBigDecimal(
    (interestBase * monthRate * growthFactor) / (growthFactor - 1),
  );
  const comprehensiveServiceFee = roundInt(interestBase * compServiceRate);
  const trackedFeeItems = feeItems.map((feeItem) => ({
    ...feeItem,
    interestBased: shouldParticipateInInterest(feeItem.participation),
  }));

  const schedule = [];
  const distributedFeeTotals = trackedFeeItems.map(() => 0);
  let distributedPrincipal = 0;
  let balance = principal;

  for (let period = 1; period <= periodNo; period += 1) {
    const factor = Math.pow(1 + monthRate, period - 1);
    const principalPayment = divideRoundUpLikeBigDecimal(
      principal * monthRate * factor,
      growthFactor - 1,
    );
    distributedPrincipal += principalPayment;

    const feeItemDetails = trackedFeeItems.map((feeItem, index) => {
      if (feeItem.amount <= 0) {
        return createFeeDetail(feeItem, 0);
      }

      const amount = feeItem.interestBased
        ? divideRoundUpLikeBigDecimal(feeItem.amount * monthRate * factor, growthFactor - 1)
        : ceilInt(feeItem.amount / periodNo);
      distributedFeeTotals[index] += amount;
      return createFeeDetail(feeItem, amount);
    });

    let interestPortionBase = principalPayment;
    feeItemDetails.forEach((detail, index) => {
      if (trackedFeeItems[index]?.interestBased) {
        interestPortionBase += detail.amount;
      }
    });

    const interest = ceilInt(pmt - interestPortionBase);
    feeItemDetails.push(createComprehensiveServiceFeeDetail(comprehensiveServiceFee));
    const extraFees = sumBy(feeItemDetails, (item) => item.amount);

    schedule.push({
      period,
      pmt,
      openBalance: roundInt(balance),
      principal: principalPayment,
      interest,
      serviceFee: 0,
      feeItemDetails,
      extraFees,
      totalPayment: 0,
      closeBalance: roundInt(Math.max(balance - principalPayment, 0)),
    });

    balance -= principalPayment;
  }

  const lastPeriod = schedule[schedule.length - 1];
  let totalFeeGap = 0;

  if (distributedPrincipal > principal) {
    const gapPrincipal = distributedPrincipal - principal;
    lastPeriod.principal -= gapPrincipal;
    lastPeriod.interest += gapPrincipal;
  }

  trackedFeeItems.forEach((feeItem, index) => {
    if (feeItem.amount <= 0) {
      return;
    }
    if (distributedFeeTotals[index] > feeItem.amount) {
      const gap = distributedFeeTotals[index] - feeItem.amount;
      lastPeriod.feeItemDetails[index].amount -= gap;
      if (feeItem.interestBased) {
        lastPeriod.interest += gap;
      }
      totalFeeGap += gap;
    }
  });

  lastPeriod.extraFees -= totalFeeGap;
  lastPeriod.closeBalance = 0;

  const totalInterest = sumBy(schedule, (item) => item.interest);
  const totalLoanFee = floorInt(interestBase * irr_r1 / 360 * 30 * periodNo);
  const totalServiceFee = Math.max(0, totalLoanFee - totalInterest);
  const insurance = calculateInsuranceBreakdown({
    interestBase,
    serviceFeeCap: totalServiceFee,
    insRate,
    insServiceRate,
    yearDayCount,
    termDayCount,
    periodNo,
    termQuantity,
  });

  const perServiceFee = ceilInt(totalServiceFee / periodNo);
  let remainingServiceFee = totalServiceFee;
  schedule.forEach((item, index) => {
    const isLast = index === schedule.length - 1;
    const serviceFee = isLast ? remainingServiceFee : Math.min(perServiceFee, remainingServiceFee);
    item.serviceFee = Math.max(0, serviceFee);
    item.totalPayment = item.principal + item.interest + item.serviceFee + item.extraFees;
    remainingServiceFee -= item.serviceFee;
  });

  const totalRepayment = sumBy(schedule, (item) => item.totalPayment);
  const totalExtraFees = sumBy(schedule, (item) => item.extraFees);
  const serviceFeeRate = interestBase > 0
    ? floorScale((totalServiceFee * 360) / 30 / periodNo / interestBase, 5)
    : 0;

  return {
    mode: 'IRR',
    modeLabel: '等额本息',
    interestBase,
    serviceBase: scenario.serviceBase,
    monthRate,
    pmt,
    schedule,
    totalPrincipal: principal,
    totalInterest,
    totalLoanFee,
    totalServiceFee,
    totalExtraFees,
    totalRepayment,
    serviceFeeRate,
    perServiceFee,
    comprehensiveServiceFee,
    irr_r1,
    irr_r3,
    ...insurance,
  };
}
