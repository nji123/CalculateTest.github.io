import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ceilInt,
  divideRoundUpLikeBigDecimal,
  floorScale,
  scaleRoundUpLikeBigDecimal,
} from '../src/core/rounding.mjs';

test('floorScale keeps deterministic decimal truncation', () => {
  assert.equal(floorScale(12.345678, 5), 12.34567);
  assert.equal(floorScale(0.408 / 12, 12), 0.034);
});

test('divideRoundUpLikeBigDecimal matches legacy divide -> down -> up chain', () => {
  assert.equal(divideRoundUpLikeBigDecimal(100, 3), 34);
  assert.equal(divideRoundUpLikeBigDecimal(1200, 12), 100);
});

test('scaleRoundUpLikeBigDecimal rounds up after flooring to 5 decimals', () => {
  assert.equal(scaleRoundUpLikeBigDecimal(123.000011), 124);
  assert.equal(scaleRoundUpLikeBigDecimal(123), 123);
  assert.equal(ceilInt(12.01), 13);
});
