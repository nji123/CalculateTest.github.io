import { COMPREHENSIVE_SERVICE_FEE, PARTICIPATION } from '../config/terms.mjs';
import { ceilInt, floorDown } from './rounding.mjs';

export function sumBy(items, pickValue) {
  return items.reduce((sum, item) => sum + pickValue(item), 0);
}

export function calculateInsuranceBreakdown({
  interestBase,
  serviceFeeCap,
  insRate,
  insServiceRate,
  yearDayCount,
  termDayCount,
  periodNo,
  termQuantity,
}) {
  if (insRate <= 0 || interestBase <= 0 || periodNo <= 0 || termQuantity <= 0) {
    return {
      allInsuranceFee: 0,
      insuranceFee: 0,
      insuranceServiceFee: 0,
    };
  }

  let allInsuranceFee = ceilInt(
    interestBase * floorDown(insRate / yearDayCount, 5) * termDayCount * periodNo * termQuantity,
  );
  if (serviceFeeCap >= 0) {
    allInsuranceFee = Math.min(allInsuranceFee, serviceFeeCap);
  }

  const insuranceServiceFee = ceilInt(allInsuranceFee * insServiceRate);
  return {
    allInsuranceFee,
    insuranceServiceFee,
    insuranceFee: allInsuranceFee - insuranceServiceFee,
  };
}

export function createComprehensiveServiceFeeDetail(amount) {
  return {
    code: COMPREHENSIVE_SERVICE_FEE.code,
    label: COMPREHENSIVE_SERVICE_FEE.label,
    serverField: null,
    participation: PARTICIPATION.NONE,
    amount,
  };
}
