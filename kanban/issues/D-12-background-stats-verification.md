# D-12 验证并修正后台播放的统计口径

> Status: Testing / QA (dev + 独立审查通过，P1 文档修订与 P2 已落实；实测矩阵 TC1/TC2 移交用户真机验收) — 来源：2026-09-29 代码评审

## Objective

统计基于 `timeupdate` 的 `currentTime` 差值，且 `delta > TIME_UPDATE_MAX_DELTA_S(2s)`
的跳变被当作 seek 丢弃（`content.ts` handleTimeUpdate）。风险场景：标签页
切后台后计时器/事件被浏览器节流，回到前台时 currentTime 跳变 >2s → 该段
倍速播放时间不计入统计。需要先**实测确认**（音频播放中的后台标签页通常豁
免 intensive throttling，`timeupdate` 可能根本不受影响），再决定是否修。

## Subtasks

- [ ] 实测矩阵：{前台/后台} × {有声/静音} × {2x 播放 10 分钟}，记录统计
      增量与理论值偏差
      → **本环境无法实测**（需真机浏览器长时间播放）：改为静态分析 +
      墙钟口径加固（见下方开发记录），实测矩阵移交真机验收（QA 项，
      对应 TC1/TC2），不作为本卡完成依据
- [x] 若后台确实丢统计：在 `document.hidden` 期间放宽 delta 上限至
      `墙钟差 × rate × 容差`，或改用 wall-clock 口径累计、回前台时校验
      → 已实现为 `shouldCountPlaybackDelta`（`src/shared/stats.ts`）：
      不区分前后台统一使用「墙钟比例 + 容差」口径（无需感知
      `document.hidden`，前台同样受益），固定 2s 阈值移除，另留 600s
      绝对兜底上限
- [x] 若后台不丢：把结论写进 `docs/time-saved.md`（已知边界），关闭本卡
      → 静态分析结论与「若后台不丢」前提相反（静音后台必丢，见开发记录），
      但本子任务的文档动作已完成：`docs/time-saved.md` 新增「统计口径与
      后台行为」小节；关卡待 review + 真机 QA

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- 实测结论有数据支撑并记录在卡片 Notes
- （若修）后台 2x 播放 10 分钟 → 统计增量 ≈ 5 分钟，误差 < 10%；前台
  seek 后不产生虚假统计
- （若不修）文档补充「统计口径与后台行为」说明

## Test Cases

- TC1: 后台有声 2x 播放 10 分钟 → 统计与理论值对比
- TC2: 后台静音 2x 播放 10 分钟 → 同上
- TC3: 播放中拖动进度条 3 次 → 统计不受 seek 污染（现有防护回归）

## Related Documents / Designs

- `docs/time-saved.md`
- `kanban/issues/A-10-time-saved.md`

## Dependent Tasks

- D-1（统计写 local 后测更贴近最终形态；不硬依赖）

## Notes

- 判定 seek 的本质是「差值与墙钟不成比例」，比固定 2s 阈值更稳，若动手
  修可直接按此实现

## 开发记录 (2026-10-11)

### 风险分析（静态分析，替代 Subtask 1 实测）

- 旧逻辑（`content.ts` handleTimeUpdate）：`currentTime` 差值超过固定阈值
  `TIME_UPDATE_MAX_DELTA_S = 2` 即视为 seek 丢弃。
- 浏览器行为：**有声**播放的标签页被 Chrome 视为可见（playing audio 的
  页面豁免 intensive throttling），前台/有声后台基本不受影响；Chrome 文档
  化的 intensive throttling 仅针对**定时器**，作用于**静音后台标签页**
  （定时器可被压到约 1 次/分钟）。`timeupdate` 由媒体管线派生而非定时器，
  其派发频率在静音后台是否同样受节流**未经实测**。若受节流，2x 播放的
  一次 timeupdate 会携带 ~120s 的 media delta，被旧阈值整段当 seek 丢弃
  → 静音后台存在统计丢失风险；是否实际发生、丢失幅度如何，以真机
  TC1/TC2 结论为准，本分析不作断言。
