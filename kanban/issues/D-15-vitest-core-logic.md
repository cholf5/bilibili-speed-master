# D-15 引入 vitest 覆盖核心纯逻辑

> Status: Testing / QA (P3) — 来源：2026-09-29 代码评审

## Objective

项目没有任何自动化测试（AGENTS.md 也要求新增测试时文档化 runner）。速度
调解、时间统计这类核心逻辑目前完全靠手工回归（B 系列卡片可见成本很高）。
引入 vitest，先把**已经是纯函数**的部分测起来，为 D-14 重构和 D-3 校验器
提供护栏。范围克制：不追求 DOM/集成测试。

## Subtasks

- [x] 安装 vitest，`package.json` 增加 `pnpm test` 脚本；AGENTS.md 按其自
      身要求补测试章节（runner、`*.test.ts` 命名约定）
- [x] 覆盖 `src/shared/config.ts`：mergeConfig 的各字段兜底、非法输入、
      （D-3 后）sanitizeChannels
- [x] 覆盖 content 中可提纯的逻辑：`sanitizeChannelName`、
      `getVideoIdFromUrl`、统计增量公式（handleTimeUpdate 的 saved 计算
      提为纯函数后测）
- [x] 覆盖 `src/shared/i18n.ts`：17 语言 key 集合一致性的快照/结构测试
      （防新增文案漏译）
- [ ] D-14 拆分后补充：speed 调解状态机的纯逻辑部分

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

M

## Acceptance Criteria

- `pnpm test` 本地一条命令跑通，CI 可挂（若仓库将来接 CI）
- 上述模块覆盖率核心分支均有断言；故意注入突变（改边界值）能被测试抓住
- AGENTS.md 已按模板更新测试章节

## Test Cases

- TC1: mergeConfig：正常数据 / 空对象 / 各字段类型错 / channels 嵌套坏数
  据
- TC2: sanitizeChannelName：尾随日期、空串、null
- TC3: 统计公式：1.5x/2x/4x 的 saved 值、delta 边界（0、负、>2s）
- TC4: i18n：各语言 key 集合 = en 集合

## Related Documents / Designs

- `AGENTS.md`（Testing Guidelines 章节，需按其要求更新）
- `kanban/issues/D-3-import-sanitization.md`、`D-14-content-modularization.md`

## Dependent Tasks

- 无（是 D-14 的前置护栏，建议先做）

## Notes

- vitest 对 WXT 别名（`@/`）需要在 vitest.config 里同步 resolve.alias

## Implementation Notes (dev)

提前执行（原排在 D-14 前）：为 D-1/D-2 存储层改动提供测试护栏。

**依赖与配置**
- `vitest 5.0.2`（devDependency），`package.json` 新增 `"test": "vitest run"`；未引入其他依赖。
- 新建 `vitest.config.ts`（仓库根，与 wxt.config.ts 并列）：`resolve.alias` 把 `@/` 指到仓库根，
  与 `.wxt/tsconfig.json` 的 paths 一致。根路径通过 `new URL('.', import.meta.url)` 取得——
  `ImportMeta.url` 由 vite/client（经 `.wxt/wxt.d.ts` 引用）提供类型，因此**无需引入 @types/node**；
  `.wxt/tsconfig.json` 的 `skipLibCheck: true` 会抑制 vitest/vite 内部 .d.ts 对 node 内建模块的类型引用报错。
- environment 用默认 node，无 jsdom；测试文件与源码就近放置（`src/shared/*.test.ts`），
  约定已写入 AGENTS.md Testing Guidelines。

**content.ts 提取（纯机械搬移）**
- 新建 `src/shared/video.ts`：`sanitizeChannelName`、`getVideoIdFromUrl` 函数体原样搬移；
  `computeTimeSaved(delta, rate)` 实现公式 `(delta * (rate - 1)) / rate`。
- content.ts 改为从 `@/src/shared/video` import；`handleTimeUpdate` 唯一改动是公式行换成
  `computeTimeSaved(delta, lastPlaybackRate)` 调用。delta<=0、delta>2s、rate<=1 的过滤仍留在
  handleTimeUpdate（零行为变化），纯函数只测公式本身，语义写在测试名里。
- `normalizeAvatarUrl` 及其余重复不在本卡范围，未动。

**i18n**
- `messagesByLocale` 加 `export`（最小改动，运行时唯一消费者仍是 `t`，对打包无影响）。
- 结构测试：每个非 en locale 的 key 集合必须与 en 完全一致（漏译/多译都报错），且所有值非空字符串。

**用例分布**：config 28、video 17、i18n 19，共 64 个用例 / 3 个文件。

**验证结果**
- `pnpm test`：64/64 全绿（3 files passed）。
- `./node_modules/.bin/tsc --noEmit`：0 错误。
- `pnpm build`：成功，`content.js` 正常生成（20.98 kB）。
- 突变验证：临时把 config.ts 的 `SPEED_MAX` 4→5，clamp 用例立即失败（1 failed）；恢复后全绿。

**与卡片的偏差**
- 卡片写「17 语言」，实际 locale 为 18 个（en + 17 种翻译）；测试按「每个非 en locale 的 key
  集合 = en」断言，不硬编码语言数量（Locale 类型已在编译期强制 map 完整性）。
- capChannels「≤ 上限零拷贝直返」用 `toBe`（对象同一性）断言。

**遗留**
- 最后一个 Subtask（D-14 拆分后补 speed 调解状态机纯逻辑测试）待 D-14 完成。
- 未 git commit（按 PM 要求，评审后统一提交）。

## Review Comments (PM, 2026-09-29)

- 通过。content.ts 提取确认为纯机械搬移(两函数原样迁出 + 公式行替换为
  `computeTimeSaved` 调用,调用方过滤逻辑未动),defineContentScript 导出
  形态不变
- i18n 最小导出方案正确(仅 `messagesByLocale` 加 export,注释说明用途)
- 偏差接受:locale 数按"非 en 全等于 en key 集"断言而非硬编码 17,更健壮
- 小建议(不阻塞):vitest.config.ts 的 root 用 URL pathname 解析,Windows
  路径会不兼容;本仓库开发环境为 macOS,留待如需跨平台时改 fileURLToPath

## QA Notes

- PM 独立复跑 `pnpm test`:64/64 全绿(3 文件,~0.2s)
- 测试质量抽查:边界覆盖真实有效(空白名/名字中间的日期/带参 URL/空串)
- 开发已做突变验证(SPEED_MAX 4→5 → 对应用例失败,恢复后全绿),确认护栏
  有捕捉能力
- 待随 D-1/D-2 联调时在真机回归 timeupdate 统计(提取本身零行为变化,
  风险低)
