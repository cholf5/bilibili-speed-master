# F-1 UI 重设计:品牌对齐 Bilibili + 层级修正 + 快捷键分组 + 质量底线

> Status: In Review — 来源:2026-11-01 用户要求「使用 /frontend-design 重新审视所有界面,全做」

## Objective

按 frontend-design 评审结论,消除"通用深色 SaaS 风"的默认观感,让三个 UI
表面(popup / options / 播放器内 widget)与 Bilibili 主题咬合,并修正视觉
权重与功能权重的倒挂。全部 8 项评审发现一次实施:

1. **主色换 Bilibili 粉**:`#3ea6ff`(YouTube 蓝)/ `#f5c518`(IMDb 金)→
   `--sm-accent` `#fb7299`(B 站粉)+ `--sm-blue` `#6bb7d8`(站内蓝,仅 OSS
   链接)。频道卡蓝底蓝边一并移除。
2. **Popup 权重重排**:频道卡升级为 hero(27px 粉色速度数字 + Override /
   Following global 状态 pill + Follow global 弱链接);无交互的五星评分
   降为页脚行(发布后有 `RATE_URL` 才渲染评分链接);头部新增齿轮按钮直达
   options,More Options 保留。
3. **快捷键列表**:34 个 action 按 7 个语义分组(Playback / Seeking /
   Volume / Speed / Player & navigation / Jump to percent / Media keys);
   绑定值从蓝色文字改为键帽 `kbd`(蓝色语义让还给链接);自定义暗色滚动条。
4. **质量底线**:新增全局 `:focus-visible` 焦点环(switch 的 tabindex 落到
   track 上);移除 Google Fonts 远程 `@import`,Space Grotesk 400/600 可变
   字体本地打包到 `public/fonts/`(3 个子集共 48KB,popup 不再等网络);
   新增 `prefers-reduced-motion` 全局降级。
5. **颜色 token 化**:新建 `entrypoints/shared-ui.css` 单一来源(背景两级、
   面板、控件、文字三级、双主色、状态色、线、焦点、圆角),popup 与
   options 的 style.css/App.css 全部改引 token,复制粘贴的 brand 区块样式
   不再各自漂移。
6. **Rate me 死控件**:`src/shared/about.ts` 新增 `RATE_URL: string | null =
   null`(README 商店徽章还是占位符,上架后填入即恢复),UI 条件渲染,不再
   显示无目标的假评分控件。
7. **删除确认**:options 频道表删除覆盖增加 `window.confirm`
   (`channelDeleteConfirm`),与恢复默认/导入的确认纪律一致。
8. **速度单位统一**:popup/options 所有速度值统一带 `x`(与 widget 的
   `1.5x` 一致);步进按钮 `-` 全部换为真减号 `−`。

## Subtasks

- [x] `entrypoints/shared-ui.css`:18 个 token + @font-face ×3 + focus 环 +
      reduced-motion(popup/options style.css 引用)
- [x] `public/fonts/`:sg-{latin,latin-ext,vietnamese}.woff2(gstatic 官方
      可变字体子集,400–700 共用)
- [x] popup 重排(hero 卡 / 页脚 / 齿轮)+ App.css 全量 token 化
- [x] options 分组 + 键帽 + 暗色滚动条 + 删除确认 + Rate me 条件渲染 +
      App.css 全量 token 化
- [x] `src/shared/about.ts` 新增 `RATE_URL`(null → 不渲染)
- [x] i18n:8 个新 key(shortcutsGroup* ×7 + channelDeleteConfirm)× 18
      locale 全部人工翻译,key-parity 测试绿
- [x] docs/popup.md、docs/options.md 的 VISUAL STYLE TOKENS 章节同步

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

M

## Acceptance Criteria

- [ ] 主色为 B 站粉,无残留 YouTube 蓝/IMDb 金(grep 无 #3ea6ff/#f5c518)
- [ ] popup 频道卡含大号速度数字与 Override/Following global pill;评分
      仅存在于页脚且不可交互(无链接时仅 repo/license)
- [ ] 快捷键列表 7 组、绑定呈键帽样式
- [ ] 键盘 Tab 可见焦点环;断网时 popup 字体不闪烁(字体本地)
- [ ] 删除频道覆盖需确认;速度值统一带 x
- [ ] 219+ 单测绿、compile 绿、chrome/firefox 构建绿

## Test Cases

- TC1 popup 真机:有覆盖/无覆盖两种频道卡状态;点击 pill 旁 Follow global
  恢复全局;hero 数字与播放器实际速率一致
- TC2 options 真机:快捷键录制/冲突交换在分组视图下正常;删除行出现确认框;
  Tab 遍历整页焦点可见;Search channels 过滤照常
- TC3 语言抽查:zh-CN/zh-TW/ja/de/ar 的分组标题与删除确认文案
- TC4 断网冷启动 popup:字体为本地 Space Grotesk,无 FOUT 回落到系统字体

## Issues & Solutions

- mock 验证时发现 `chrome.storage.sync.get` 的 keys 是数组且 split key 的
  值需 `{version:1, global|channels:{...}}` 包装,直接给裸对象会被
  sanitize 丢弃回落默认值 —— mock 数据结构修正后 hero 卡渲染正确。
- popup channel-card 布局从三列步进器改为「大数字 + 双按钮」后,`.stepper`
  三列网格会留空洞,补 `.channel-card__speed .stepper` 两列覆盖。

## Review Notes

- 匹配/执行逻辑未动:分组仅影响渲染顺序,
  `findBindingConflict`/执行器仍按 `SHORTCUT_ACTION_ORDER` 平序工作。
- 存储结构与写入路径未动,无回归面;风险集中在纯 UI 层。
- 构建产物含 `public/fonts`(约 +48KB,zip 包体积影响可忽略)。
