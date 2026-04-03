import { calculateInsuranceBreakdown, createComprehensiveServiceFeeDetail, sumBy } from './common.mjs';
import { createFeeDetail } from './fee-model.mjs';
import { ceilInt, floorDown, floorInt, roundInt } from './rounding.mjs';

export function calculateApr(scenario) {
  const {
    principal,
    periodNo,
    r1,
    r3,
    interestBase,
    serviceBase,
    feeItems,
    yearDayCount,
    termDayCount,
    insRate,
    insServiceRate,
    termQuantity,
    compServiceRate,
  } = scenario;

  if (principal <= 0 || periodNo < 1) {
    return null;
  }

  const principalPerPeriod = ceilInt(principal / periodNo);
  const interestPerPeriod = ceilInt(floorDown(interestBase * r3 * termDayCount / yearDayCount, 5));
  const serviceFeeRate = r1 - r3;
  const serviceFeePerPeriod = floorInt(
    floorDown(serviceBase * serviceFeeRate * termDayCount / yearDayCount, 5),
  );
  const totalInterest = interestPerPeriod * periodNo;
  const totalServiceFee = serviceFeePerPeriod * periodNo;
  const totalLoanFee = totalInterest + totalServiceFee;
  const comprehensiveServiceFee = roundInt(interestBase * compServiceRate);
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

  const distributedFees = feeItems.map((feeItem) => {
    if (feeItem.amount <= 0) {
      return { ...feeItem, perPeriod: 0, lastPeriod: 0 };
    }
    const perPeriod = ceilInt(feeItem.amount / periodNo);
    return {
      ...feeItem,
      perPeriod,
      lastPeriod: feeItem.amount - perPeriod * (periodNo - 1),
    };
  });

  const schedule = [];
  let balance = principal;
  let repaidPrincipal = 0;

  for (let period = 1; period <= periodNo; period += 1) {
    const isLast = period === periodNo;
    const principalPayment = isLast ? principal - repaidPrincipal : principalPerPeriod;
    repaidPrincipal += principalPayment;

    const feeItemDetails = distributedFees.map((feeItem) =>
      createFeeDetail(feeItem, isLast ? feeItem.lastPeriod : feeItem.perPeriod),
    );
    feeItemDetails.push(createComprehensiveServiceFeeDetail(comprehensiveServiceFee));
    const extraFees = sumBy(feeItemDetails, (item) => item.amount);

    schedule.push({
      period,
      openBalance: roundInt(balance),
      principal: principalPayment,
      interest: interestPerPeriod,
      serviceFee: serviceFeePerPeriod,
      feeItemDetails,
      extraFees,
      pmt: principalPayment + interestPerPeriod,
      totalPayment: principalPayment + interestPerPeriod + serviceFeePerPeriod + extraFees,
      closeBalance: roundInt(Math.max(balance - principalPayment, 0)),
    });

    balance -= principalPayment;
  }

  const totalExtraFees = sumBy(schedule, (item) => item.extraFees);
  const totalRepayment = sumBy(schedule, (item) => item.totalPayment);

  return {
    mode: 'APR',
    modeLabel: '等本等息',
    interestBase,
    serviceBase,
    subPrincipal: principalPerPeriod,
    subInterest: interestPerPeriod,
    perServiceFee: serviceFeePerPeriod,
    serviceFeeRate,
    schedule,
    totalPrincipal: principal,
    totalInterest,
    totalLoanFee,
    totalServiceFee,
    totalExtraFees,
    totalRepayment,
    comprehensiveServiceFee,
    r1,
    r3,
    ...insurance,
  };
}
