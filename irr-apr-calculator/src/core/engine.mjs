import { calculateApr } from './apr.mjs';
import { calculateIrr } from './irr.mjs';

export function calculateResults(scenario, mode) {
  const results = { irr: null, apr: null };

  if (mode === 'irr' || mode === 'both') {
    results.irr = calculateIrr(scenario);
  }
  if (mode === 'apr' || mode === 'both') {
    results.apr = calculateApr(scenario);
  }

  return results;
}

export function getComparisonMode(mode) {
  return mode === 'both' ? 'apr' : mode;
}
