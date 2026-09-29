# D-12 验证并修正后台播放的统计口径

> Status: Backlog (P2) — 来源：2026-09-29 代码评审

## Objective

统计基于 `timeupdate` 的 `currentTime` 差值，且 `delta > TIME_UPDATE_MAX_DELTA_S(2s)`
的跳变被当作 seek 丢弃（`content.ts` handleTimeUpdate）。风险场景：标签页
切后台后计时器/事件被浏览器节流，回到前台时 currentTime 跳变 >2s → 该段
倍速播放时间不计入统计。需要先**实测确认**（音频播放中的后台标签页通常豁
免 intensive throttling，`timeupdate` 可能根本不受影响），再决定是否修。

## Subtasks

- [ ] 实测矩阵：{前台/后台} × {有声/静音} × {2x 播放 10 分钟}，记录统计
      增量与理论值偏差
- [ ] 若后台确实丢统计：在 `document.hidden` 期间放宽 delta 上限至
      `墙钟差 × rate × 容差`，或改用 wall-clock 口径累计、回前台时校验
- [ ] 若后台不丢：把结论写进 `docs/time-saved.md`（已知边界），关闭本卡

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
