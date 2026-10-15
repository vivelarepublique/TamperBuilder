# 六框架 Component Lab 最终实现报告

## 最终结论

`.agents/tasks/review.json` 已确认 `verdict=APPROVED`；引用复审文档为 `.agents/tasks/six-framework-components/2026-10-15-232529-review.md`。最终自动化验收全部通过，未启动 Vite/dev server。

**浏览器 paint / Tampermonkey 真机验收仍由用户验证（TBD）**。

## 三项 findings 修复摘要

1. **宿主页样式污染与页面几何**：在 `Showcase.css` 的 rail/dialog 作用域内恢复语义元素基线，避免宿主页普通规则破坏布局；新增真实 headless Chromium 的 1440px/390px 几何 oracle，验证无横向溢出且按钮与 choice 激活区域不小于 44×44。
2. **六框架 Task/Render 合同缺口**：共享 harness 矩阵覆盖 All/Open/Done + search 下的 Clear completed、无 completed handler no-op、焦点恢复，以及已有成功结果进入 `startHidden` 时保留 rows/metrics 且不创建 runner/AbortController。
3. **choice indicator 可移植性**：保留原生 radio/checkbox DOM、键盘与无障碍行为，使用 input 自身 background layers 绘制 checkbox/radio 状态；覆盖 checked、focus-visible、disabled、六框架统一 class，并禁止伪元素方案回归。

复审另记录两个非阻断后续项：布局测试环境需提供 Chrome/Edge/Chromium 或 `CHROME_PATH`；真实 Tampermonkey 宿主页九行矩阵仍为 TBD。

## 新增/变更文件

本实现范围为 `9a77526083942374b40092506ce960e11337e79d^..ac4cf35e92afbd8143ae52c0a31c13cfe4fc07f7`。

- **公共能力与样式**：`src/common/components/{benchmark,dialog,frameworkMount,workbench}.ts`、`src/common/utils/elementAdvanced.ts`、`src/assets/css/components/Showcase.css`、`src/assets/css/global.css`、`src/index.ts`。
- **Vue**：`src/vue/App.vue`、`index.ts`、`components/{Modal,RenderLab,TaskWorkbench}.vue`、`store/workbenchStore.ts`；移除旧示例组件、旧 store 与框架局部 CSS。
- **React**：`src/react/App.tsx`、`index.tsx`、`components/{Modal,RenderLab,TaskWorkbench}.tsx`、`store/workbenchStore.ts`；移除旧示例组件、旧 store 与框架局部 CSS。
- **Preact**：`src/preact/App.tsx`、`index.tsx`、`components/{Modal,RenderLab,TaskWorkbench}.tsx`、`signal/rootModel.ts`；移除旧示例组件、旧 signal 与框架局部 CSS。
- **Lit**：`src/lit/{index,lit-app}.ts`、`components/{lit-modal,lit-render-lab,lit-task-workbench}.ts`、`context/workbench-context.ts`；移除旧示例组件、旧 context 与框架局部 CSS。
- **Svelte**：`src/svelte/App.svelte`、`index.ts`、`components/{Modal,RenderLab,TaskWorkbench}.svelte`、`store/{benchmark,workbench}.svelte.ts`；移除旧示例组件、旧 store 与框架局部 CSS。
- **Solid**：`src/solid/App.tsx`、`index.tsx`、`components/{Modal,RenderLab,TaskWorkbench}.tsx`、`signal/rootModel.ts`；移除旧示例组件、旧 signal 与框架局部 CSS。
- **构建与配置**：`plugin/vite-plugin-framework-entry/index.ts`、`scripts/verify-framework-selection.mjs`、`eslint.config.js`、`tsconfig.eslint.json`、`vitest.config.ts`、`README.md`。
- **测试**：`tests/assets/showcase-style.test.ts`、`tests/common/{benchmark,dialog,element-advanced,workbench}.test.ts`、`tests/framework/component-lab-{contract,matrix}.test.ts`、`tests/framework/harness/{createHarness,lit,preact,react,solid,svelte,types,vue}.ts`、`tests/setup/native-dialog.ts`、`tests/fixtures/config/svelte-only.yaml`，以及更新的 framework-entry 测试。
- **清理**：删除六框架旧 Counter/Benchmark/VectorImage/WindowEvent 示例、旧状态模块和重复局部样式文件；删除被 `Showcase.css` 取代的旧公共组件 CSS。

