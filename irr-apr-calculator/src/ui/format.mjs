export function formatAmount(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatRate(value, digits = 5) {
  const numeric = Number(value) || 0;
  return numeric.toFixed(digits);
}

export function formatPercent(value, digits = 4) {
  return `${formatRate((Number(value) || 0) * 100, digits)}%`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
