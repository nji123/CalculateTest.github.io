# IRR / APR Calculator Architecture

这个目录承载的是 `irr-apr-calculator.html` 的模块化底座，目标是把“金融计算”从单页实现里拆出来，形成可复用、可测试、可对账的一层。

## 目录结构

- `styles.css`
  页面样式，和计算逻辑解耦。
- `src/config/terms.mjs`
  术语、费用目录、参与规则、对账字段映射。
- `src/core/rounding.mjs`
  所有 BigDecimal 风格舍入规则集中管理。
- `src/core/scenario.mjs`
  负责把原始输入整理成标准场景对象，并计算派生基数。
- `src/core/apr.mjs`
  APR 等本等息纯计算函数。
- `src/core/irr.mjs`
  IRR 等额本息纯计算函数。
- `src/core/comparison.mjs`
  服务端请求体构建与逐期对账逻辑。
- `src/ui/render.mjs`
  结果、费用表、对账表的渲染函数。
- `src/app.mjs`
  浏览器入口，只负责组装 DOM、状态和事件。
- `tests/*.test.mjs`
  单进程可执行测试，覆盖舍入、场景建模、计算和对账。

## 当前优化点

1. 页面文案改为可读 UTF-8，并清理了内联脚本。
2. 费用参与模型从布尔值升级为四态：
   `none / interest / service / both`
3. 计息基数和服务费基数独立建模。
4. 纯计算与 DOM 副作用彻底分离。
5. 对账逻辑独立成模块，可被页面或批量工具复用。
6. 测试脚本适配当前沙箱，支持单进程执行。

## 测试

在项目根目录执行：

```bash
npm run test:irr-apr
```
