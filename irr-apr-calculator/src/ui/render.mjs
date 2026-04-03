import { COMPREHENSIVE_SERVICE_FEE, PARTICIPATION_OPTIONS } from '../config/terms.mjs';
import { sumBy } from '../core/common.mjs';
import { shouldParticipateInInterest, shouldParticipateInService } from '../core/fee-model.mjs';
import { escapeHtml, formatAmount, formatPercent, formatRate } from './format.mjs';

function renderErrorList(errors) {
  if (!errors.length) {
    return '';
  }
  return `
    <div class="info-box info-error">
      <b>输入检查</b>
      <ul class="validation-list">
        ${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join('')}
      </ul>
    </div>
  `;
}

function buildParticipationHint(feeItem, periodNo) {
  const baseTargets = [];
  if (shouldParticipateInInterest(feeItem.participation)) {
    baseTargets.push('计息基数');
  }
  if (shouldParticipateInService(feeItem.participation)) {
    baseTargets.push('服务费基数');
  }

  const amortizationText = shouldParticipateInInterest(feeItem.participation)
    ? 'IRR 递增分摊 / APR 均摊'
    : periodNo > 1
      ? `按 ${periodNo} 期均摊，末期补差`
      : '单期计入';

  const baseText = baseTargets.length
    ? `进入 ${baseTargets.join('、')}`
    : '不进入任何计费基数';

  return `${amortizationText}；${baseText}`;
}

function renderParticipationOptions(selectedValue) {
  return PARTICIPATION_OPTIONS.map(
    (option) => `
      <option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>
        ${option.label}
      </option>
    `,
  ).join('');
}

export function renderValidation(errors) {
  return renderErrorList(errors);
}

export function renderFeeRows(feeItems, periodNo) {
  return feeItems.map((feeItem) => `
    <tr class="fee-row" data-fee-id="${feeItem.id}">
      <td>
        <input
          type="text"
          data-field="label"
          value="${escapeHtml(feeItem.label)}"
          placeholder="费用名称"
        >
      </td>
      <td>
        <input
          type="number"
          data-field="amount"
          value="${escapeHtml(feeItem.amountInput)}"
          min="0"
          placeholder="费用总额"
        >
      </td>
      <td>
        <select data-field="participation">
          ${renderParticipationOptions(feeItem.participation)}
        </select>
      </td>
      <td class="fee-note-cell">${escapeHtml(buildParticipationHint(feeItem, periodNo))}</td>
      <td class="fee-action-cell">
        <button type="button" class="btn btn-link danger" data-action="remove-fee" data-fee-id="${feeItem.id}">
          删除
        </button>
      </td>
    </tr>
  `).join('');
}

