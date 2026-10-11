# D-13 直播页（live.bilibili.com）支持评估

> Status: In Review (调研完成，待维护者拍板) — 来源：2026-09-29 代码评审

## Objective

当前 `isManagedVideoPage` 只认 `/video/` 与 `/bangumi/play/`，直播页完全
不在管理范围。直播是否需要倍速/清晰度偏好/快捷键，是产品决策而非纯技术
问题：直播流倍速意义存疑（实时流），但直播**回放**、清晰度偏好、快捷键
（音量/全屏/画中画）可能有价值。先做小范围调研再立实现卡。

## Subtasks

- [x] 调研：直播页 DOM/播放器结构（flv.js 播放器？原生 video？）、倍速是
      否可用、回放页 URL 结构 → 产出 `docs/live-support-evaluation.md`
      §2/§3（代码证据 file:line + 公开资料/直接抓取；正播页具体 DOM 选择器
      未验证，给出 DevTools 验证路径）
- [x] 产出决策文档：支持范围建议（仅回放？全量？仅快捷键？）+ 工作量估
      算，交维护者拍板 → `docs/live-support-evaluation.md`（§4 选项
      A/B/C/D 矩阵 + §5 PM 倾向：正播维持不支持，回放页 `/record/` 全量
      支持是唯一建议考虑实现的方向，仅快捷键价值偏低）
- [ ] （拍板后）拆实现卡：管理页判定、频道识别（主播 roomid 上限映射）、
      widget 复用性评估 → **待拍板后另立实现卡**（开放问题清单见决策文档
      §6，Q1/Q2 为回放卡前置 DevTools 检查）

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
- `docs/live-support-evaluation.md`（本次调研产出）

## Dependent Tasks

- 无

## Notes

- 纯产品探索卡，优先级最低；避免在结论前预写实现

## 调研记录 (2026-10-11)

### 关键发现摘要

1. **无需任何 manifest 改动**：content script `matches` 与
   `host_permissions` 均已是 `*://*.bilibili.com/*`
   （`entrypoints/content.ts:233`、`wxt.config.ts:12`），live 子域已覆盖；
   挡住直播页的只有 `isManagedVideoPage`（`entrypoints/content.ts:69-72`）
   及其扇出的约 6 处判定。
2. **正播（live.bilibili.com/<roomid>）**：官方播放器无倍速入口（二手资料，
   中高置信）；实时流倍速会缓冲/对抗播放器，且「节省时间」统计对直播语义
   不成立（`computeTimeSaved` 只对有终点的点播有意义）；快捷键 j/l/Home
   对直播流有害（seek 越过直播边缘；`seekToStart` 无条件
   `currentTime = 0`，`entrypoints/content.ts:1165-1167`），0-9/End 因
   `duration === Infinity` 天然安全。
3. **回放**：`live.bilibili.com/record/<id>` 路由真实存在（直接抓取返回
   「哔哩哔哩直播回放」标题页；对照不存在路径返回 404，排除 SPA catch-all）；
   主播投稿的回放落为普通 `/video/BV…` 页，天然已被本扩展管理（回放保留
   14 天的官方规则，二手资料中置信）。
4. **频道识别**：直播无 AV/BV 号语义，权威解析层（view API）不适用
   （`src/shared/video.ts:11-19` 只匹配 `/video/`）；roomid ≠ 主播 mid，
   稳健映射需直播 API（`getInfoByRoom`，未验证，DevTools 网络面板可确认）；
   DOM fallback（space 链接）在直播页可能碰巧命中但链接顺序未验证，且正是
   B-2/B-3 污染 bug 的来源层，不建议作权威来源。
5. **widget/清晰度选择器为点播专用**（`.bpx-player-container`、
   `.bpx-player-ctrl-quality-menu-item` 等，`entrypoints/content.ts:35,797`），
   直播/回放页需各自确认容器选择器后才能复用。

### 置信度说明

- **[代码证据]**（file:line，确定性高）：§1/§2 全部代码侧结论。
- **[公开资料]**：flv.js/MSE 内核（github.com/bilibili/flv.js，高置信）；
  `/record/` 路由存在（直接抓取 + 404 对照，高置信）；官方直播无倍速、
  回放 14 天规则（二手搜索资料，中置信）；`/h5/<roomid>` 旧路由（低置信）。
- **[未验证/推断]**：正播页与回放页的具体 DOM 选择器、直播播放器对外部
  `playbackRate` 的重置行为（重连/切清晰度场景）、直播播放器自带快捷键、
  `getInfoByRoom` 接口。均已给出 DevTools 验证路径（决策文档 §6 Q1-Q4）。

### 选项矩阵

| 选项 | 范围 | 工作量 | 价值 | 回归风险 | 拍板前置 |
| --- | --- | --- | --- | --- | --- |
| A 维持不支持 | 文档记录结论 | S | — | 无 | 无 |
| B 仅快捷键子集（音量/全屏/画中画，不含 seek/倍速） | page-kind 化 + keydown 动作过滤 + 挂 video 不调速 | M | 低（B 站自带控件覆盖；自带快捷键未验证） | 中（热路径） | Q3 |
| C 回放页全量支持（`/record/`） | 管理页判定 + 回放频道识别 + widget 选择器 | M | 高（长视频倍速是天然场景） | 低-中（新页面类型） | Q1、Q2 |
| D 正播页也开放倍速 | C 全部 + 直播频道 API + 持久化策略 + 统计排除 + 快捷键查表直播分支 | L | 存疑（官方无倍速入口；对抗播放器） | 高（共享路径 + 对抗行为） | Q1-Q4 |

### PM 倾向（待维护者拍板）

正播维持不支持（A 的范围）；若要实现只做 C（回放页）；不做 B；D 仅在
维护者亲自验证播放器容忍外部倍速后考虑。最终结论回填本卡后另立实现卡。