## 最终验证命令与结果

| 命令 | 结果 |
| --- | --- |
| `npm ci` | PASS；安装 581 packages，审计 582 packages，0 vulnerabilities。仅输出既有 deprecated/install-scripts 提示。 |
| `npm audit --audit-level=high` | PASS；0 vulnerabilities。 |
| `npm run lint` | PASS；ESLint 0 warnings/errors。 |
| `npm run typecheck` | PASS；全部 TS/Vue/Svelte 配置通过，Svelte 0 errors/0 warnings。 |
| `npm test` | PASS；20 files、220 tests 全部通过；含 1440px 与 390px Chromium 页面几何测试。 |
| `npm run verify:native-config` | PASS；native config 构建完成，确认单一 userscript、无 CSS assets、JavaScript 语法有效。 |
| `npm run verify:frameworks` | PASS；showcase 495710 bytes、Vue-only 185619 bytes、Svelte-only 134059 bytes；未选源码与运行时均不存在。 |
| `npm run build` | PASS；标准模式生成单一 `release/tamper-builder.user.js`。 |
| `npm run build:primitive` | PASS；primitive 模式生成单一 `release/tamper-builder.user.js`。 |
| `npm run build:minify` | PASS；minify 模式生成单一 `release/tamper-builder.user.js`。 |
| `npm run check` | PASS；audit、lint、typecheck、20 files/220 tests、native config、Vue-only/Svelte-only 隔离构建及三模式 `verify:output` 全部通过。三种模式均确认单一 userscript、无 CSS assets、JavaScript 语法有效。 |

`verify:frameworks` 明确完成 Vue-only 与 Svelte-only 隔离构建；`npm run check` 内的 `verify:builds` 对 standard、primitive、minify 三种模式逐一运行 `verify:output`，确认每种模式均只有一个 userscript 且语法有效。

## 实现提交与 author

- `9a77526083942374b40092506ce960e11337e79d` — Rex `<vivelarepublique@qq.com>` — `feat: Add component lab foundations`
- `e0b28ae2d2653874a3b823978e7c8154ec326c71` — Rex `<vivelarepublique@qq.com>` — `feat: Add six framework component labs`
- `ecf70f7a208cecff4144738fe3a8d8bac0d2f067` — Rex `<vivelarepublique@qq.com>` — `test: Add six-framework component contract`
- `519f26bef3461ce0c6fd2af0e526d37ba56e3f11` — Rex `<vivelarepublique@qq.com>` — `fix: Harden component lab contracts`
- `98899ffb38df79762b2651e974fdac6fc8450a28` — Rex `<vivelarepublique@qq.com>` — `test: Cover native Enter submission`
- `22424320aecc17c16450b97738925be2882ed0ed` — Rex `<vivelarepublique@qq.com>` — `fix: Harden benchmark and control styles`
- `19c7bd4423a65a12d68b2833962f92b53a01735e` — Rex `<vivelarepublique@qq.com>` — `fix: Complete Component Lab contracts`
- `ac4cf35e92afbd8143ae52c0a31c13cfe4fc07f7` — Rex `<vivelarepublique@qq.com>` — `test: Complete Component Lab contracts`

`git log --format='%H %an <%ae>' -n 20` 已确认本任务相关新提交 author 均为 `Rex <vivelarepublique@qq.com>`。本轮未 push、未创建 CR、未改写已有提交、未修改 git config。

## 待用户验收

**浏览器 paint / Tampermonkey 真机验收仍由用户验证（TBD）**。请后续依据 `.agents/tasks/six-framework-components/browser-acceptance.md` 完成真实宿主页/浏览器矩阵。