function renderSummaryCards(result, scenario, accentClass) {
  const items = [
    {
      label: '实际本金',
      value: formatAmount(scenario.principal),
      sub: '借款金额 - 首付',
    },
    {
      label: '计息基数',
      value: formatAmount(result.interestBase),
      sub: `本金 + 参与利息费用 ${formatAmount(scenario.interestBaseFees)}`,
    },
    {
      label: '服务费基数',
      value: formatAmount(result.serviceBase),
      sub: `本金 + 参与服务费费用 ${formatAmount(scenario.serviceBaseFees)}`,
    },
    {
      label: '总利息',
      value: formatAmount(result.totalInterest),
      sub: `${result.mode} 核心利息累计`,
    },
    {
      label: '总服务费',
      value: formatAmount(result.totalServiceFee),
      sub: result.mode === 'APR'
        ? `按服务费基数与 ${formatPercent(result.serviceFeeRate, 4)} 计算`
        : '总费用 - 总利息',
    },
    {
      label: '附加费用',
      value: formatAmount(result.totalExtraFees),
      sub: `费用项 + ${COMPREHENSIVE_SERVICE_FEE.label}`,
    },
    {
      label: '总还款额',
      value: formatAmount(result.totalRepayment),
      sub: '按还款计划逐期求和',
    },
  ];

  return `
    <div class="summary-grid">
      ${items.map((item) => `
        <div class="summary-item ${accentClass}">
          <div class="s-label">${item.label}</div>
          <div class="s-value">${item.value}</div>
          <div class="s-sub">${item.sub}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderIrrFormula(result, scenario) {
  return `
    <div class="formula-box">
      <div><span class="label">计息基数 Bᵢ =</span> 本金(${formatAmount(scenario.principal)}) + 参与利息费用(${formatAmount(scenario.interestBaseFees)}) = <span class="val">${formatAmount(result.interestBase)}</span></div>
      <div><span class="label">月利率 a =</span> floor(IRR_R3 / 12, 12) = <span class="val">${formatRate(result.monthRate, 12)}</span></div>
      <div><span class="label">每期本息 PMT =</span> ceil(floor(Bᵢ × a × (1 + a)^n / ((1 + a)^n - 1), 5)) = <span class="val">${formatAmount(result.pmt)}</span></div>
      <div><span class="label">费用分摊规则 =</span> 参与利息的费用按 IRR 同步递增分摊，不参与利息的费用按期均摊、最后一期补差</div>
      <div><span class="label">总费用 =</span> floor(Bᵢ × IRR_R1 / 360 × 30 × n) = <span class="val">${formatAmount(result.totalLoanFee)}</span></div>
      <div><span class="label">总服务费 =</span> 总费用 - 总利息 = <span class="val">${formatAmount(result.totalServiceFee)}</span></div>
    </div>
  `;
}

function renderAprFormula(result, scenario) {
  return `
    <div class="formula-box formula-blue">
      <div><span class="label">计息基数 Bᵢ =</span> 本金(${formatAmount(scenario.principal)}) + 参与利息费用(${formatAmount(scenario.interestBaseFees)}) = <span class="val-blue">${formatAmount(result.interestBase)}</span></div>
      <div><span class="label">服务费基数 Bₛ =</span> 本金(${formatAmount(scenario.principal)}) + 参与服务费费用(${formatAmount(scenario.serviceBaseFees)}) = <span class="val-blue">${formatAmount(result.serviceBase)}</span></div>
      <div><span class="label">每期本金 =</span> ceil(P / n) = <span class="val-blue">${formatAmount(result.subPrincipal)}</span></div>
      <div><span class="label">每期利息 =</span> ceil(floor(Bᵢ × R3 × termDayCount / yearDayCount, 5)) = <span class="val-blue">${formatAmount(result.subInterest)}</span></div>
      <div><span class="label">每期服务费 =</span> floor(floor(Bₛ × (R1 - R3) × termDayCount / yearDayCount, 5)) = <span class="val-blue">${formatAmount(result.perServiceFee)}</span></div>
      <div><span class="label">费用分摊规则 =</span> 所有费用按期均摊，最后一期补差；参与规则只影响计息基数 / 服务费基数</div>
    </div>
  `;
}

function renderInsurance(result) {
  if (result.allInsuranceFee <= 0) {
    return '';
  }
  return `
    <div class="info-box info-plain">
      <b>保险拆分</b><br>
      总保险费 = ${formatAmount(result.allInsuranceFee)}，
      其中保险成本 = ${formatAmount(result.insuranceFee)}，
      保险渠道费 = ${formatAmount(result.insuranceServiceFee)}
    </div>
  `;
}

function renderAmortizationTable(result, title) {
  const feeColumns = [];
  const feeColumnMap = new Map();
  result.schedule.forEach((period) => {
    period.feeItemDetails.forEach((detail) => {
      if (detail.amount <= 0) {
        return;
      }
      if (!feeColumnMap.has(detail.code)) {
        feeColumnMap.set(detail.code, detail);
        feeColumns.push(detail);
      }
    });
  });

  const feeSums = new Map(feeColumns.map((column) => [column.code, 0]));
  const rows = result.schedule.map((period) => {
    const detailMap = new Map(period.feeItemDetails.map((detail) => [detail.code, detail.amount]));
    feeColumns.forEach((column) => {
      feeSums.set(column.code, (feeSums.get(column.code) ?? 0) + (detailMap.get(column.code) ?? 0));
    });

    return `
      <tr>
        <td>${period.period}</td>
        <td>${formatAmount(period.openBalance)}</td>
        <td>${formatAmount(period.principal)}</td>
        <td>${formatAmount(period.interest)}</td>
        <td>${formatAmount(period.serviceFee)}</td>
        ${feeColumns.map((column) => `<td>${formatAmount(detailMap.get(column.code) ?? 0)}</td>`).join('')}
        <td><b>${formatAmount(period.totalPayment)}</b></td>
        <td>${formatAmount(period.closeBalance)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="amort-wrap">
      <div class="amort-title">${title}</div>
      <div class="amort-scroll">
        <table class="amort-table">
          <thead>
            <tr>
              <th>期次</th>
              <th>期初余额</th>
              <th>本金</th>
              <th>利息</th>
              <th>服务费</th>
              ${feeColumns.map((column) => `<th>${column.label}</th>`).join('')}
              <th>总还款额</th>
              <th>期末余额</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td>合计</td>
              <td>-</td>
              <td>${formatAmount(sumBy(result.schedule, (item) => item.principal))}</td>
              <td>${formatAmount(result.totalInterest)}</td>
              <td>${formatAmount(result.totalServiceFee)}</td>
              ${feeColumns.map((column) => `<td>${formatAmount(feeSums.get(column.code) ?? 0)}</td>`).join('')}
              <td><b>${formatAmount(result.totalRepayment)}</b></td>
              <td>-</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderResultSection(result, scenario) {
  const accentClass = result.mode === 'APR' ? 'blue' : '';
  const formula = result.mode === 'APR'
    ? renderAprFormula(result, scenario)
    : renderIrrFormula(result, scenario);

  return `
    <section class="result-section">
      <div class="section-label">
        ${result.mode} ${result.modeLabel}
        <span class="tag ${result.mode === 'APR' ? 'tag-blue' : 'tag-orange'}">${result.mode === 'APR' ? 'EqualPrincipalInterest' : 'EqualLoanPayment'}</span>
      </div>
      ${formula}
      ${renderSummaryCards(result, scenario, accentClass)}
      ${renderInsurance(result)}
      ${renderAmortizationTable(result, `${result.mode} ${result.modeLabel} 逐期还款计划`)}
    </section>
  `;
}

function renderModeDiff(irrResult, aprResult) {
  const interestDiff = aprResult.totalInterest - irrResult.totalInterest;
  const serviceDiff = aprResult.totalServiceFee - irrResult.totalServiceFee;

  return `
    <div class="section-label">双模式差异</div>
    <div class="formula-box">
      <div><span class="label">总费用差异 =</span> APR ${formatAmount(aprResult.totalLoanFee)} vs IRR ${formatAmount(irrResult.totalLoanFee)}</div>
      <div><span class="label">利息差异 =</span> ${formatAmount(aprResult.totalInterest)} - ${formatAmount(irrResult.totalInterest)} = <span class="val">${formatAmount(interestDiff)}</span></div>
      <div><span class="label">服务费差异 =</span> ${formatAmount(aprResult.totalServiceFee)} - ${formatAmount(irrResult.totalServiceFee)} = <span class="val">${formatAmount(serviceDiff)}</span></div>
      <div><span class="label">结构差异 =</span> IRR 每期本息固定、APR 每期本金与利息固定</div>
    </div>
  `;
}

export function renderResults(results, scenario, mode) {
  if (!scenario.isValid) {
    return `
      <div class="empty-tip">
        先修正输入参数，再查看结果与摊销表。
      </div>
    `;
  }

  const sections = [];
  if ((mode === 'irr' || mode === 'both') && results.irr) {
    sections.push(renderResultSection(results.irr, scenario));
  }
  if ((mode === 'apr' || mode === 'both') && results.apr) {
    sections.push(renderResultSection(results.apr, scenario));
  }
  if (mode === 'both' && results.irr && results.apr) {
    sections.push(renderModeDiff(results.irr, results.apr));
  }
  return sections.join('<hr class="section-divider">');
}

function renderComparisonRows(report) {
  return report.rows.map((row) => `
    <tr class="period-header">
      <td colspan="6">第 ${row.period} 期 ${row.hasDiff ? '<span class="text-danger">存在差异</span>' : ''}</td>
    </tr>
    ${row.items.map((item) => `
      <tr class="${item.match ? '' : 'diff'}">
        <td>${row.period}</td>
        <td>${escapeHtml(item.field)}</td>
        <td>${formatAmount(item.localValue)}</td>
        <td>${formatAmount(item.serverValue)}</td>
        <td class="${item.match ? 'match' : 'mismatch'}">${item.diff > 0 ? '+' : ''}${formatAmount(item.diff)}</td>
        <td class="${item.match ? 'match' : 'mismatch'}">${item.match ? 'OK' : 'DIFF'}</td>
      </tr>
    `).join('')}
  `).join('');
}

export function renderComparisonReport(report, expanded) {
  if (!report) {
    return '<div class="empty-tip">导入服务端返回后，这里会自动生成逐期对账结果。</div>';
  }
  if (report.errorMessage) {
    return `<div class="compare-summary compare-fail">${escapeHtml(report.errorMessage)}</div>`;
  }

  const summaryClass = report.allMatch ? 'compare-pass' : 'compare-fail';
  const summaryText = report.totalChecks === 0
    ? '没有可比较的字段。'
    : `对账结果：${report.totalMatch}/${report.totalChecks} 项一致，${report.allMatch ? '全部通过' : `${report.mismatchCount} 项不一致`}`;

  return `
    ${report.periodWarning ? `<div class="compare-summary compare-fail">${escapeHtml(report.periodWarning)}</div>` : ''}
    <div class="compare-summary ${summaryClass}">
      ${summaryText}
      <button type="button" class="compare-toggle" data-action="toggle-compare">
        ${expanded ? '收起详情' : '展开详情'}
      </button>
    </div>
    <div id="compare-detail" style="display:${expanded ? 'block' : 'none'}">
      <table class="compare-table">
        <thead>
          <tr>
            <th>期次</th>
            <th>字段</th>
            <th>本地计算</th>
            <th>服务端返回</th>
            <th>差异</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          ${renderComparisonRows(report)}
        </tbody>
      </table>
    </div>
  `;
}
