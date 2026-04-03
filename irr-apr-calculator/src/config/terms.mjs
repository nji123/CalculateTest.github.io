export const PARTICIPATION = Object.freeze({
  NONE: 'none',
  INTEREST: 'interest',
  SERVICE: 'service',
  BOTH: 'both',
});

export const PARTICIPATION_OPTIONS = Object.freeze([
  { value: PARTICIPATION.BOTH, label: '利息 + 服务费' },
  { value: PARTICIPATION.INTEREST, label: '仅利息' },
  { value: PARTICIPATION.SERVICE, label: '仅服务费' },
  { value: PARTICIPATION.NONE, label: '不参与' },
]);

export const PARTICIPATION_REQUEST_CODE = Object.freeze({
  [PARTICIPATION.NONE]: null,
  [PARTICIPATION.INTEREST]: 1,
  [PARTICIPATION.SERVICE]: 2,
  [PARTICIPATION.BOTH]: 3,
});

export const TERM_UNIT_OPTIONS = Object.freeze([
  { value: 'M', label: '月分期 (360 / 30)' },
  { value: 'W', label: '周分期 (365 / 7)' },
]);

export const MODE_OPTIONS = Object.freeze([
  { value: 'irr', label: 'IRR 等额本息' },
  { value: 'apr', label: 'APR 等本等息' },
  { value: 'both', label: '双模式对比' },
]);

export const COMPREHENSIVE_SERVICE_FEE = Object.freeze({
  code: 'comprehensive_service_fee',
  label: '综合服务费',
});

export const FEE_CATALOG = Object.freeze([
  {
    code: 'fixed_service_fee',
    label: '固定手续费',
    serverField: 'fixedServiceFeeAmount',
    defaultAmount: 199000,
    defaultParticipation: PARTICIPATION.BOTH,
  },
  {
    code: 'goods_insurance',
    label: '商品险',
    serverField: 'goodsInsurance',
    defaultAmount: 0,
    defaultParticipation: PARTICIPATION.BOTH,
  },
  {
    code: 'accident_insurance',
    label: '意外险',
    serverField: 'accidentInsurance',
    defaultAmount: 0,
    defaultParticipation: PARTICIPATION.NONE,
  },
  {
    code: 'accident_insurance_plus',
    label: '意外险 Plus',
    serverField: 'accidentInsurancePlus',
    defaultAmount: 0,
    defaultParticipation: PARTICIPATION.NONE,
  },
  {
    code: 'electronic_insurance',
    label: '家电险',
    serverField: 'electronicInsurance',
    defaultAmount: 0,
    defaultParticipation: PARTICIPATION.NONE,
  },
  {
    code: 'furniture_insurance',
    label: '家具险',
    serverField: 'furnitureInsurance',
    defaultAmount: 0,
    defaultParticipation: PARTICIPATION.NONE,
  },
  {
    code: 'id_stamp_duty_fee',
    label: '印花税',
    serverField: 'idStampDutyFee',
    defaultAmount: 0,
    defaultParticipation: PARTICIPATION.NONE,
  },
  {
    code: 'flexi_pay_fee',
    label: '灵活还款包',
    serverField: 'flexiPayFee',
    defaultAmount: 0,
    defaultParticipation: PARTICIPATION.NONE,
  },
]);

const feeCatalogByCode = new Map(FEE_CATALOG.map((item) => [item.code, item]));
const feeCatalogByServerField = new Map(
  FEE_CATALOG.filter((item) => item.serverField).map((item) => [item.serverField, item]),
);

export function getFeeDefinition(code) {
  return feeCatalogByCode.get(code) ?? null;
}

export function getFeeDefinitionByServerField(serverField) {
  return feeCatalogByServerField.get(serverField) ?? null;
}

export const STANDARD_COMPARE_FIELDS = Object.freeze([
  { key: 'principal', label: '本金' },
  { key: 'interest', label: '利息' },
  { key: 'serviceFee', label: '服务费' },
  { key: 'idStampDutyFee', label: '印花税' },
  { key: 'fixedServiceFeeAmount', label: '固定手续费' },
  { key: 'flexiPayFee', label: '灵活还款包' },
  { key: 'goodsInsurance', label: '商品险' },
  { key: 'furnitureInsurance', label: '家具险' },
  { key: 'electronicInsurance', label: '家电险' },
  { key: 'accidentInsurance', label: '意外险' },
  { key: 'accidentInsurancePlus', label: '意外险 Plus' },
  { key: 'repaymentAmount', label: '总还款额' },
]);

export function getPaymentCalculateCode(mode) {
  return mode === 'apr'
    ? 'NEW_EQUAL_PRINCIPAL_INTEREST_PAYMENT'
    : 'EQUAL_LOAN_PAYMENT';
}
