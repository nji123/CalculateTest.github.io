import test from 'node:test';
import assert from 'node:assert/strict';

import { buildComparisonReport, buildTrialRequest } from '../src/core/comparison.mjs';
import { calculateApr } from '../src/core/apr.mjs';
import { buildScenario } from '../src/core/scenario.mjs';

function buildScenarioForComparison() {
  return buildScenario({
    loanAmount: 1200,
    downPayment: 0,
    periods: 2,
    termUnit: 'M',
    irr_r1: 0.24,
    irr_r3: 0.12,
    r1: 0.24,
    r3: 0.12,
    insRate: 0,
    insServiceRate: 0,
    termQuantity: 1,
    compServiceRate: 0,
    feeItems: [],
  });
}

test('buildTrialRequest maps mode into backend DTO shape', () => {
  const scenario = buildScenarioForComparison();
  const request = buildTrialRequest(scenario, 'apr');

  assert.equal(request.loanAmount, 1200);
  assert.equal(request.paymentCalculate, 'NEW_EQUAL_PRINCIPAL_INTEREST_PAYMENT');
  assert.equal(request.serviceFeeRate, 0.12);
});

test('comparison report can fully match backend response', () => {
  const scenario = buildScenarioForComparison();
  const result = calculateApr(scenario);
  const serverJson = {
    data: {
      repaymentItems: result.schedule.map((period) => ({
        principal: period.principal,
        interest: period.interest,
        serviceFee: period.serviceFee,
        repaymentAmount: period.totalPayment,
      })),
    },
  };

  const report = buildComparisonReport(result, serverJson);

  assert.equal(report.allMatch, true);
  assert.equal(report.mismatchCount, 0);
  assert.equal(report.rows.length, 2);
});

test('comparison report highlights differences', () => {
  const scenario = buildScenarioForComparison();
  const result = calculateApr(scenario);
  const serverJson = {
    data: {
      repaymentItems: [
        {
          principal: result.schedule[0].principal,
          interest: result.schedule[0].interest + 1,
          serviceFee: result.schedule[0].serviceFee,
          repaymentAmount: result.schedule[0].totalPayment + 1,
        },
        {
          principal: result.schedule[1].principal,
          interest: result.schedule[1].interest,
          serviceFee: result.schedule[1].serviceFee,
          repaymentAmount: result.schedule[1].totalPayment,
        },
      ],
    },
  };

  const report = buildComparisonReport(result, serverJson);

  assert.equal(report.allMatch, false);
  assert.ok(report.mismatchCount > 0);
  assert.ok(report.rows[0].hasDiff);
});
