# D-11 options 频道表格搜索/筛选

> Status: Testing / QA (dev + 独立审查通过（P2-3 aria-live 已由 PM 落实）；待用户真机验收 TC1-TC3) — 来源：2026-09-29 代码评审

## Objective

频道覆盖列表按 lastVisit 排序平铺（options/App.tsx `sortedChannels`），
D-4 设上限 200 条后，找不到目标频道会成为高频痛点。在表格上方加一个客户
端过滤输入框（按频道名/channelId 子串匹配，大小写不敏感），必要时加「仅
显示有覆盖」之类的最小筛选。

## Subtasks

- [x] options：表格 header 下加搜索输入框（受控组件，防抖 ~150ms）
- [x] 过滤逻辑：channelName 或 channelId 包含关键字；空关键字 = 全量
- [x] 空结果状态文案复用/新增 i18n（17 语言）
- [x] （可选）条数显示「n / total」

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- 输入关键字即时过滤，清空恢复全量
- 过滤只影响展示，不影响删除/调速操作的正确性
- 搜索无结果时显示明确的空状态文案

## Test Cases

- TC1: 200 条注入数据下按名字片段过滤，结果正确
- TC2: 过滤状态下删除某条 → 列表与 storage 一致
- TC3: 中文频道名、大小写英文均可命中

## Related Documents / Designs

- `docs/options.md`

## Dependent Tasks

- 建议 D-4 完成后评估是否必要（数据少时价值有限）

## Notes

- 无虚拟滚动必要（上限 200 条），普通渲染即可

## 开发记录 (2026-10-11)

### 改动清单

- `entrypoints/options/App.tsx`：表格 header 上方新增 `.table__toolbar`（受控搜索输入框 + 过滤时显示「n / total」条数）；导出纯函数 `filterChannelsByQuery`（与 `formatTimestamp` 同模式，供单测）；150ms 防抖（`searchQuery` 受控即时 + `debouncedSearchQuery` 代理，setTimeout + cleanup）；空结果状态文案（`noSearchResults`）
- `entrypoints/options/App.css`：新增 `.table__toolbar` / `.table__search` / `.table__count` 样式（沿用 `.select` 的深底圆角视觉语言）
- `src/shared/i18n.ts`：新增 `searchPlaceholder`、`noSearchResults` 键 × 18 语言（en + 17，i18n 一致性测试把关）
- `entrypoints/options/App.test.ts`：`filterChannelsByQuery` 单测 7 例
- `docs/options.md`：3.3 节补充搜索框说明

### 决策

- 过滤口径：关键字 trim + toLowerCase 后对 channelName / channelId 做 includes（中文自然命中）；lastVisit / speed 不参与匹配；空/纯空白关键字返回原数组（全量，保持引用便于 memo）
- 过滤函数落点：`entrypoints/options/App.tsx` 导出（组件文件同目录，沿用 formatTimestamp 既有测试模式）；未放 `src/shared/`，因其仅服务 options 展示层
- 防抖实现：useEffect + `setTimeout(SEARCH_DEBOUNCE_MS = 150)`，每次按键与卸载时清理；单处使用，不抽公共 hook
- 删除/调速正确性（TC2）：过滤只作用于渲染列表——`visibleChannels` 行仍是 `sortedChannels` 里的原 `ChannelOverride` 对象，删除按 row.channelId（共享 `removeChannelOverride`，D-10 同步落地），与过滤后下标无关
- 条数显示仅在过滤激活时出现，未过滤时不增加视觉噪声
- 卡内可选项「仅显示有覆盖」未做：channels 表所有条目本身就是覆盖条目，该筛选无额外语义

### 单测清单（entrypoints/options/App.test.ts `filterChannelsByQuery (D-11)`）

- 空关键字 / 纯空白关键字返回全量（且为原数组引用）
- 英文大小写不敏感命中（TC3）
- 中文频道名命中（TC3）
- channelId 子串命中
- 只匹配 name / channelId（speed、lastVisit 不参与）
- 无命中返回空数组
- TC2：过滤后的行保持原对象引用，按其 channelId 删除后列表与记录一致

### 验证结果

- `pnpm test`：180/180 绿（含新增 7 例）
- `pnpm compile`：通过
- `pnpm build`：通过

### 遗留风险

- 150ms 防抖为纯定时器实现，真机输入流畅度与 TC1（200 条注入数据）过滤表现待 QA 验收
- 搜索框为客户端过滤，不持久化；页面重载后关键字清空（符合「只影响展示」口径）


## 独立审查记录 (2026-10-11)

独立审查（subagent）结论：**通过**，无 P0/P1。要点：过滤口径（trim+lowercase+includes，speed/lastVisit 不参与）与实现一致；防抖 trailing + cleanup 覆盖 unmount 与连续变更；visibleChannels 保持原对象引用、删除按 channelId 与过滤下标无关（TC2 有同一性断言）；空关键字返回原引用配合 memo；IME 受控 input 安全（审查确认无需 composition 处理，未来加 Enter 行为须先判 isComposing）；i18n 18 语言齐全、抽查翻译自然；180/180 测试绿 + compile/build 通过。

处置：[P2] 计数与空状态加 role="status" 播报（PM 落实）；「仅显示有覆盖」可选项确认无语义（channels 条目即覆盖）不做，已记录。
