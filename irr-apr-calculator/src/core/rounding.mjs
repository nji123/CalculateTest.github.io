export function floorScale(value, scale) {
  const factor = 10 ** scale;
  return Math.floor((value + Number.EPSILON) * factor) / factor;
}

export function floor5(value) {
  return floorScale(value, 5);
}

export function floorDown(value, scale) {
  return floorScale(value, scale);
}

export function ceilInt(value) {
  return Math.ceil(value);
}

export function floorInt(value) {
  return Math.floor(value);
}

export function roundInt(value) {
  return Math.round(value);
}

export function divideRoundUpLikeBigDecimal(numerator, divisor) {
  const divided = floorScale(numerator / divisor, 2);
  const scaled = floorScale(divided, 5);
  return ceilInt(scaled);
}

export function scaleRoundUpLikeBigDecimal(value) {
  return ceilInt(floorScale(value, 5));
}
