# D-9 快捷键可配置 + options 快捷键清单

> Status: Backlog (P2) — 来源：2026-09-29 代码评审

## Objective

快捷键目前硬编码在 `entrypoints/content.ts` 的 `handleKeydown`（YouTube 风
格 j/k/l、方向键、f/m/c/i 等），既不可自定义，也没有在任何 UI 中露出（仅
`docs/shortcuts.md` 有文档）。两个问题：

1. 与 B 站自身习惯冲突的用户无从调整（如 `<`/`>` 调速、数字键跳转百分比）
2. 新用户发现不了这些快捷键

## Subtasks

- [ ] `src/shared/config.ts`：schema 增加 `global.shortcuts`（action → key
      映射，默认值 = 现行为），mergeConfig 兼容缺省（向后兼容）
- [ ] content：`handleKeydown` 改为查表匹配（含 modifier 组合），键位捕获
      器供 options 录制使用
- [ ] options：快捷键清单区块 + 单条重映射（点击后录制下一个按键，Esc 取
      消，冲突时提示）
- [ ] 提供「恢复默认」按钮；禁用某条快捷键的能力（映射为 null）
- [ ] i18n：新增文案（17 语言同步）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

M

## Acceptance Criteria

- options 中可修改任一快捷键并在视频页立即生效（storage.onChanged 链路）
- 冲突检测：把某键映射到已被占用的 action 时给出提示，不允许保存或要求
  确认交换
- 旧用户无 `global.shortcuts` 字段 → 全部回落默认行为，无迁移感知
- 全部现有默认键位行为与改造前一致

## Test Cases

- TC1: 默认键位逐条回归（对照 docs/shortcuts.md 清单）
- TC2: 重映射 j → p：p 生效、j 不再触发、输入框聚焦时不触发
- TC3: 冲突用例、恢复默认用例
- TC4: 旧 schema 数据加载无报错

## Related Documents / Designs

- `docs/shortcuts.md`（清单来源与更新对象）
- `kanban/issues/A-7-implement-keyboard-shortcuts.md`

## Dependent Tasks

- 无硬依赖；建议在 D-14（content 拆分）之后做，keydown 查表逻辑落在独立
  模块更好测

## Notes

- 注意 IME 与 `event.code`/`event.key` 的取舍：建议记录 `code` 为主、
  `key` 为辅，避免非拉丁键盘布局失效
