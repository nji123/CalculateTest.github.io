import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateApr } from '../src/core/apr.mjs';
import { calculateIrr } from '../src/core/irr.mjs';
import { buildScenario } from '../src/core/scenario.mjs';

function buildBaseScenario(overrides = {}) {
  return buildScenario({
    loanAmount: 1200,
    downPayment: 0,
    periods: 12,
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
    ...overrides,
  });
}

test('APR calculator produces stable baseline repayment plan', () => {
  const result = calculateApr(buildBaseScenario());

  assert.ok(result);
  assert.equal(result.subPrincipal, 100);
  assert.equal(result.subInterest, 12);
  assert.equal(result.perServiceFee, 12);
  assert.equal(result.totalInterest, 144);
  assert.equal(result.totalServiceFee, 144);
  assert.equal(result.totalRepayment, 1488);
  assert.equal(result.schedule.length, 12);
  assert.equal(result.schedule.at(-1).closeBalance, 0);
});

test('IRR calculator keeps one-period case easy to verify', () => {
  const result = calculateIrr(buildBaseScenario({ periods: 1 }));

  assert.ok(result);
  assert.equal(result.pmt, 1212);
  assert.equal(result.totalInterest, 12);
  assert.equal(result.totalServiceFee, 12);
  assert.equal(result.totalRepayment, 1224);
  assert.equal(result.schedule[0].principal, 1200);
  assert.equal(result.schedule[0].closeBalance, 0);
});
