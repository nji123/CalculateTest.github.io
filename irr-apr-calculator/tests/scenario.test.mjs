import test from 'node:test';
import assert from 'node:assert/strict';

import { PARTICIPATION } from '../src/config/terms.mjs';
import { buildScenario } from '../src/core/scenario.mjs';

test('scenario separates interest base and service base', () => {
  const scenario = buildScenario({
    loanAmount: 1000,
    downPayment: 0,
    periods: 3,
    termUnit: 'M',
    irr_r1: 0.24,
    irr_r3: 0.12,
    r1: 0.24,
    r3: 0.12,
    insRate: 0,
    insServiceRate: 0,
    termQuantity: 1,
    compServiceRate: 0,
    feeItems: [
      { code: 'both_fee', label: '双参与费用', amount: 100, participation: PARTICIPATION.BOTH },
      { code: 'interest_fee', label: '仅利息费用', amount: 20, participation: PARTICIPATION.INTEREST },
      { code: 'service_fee', label: '仅服务费费用', amount: 50, participation: PARTICIPATION.SERVICE },
      { code: 'plain_fee', label: '普通费用', amount: 30, participation: PARTICIPATION.NONE },
    ],
  });

  assert.equal(scenario.isValid, true);
  assert.equal(scenario.interestBaseFees, 120);
  assert.equal(scenario.serviceBaseFees, 150);
  assert.equal(scenario.interestBase, 1120);
  assert.equal(scenario.serviceBase, 1150);
});

test('scenario reports invalid principal', () => {
  const scenario = buildScenario({
    loanAmount: 100,
    downPayment: 200,
    periods: 3,
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

  assert.equal(scenario.isValid, false);
  assert.ok(scenario.errors.some((message) => message.includes('实际本金')));
});