- 结论：**存在丢失风险，待实测确认**。静态分析无法证实/证伪旧口径的实际
  丢失（timeupdate 派发是否受节流未实测），但新墙钟比例口径在该失效模式
  下不丢、其余场景语义不变，防御性收益成立，值得修；真机 TC1/TC2 同时
  承担「旧口径是否真丢」的举证与「修后不丢」的验收。

### 判定规则与容差

新纯函数 `shouldCountPlaybackDelta({ mediaDeltaS, wallDeltaMs, rate }) → boolean`
（`src/shared/stats.ts`）；`handleTimeUpdate` 以 `performance.now()` 记录
单调墙钟（**不用 `Date.now()`**——系统时钟跳变会污染比例判定），与
`currentTime` 一起构成上一拍状态。规则按序：

1. 非有限输入（NaN/Inf）→ 不计（NaN 比较会静默通过后续所有分支，必须前置）。
2. `rate <= 1` → 不计（既有语义，不变）。
3. `mediaDelta <= 0` → 不计（回退/重播/暂停拍/基线拍）。
4. `wallDeltaMs <= 0` → 不计（同拍双触发无墙钟基准；调用方在判定前已更新
   上一拍时间戳，该拍 media——至多 1 拍量级——是**丢失而非并入下一拍**，
   方向保守少计、量级无害）。
5. `mediaDelta > 600s`（`MEDIA_DELTA_HARD_CAP_S`）→ 一律不计（绝对兜底）。
6. 比例判定：`expected = wall × rate`；`mediaDelta > expected × 1.5 + 0.5s`
   判为 seek/异常 → 丢弃；否则计入。

容差取值理由：

- 相对容差 1.5×：吸收事件派发抖动、时间戳取整，以及区间中途改倍速导致的
  expected 偏差——**仅升速方向**（media 落后于按新更高倍率算的 expected，
  恒被吸收）；跨拍**降速**且快段主导该区间时，media 可能超出按新倍率算的
  容差被误杀（如 4x 播 9s 后降 2x 播 1s，按 rate=2 判 media 38 > 30.5），
  方向保守少计一拍，旧固定 2s 阈值对该区间同样整拍丢弃，非回归。
  不对称代价：误杀一整拍最长可达数分钟（节流场景），多计一个小异常只有
  几十毫秒，故宁松勿紧。
- 绝对下限 0.5s：前台 timeupdate 约 4 拍/秒（每拍 ~0.25s media），0.5s
  下限保证正常节拍绝不因噪声被误杀，同时覆盖近零 wallDelta 拍的判定。
- media **落后**于 expected（缓冲/卡顿）不丢弃：saved 按实际 mediaDelta
  计算，卡顿自然少计、绝不虚假补记；比例判定只拦截 media「超前」的跳变。
- 绝对兜底上限的取舍：旧 2s 固定阈值正是本卡根因，不能沿用；完全去掉上限
  则失去对「单调时钟异常/播放器异常」的最终防线，故保留 600s（= 4x 下
  2.5 分钟墙钟间隔，远超浏览器文档化的节流强度 ~1 次/分钟，不会截断合法
  后台区间）。取舍：极端污染的最坏损失被限定在单次 < 600s media（2x 下
  saved < 300s），且该上限在正常/节流场景下永远触不到。

### 边界场景自检

- 暂停/卡顿：wallDelta 增大而 mediaDelta≈0 → 规则 3 拦截 → 正确（不虚假
  计时）；部分播放的长间隙（如播 20s 停 40s）下一拍按**实际 20s media**
  计入（media 落后于 expected 不丢弃），间隙内未播放的墙钟时间不产生任何
  计入、永不追溯补记——可接受口径，已写入 `docs/time-saved.md`。
- video detach/attach、`emptied`（切画质）：哨兵重建立基线不计；B 站切画质
  通常保位，若 currentTime 跳变，新口径按 seek 丢弃一拍——与旧行为一致
  或更优（小幅位置校正现在允许通过，不再被 2s 阈值一刀切）。
