# D-10 popup 频道卡支持一键「清除覆盖、跟随全局」

> Status: Testing / QA (dev + 独立审查通过（P2-1 ru 措辞、P2-3 aria-live 已由 PM 落实；P2-2 窄窗长文案留 QA）；待用户真机验收 TC1-TC3) — 来源：2026-09-29 代码评审

## Objective

popup 当前频道卡片（C-1 加入）只能微调速度；当一个频道存在覆盖、用户想
让它回到全局速度时，只能去 options 找到该频道手动删除。高频操作应当场
完成：卡片上提供「跟随全局」按钮，点击删除该频道的覆盖并立即生效。

## Subtasks

- [x] popup：`channelOverride` 存在时在频道卡 meta 行旁渲染「跟随全局」
      小按钮；无覆盖时不渲染
- [x] 点击 → 从 `channels` 删除该 channelId（复用 options 的删除语义）→
      content 的 `storage.onChanged` 链路自动 `applySpeedForVideo` 回全局
      速度
- [x] 卡片 meta 文案随之变为「Following global · x.x」（现有 i18n key 复
      用）
- [x] i18n：新增按钮文案（17 语言）

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

## 开发记录 (2026-10-11)

### 改动清单

- `src/shared/config.ts`：新增共享纯函数 `removeChannelOverride(channels, channelId)`（options 删除与 popup 清除共用同一实现，落实 Notes 的「抽共享工具」要求）
- `entrypoints/popup/App.tsx`：`hasChannelOverride` 判定、`clearChannelOverride` 处理器（走 updateConfig 单写者）、meta 行渲染「跟随全局」按钮（仅覆盖存在时渲染）
- `entrypoints/popup/App.css`：新增 `.channel-card__meta-row` / `.channel-card__follow-global` 样式；`.channel-card__meta` 增加 `min-width: 0`（新 flex 行内保持省略号截断）
- `src/shared/i18n.ts`：新增 `followGlobal` 键 × 18 语言（en + 17，i18n 一致性测试把关）
- `entrypoints/options/App.tsx`：`deleteChannel` 内部改调共享 `removeChannelOverride`（对外行为不变，防两处漂移）
- `src/shared/config.test.ts`：`removeChannelOverride` 单测 6 例
- `docs/popup.md`：2.2 节补充「Follow global」按钮说明

### 决策

- 「存在覆盖」判定口径：`config.channels[channelId]` 有条目即算覆盖——即使 speed 恰好等于全局值也是覆盖条目（B-4 幽灵覆盖背景：条目存在本身就让频道脱离全局步进器的控制），与 meta 行「Override · x.x」的显示口径一致
- 共享函数落点：`src/shared/config.ts`（channels 数据结构的既有归属地，紧邻 `sanitizeChannels` / `capChannels`）；纯函数不原地改——命中时返回新记录（未删条目按引用保留），未命中时返回原引用，配合 `updateConfig` 的引用相等短路跳过无效果写入
- 移除匹配按「记录 key 或 entry.channelId 命中即删」：sanitize 后二者一致，但兼容不一致的 legacy blob，避免定向删除漏删
- popup 刷新链路：删除后 `setConfig(next)` 立即更新 meta 文案；currentSpeed 由 content 的 ratechange → `notifyPorts` 端口推送自动刷新（已核对 content.ts 相关分支），不做本地预测性改写（遵守 B-4「不把默认速度伪装成实测速度」）

### 单测清单（src/shared/config.test.ts `removeChannelOverride (D-10)`）

- 删除指定 channelId、其余条目保留（按引用）
- 不原地改（输入记录与其条目不变、返回新引用）
- 不存在的 id / 空 id 返回原引用（空跑跳过写入）
- 空表
- channelId 与记录 key 不一致也能删
- 同 id 既作 key 又作 channelId 时全部移除

### 验证结果

- `pnpm test`：180/180 绿（含新增 6 例）
- `pnpm compile`：通过
- `pnpm build`：通过

### 遗留风险

- TC1/TC2/TC3 需真机验收（速度回全局、清除后再调速重新生成覆盖、SPA 切换后卡片状态）
- meta 行空间有限：按钮 `flex-shrink: 0` 优先保按钮，超长 meta 文本继续走省略号截断（已按 360px 最窄 popup 评估）


## 独立审查记录 (2026-10-11)

独立审查（subagent）结论：**通过**，无 P0/P1。要点：判定口径与 meta「Override · x.x」完全一致；removeChannelOverride 纯函数契约（引用保留/短路/双身份防御）成立且全仓唯一实现；popup 刷新全链（onChanged → applySpeedForVideo → ratechange → notifyPorts）逐段核实成立；deleteChannel「无条目跳过写入」确认为严格改进（终态一致、少一次冗余落盘）；180/180 测试绿 + compile/build 通过。

处置：[P2] ru followGlobal 措辞改为 «Вернуть глобальную скорость»（PM 落实）；[P2] options 搜索计数与空状态加 role="status" 播报（PM 落实，仅标注两个元素避免整表播报噪音）；[P2] 窄 popup（360px）+ ru/vi 长按钮文案挤压 meta 留真机 QA 验收，不可接受再加 max-width + 按钮内 ellipsis。
