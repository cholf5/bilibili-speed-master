# D-13 直播页（live.bilibili.com）支持评估

> Status: Backlog (P3) — 来源：2026-09-29 代码评审

## Objective

当前 `isManagedVideoPage` 只认 `/video/` 与 `/bangumi/play/`，直播页完全
不在管理范围。直播是否需要倍速/清晰度偏好/快捷键，是产品决策而非纯技术
问题：直播流倍速意义存疑（实时流），但直播**回放**、清晰度偏好、快捷键
（音量/全屏/画中画）可能有价值。先做小范围调研再立实现卡。

## Subtasks

- [ ] 调研：直播页 DOM/播放器结构（flv.js 播放器？原生 video？）、倍速是
      否可用、回放页 URL 结构
- [ ] 产出决策文档：支持范围建议（仅回放？全量？仅快捷键？）+ 工作量估
      算，交维护者拍板
- [ ] （拍板后）拆实现卡：管理页判定、频道识别（主播 roomid 上限映射）、
      widget 复用性评估

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

L（含拍板后的实现；若仅调研产出文档则 S）

## Acceptance Criteria

- 调研文档落在 `docs/`，含截图/选择器证据与建议方案
- 维护者对「做/不做/做多少」有明确结论并回填本卡
- （若实现）直播页满足所定验收标准，且不影响点播页现有行为

## Test Cases

- TC1: （若实现）直播回放页调速 → 生效且刷新后保持
- TC2: （若实现）正播页行为符合拍板结论（不支持则完全不受影响）
- TC3: 点播/番剧页全量回归不受影响

## Related Documents / Designs

- `docs/player-detection.md`、`docs/spec.md`

## Dependent Tasks

- 无

## Notes

- 纯产品探索卡，优先级最低；避免在结论前预写实现
