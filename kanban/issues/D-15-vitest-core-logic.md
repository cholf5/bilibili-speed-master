# D-15 引入 vitest 覆盖核心纯逻辑

> Status: Backlog (P3) — 来源：2026-09-29 代码评审

## Objective

项目没有任何自动化测试（AGENTS.md 也要求新增测试时文档化 runner）。速度
调解、时间统计这类核心逻辑目前完全靠手工回归（B 系列卡片可见成本很高）。
引入 vitest，先把**已经是纯函数**的部分测起来，为 D-14 重构和 D-3 校验器
提供护栏。范围克制：不追求 DOM/集成测试。

## Subtasks

- [ ] 安装 vitest，`package.json` 增加 `pnpm test` 脚本；AGENTS.md 按其自
      身要求补测试章节（runner、`*.test.ts` 命名约定）
- [ ] 覆盖 `src/shared/config.ts`：mergeConfig 的各字段兜底、非法输入、
      （D-3 后）sanitizeChannels
- [ ] 覆盖 content 中可提纯的逻辑：`sanitizeChannelName`、
      `getVideoIdFromUrl`、统计增量公式（handleTimeUpdate 的 saved 计算
      提为纯函数后测）
- [ ] 覆盖 `src/shared/i18n.ts`：17 语言 key 集合一致性的快照/结构测试
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
