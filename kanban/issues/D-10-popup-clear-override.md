# D-10 popup 频道卡支持一键「清除覆盖、跟随全局」

> Status: Backlog (P2) — 来源：2026-09-29 代码评审

## Objective

popup 当前频道卡片（C-1 加入）只能微调速度；当一个频道存在覆盖、用户想
让它回到全局速度时，只能去 options 找到该频道手动删除。高频操作应当场
完成：卡片上提供「跟随全局」按钮，点击删除该频道的覆盖并立即生效。

## Subtasks

- [ ] popup：`channelOverride` 存在时在频道卡 meta 行旁渲染「跟随全局」
      小按钮；无覆盖时不渲染
- [ ] 点击 → 从 `channels` 删除该 channelId（复用 options 的删除语义）→
      content 的 `storage.onChanged` 链路自动 `applySpeedForVideo` 回全局
      速度
- [ ] 卡片 meta 文案随之变为「Following global · x.x」（现有 i18n key 复
      用）
- [ ] i18n：新增按钮文案（17 语言）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- 有覆盖的频道：popup 点「跟随全局」→ 视频速度立即变为全局速度、options
  列表该条消失、卡片 meta 显示 Following global
- 无覆盖的频道：不显示该按钮
- 全速链路与 D-2 的写入路径兼容（若 D-2 已完成则走单写者）

## Test Cases

- TC1: 设置某频道 2x → popup 清除 → 视频回全局速度，options 无该条
- TC2: 清除后频道卡步进器再调速 → 重新生成覆盖（与现行为一致）
- TC3: SPA 切换到另一视频后卡片状态正确

## Related Documents / Designs

- `docs/popup.md`、`docs/plans/2026-09-13-video-widget-design.md`（频道卡
  语义）
- `kanban/issues/B-4-phantom-override-and-popup-current-speed.md`

## Dependent Tasks

- 无

## Notes

- 删除动作建议与 options 的 deleteChannel 抽成共享工具，避免两处实现漂移