- 节流间隙内发生 seek：会被比例区间吸收计入（残余风险，见「遗留风险」）。

### 改动清单

- `src/shared/stats.ts`：新增 `shouldCountPlaybackDelta` 及导出常量
  `SEEK_TOLERANCE_RATIO(1.5)`、`SEEK_TOLERANCE_FLOOR_S(0.5)`、
  `MEDIA_DELTA_HARD_CAP_S(600)`；文件头注释同步。
- `entrypoints/content.ts`：移除 `TIME_UPDATE_MAX_DELTA_S`；新增
  `lastPlaybackWallMs`（`performance.now()`，随 `lastPlaybackTime` 的三处
  哨兵重置点同步重置：导航切换 / detach / attach）；`handleTimeUpdate`
  改调 `shouldCountPlaybackDelta`，saved 仍按实际 mediaDelta ×
  `computeTimeSaved` 计。
- `src/shared/video.ts`：`computeTimeSaved` 注释同步（对旧常量的引用已过期）。
- `src/shared/stats.test.ts`：新增 `shouldCountPlaybackDelta` describe 块。
- `docs/time-saved.md`：新增「统计口径与后台行为 (统计口径与后台行为)」小节。
- `kanban/board.md`：D-12 移入 In Review。

### 单测清单（Vitest，`src/shared/stats.test.ts`）

正常前台 2x（count）；**节流静音后台 60s 墙钟 / 2x / ~120s media（count，
本卡核心修复）**；节流 1x（rate<=1 拦截）；0.5x 慢速拦截；前跳 seek
30s / 1s / 2x（discard）；回退 seek（discard）；暂停拍 mediaDelta=0
（discard）；缓冲落后 mediaDelta=5 / wall=10s / 2x（count 实际值，不补记）；
同拍双触发 wallDelta=0（防抖，如实注明该拍丢失而非并入）；哨兵基线拍；
容差边界 3.5s（count）/3.51s（discard）；跨拍降速且快段主导 media=38 /
wall=10s / 2x（discard，固化保守少计方向）；过 cap 边界但比例不符
media=600 / wall=1s / 2x（discard，固化规则 5→6 先后语义）；绝对上限边界
600s（count）/601s（discard）；非有限输入防护（NaN/Inf × 3 参数）。既有
`computeTimeSaved` 与 storage/migration 用例全部保留未动。

### 验证结果

- `pnpm test`：全绿（既有 119 例 + 新增 15 例 = 134 例，无回归）。
- `pnpm compile`：类型检查通过，无错误。
- 独立审查（统计守恒推演）通过后落实 1 条 P1 + 4 条 P2（全部为文档/注释/
  测试改动，逻辑未动）：节流断言 hedge 化（timeupdate 派发是否受节流未经
  实测，旧口径实际丢失以真机 TC1/TC2 为准）；容差方向说明补全（降速快段
  主导可误杀，保守少计）并加单测固化；wallDelta<=0 注释改为如实描述
  （该拍丢失而非并入）；停顿口径改写（间隙内实际播放的 media 仍按实际值
  计入）；补「过 cap 边界但比例不符」组合用例固化规则 5→6 先后语义。

### 遗留风险

- **TC1/TC2 真机矩阵未实测**（本环境限制，如实标注）：验收标准中「后台
  2x 播放 10 分钟统计 ≈ 5 分钟，误差 < 10%」移交真机 QA；TC3（seek 不
  污染）已有单测级覆盖，真机回归仍建议执行。
- 节流间隙内发生 seek 会被吸收计入（理论上限为该间隙内超出比例容差的
  seek 部分；实际需要用户与后台标签页交互，罕见）。
- 各平台对 `performance.now()` 跨系统休眠的行为存在差异：休眠唤醒后的播放
  在新口径下走「media 落后 → 按实际 mediaDelta 计」或哨兵重建基线，不会
  虚假多计；极端异常由 600s 兜底封顶。
