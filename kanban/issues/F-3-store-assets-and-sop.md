# F-3 上架素材与提审 SOP（截图 / listing 文案 / 提审脚本 / SOP）

> Status: In Review — 来源：2026-11-01 用户需求「准备素材 + 自动化提审 + SOP」

## Objective

用户要求:把商店提审所需的截图、文案等素材准备好,并尽量自动化提审——
用户只提供账号凭证,其余由 AI 按 SOP 执行。

约束与实测结论:

- CWS 提审 API 要求 OAuth refresh token;首次建 item 必须人工在仪表盘做
  (首次 listing 要人工填表,API 只覆盖 upload/publish/status)
- AMO 提供 REST API(JWT 签名),上传即可建草稿
- 真实扩展 popup 在 CDP 驱动下会立即自动关闭(openPopup 返回 opened 但
  target 5s 内消失,无窗口锚点),popup 截图需要替代路线
- 本机 googleapis.com 直连超时(CWS API 需代理),AMO 直连可达

## Subtasks

- [x] 截图管线 `store-assets/scripts/capture-screenshots.mjs`
      （零依赖 CDP 驱动,Chrome for Testing + `--load-extension`）
- [x] popup 合成板 `popup-board.html`（品牌背景 + 真实构建产物 iframe）
      + mock 层 `popup-mock.js`（storage.sync/local、tabs.query/
      sendMessage/connect 双模式、runtime.getManifest、navigator.language
      钉扎 zh-CN）+ 静态服务器 `serve-store-assets.mjs`（head 注入 mock
      到真实 popup.html）
- [x] options / 视频页:真实扩展 + SW 上下文播种 storage.sync/local +
      真实 B 站视频（BV1GJ411x7h7,角标控件实测显示 1.5x;弹幕关闭;
      `Page.addScriptToEvaluateOnNewDocument` 钉扎 zh-CN,macOS Chromium
      `--lang` 无效）
- [x] 规格合成与文案压印 `imaging.py`（compose: 1280x800×4 / 640x400 /
      promo-440x280 / icon-128;overlay: 底部渐变带 + 标题/副标题,
      Hiragino Sans GB）
- [x] listing 文案 `store-assets/listing/listing.md`（名称、CWS ≤132 /
      AMO ≤250 描述、详述、分类、隐私单句途、审核备注、素材清单、
      过审回填清单）
- [x] 提审脚本 `submit-chrome.mjs`（status/upload/publish,publish 默认
      trustedTesters,public 需显式）+ `submit-firefox.mjs`（JWT HS256 ≤60s、
      上传扩展+源码包、轮询校验结果、可附 approval_notes）
- [x] SOP `store-assets/SOP.md`（注册、凭证获取分步、提审命令、自检清单、
      收尾、风险预案）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

M

## Acceptance Criteria

- 四张截图均由真实 UI 产出（非手绘/mock UI）,商店规格齐全
- 提审脚本语法 + 缺凭证报错 + 认证链路实测(AMO 伪造 JWT 得 401
  Unknown JWT iss,证明请求格式正确;CWS 域名本机不可达已写入 SOP)
- SOP 可让用户提供凭证后由 AI 独立执行提审

## Test Cases

- TC1: `node --check` 全部脚本通过
- TC2: capture 全流程跑通,raw/ 四张 2x PNG 产出
- TC3: compose+overlay 产出 final/ 七个文件,人工目检
- TC4: AMO API 用伪造 JWT POST /addons/upload/ → 401 Unknown JWT iss
- TC5: CWS API 无代理直连 → 超时(已写 SOP 网络要求节)

## Related Documents / Designs

- `store-assets/SOP.md`、`store-assets/listing/listing.md`
- `kanban/issues/F-2-store-compliance-prep.md`（合规整改与包构建前作）

## Dependent Tasks

- F-2（包构建与 lint 通道已就绪）
- 阻塞项:用户完成 SOP §1 注册 + §2 凭证生成后,§3 提审才能执行

## Notes

- popup 截图为何用 mock 数据层:真实 popup 依赖 tabs.query 定位活动标签并
  向内容脚本发消息;且 CDP 驱动下 popup 弹窗会立即自动关闭。mock 层模拟的
  是 chrome.* API 边界,渲染的完全是 `.output/chrome-mv3` 的真实产物代码,
  与真机行为一致（真机验收时对比过结构）。
- 播种数据:全局 1.5x、7 个频道覆盖(影视飓风 1.5 / 老番茄 1.25 /
  罗翔说刑法 1.75 / 纪录片 1.0 / 敖厂长 1.5 / 技术蛋老师 2.0 /
  硬件茶谈 1.25)、省时 40.833 小时——数值真实感且符合 schema(D-2 分片键)。
- 视频页选择官方 MV(BV1GJ411x7h7)规避第三方版权内容;如商店要求可换
  `VIDEO_URL` 环境变量重截。
- CWS publish 默认 target=trustedTesters,public 需显式指定——防止脚本
  误公开。
- AMO 首次提审:upload API 会创建草稿,listing 仍需仪表盘人工填一次
  （SOP §3.2);有 slug 后更新可全自动。
- 凭证安全:全部走环境变量,不入库;refresh token 可随时吊销。

## 开发记录 (2026-11-01)

### 调试过程中的关键发现

1. CDP 找扩展 SW 必须精确匹配 `/background.js` —— Chrome 组件自身的
   `thunk.js` SW 也是 `chrome-extension://` 且先出现在列表里,宽松匹配
   会连错上下文（`chrome.storage` 不存在报 TypeError）。
2. 扩展 id 应从 SW target 的 `url` host 取;从 ws url 取会得到
   `127.0.0.1:9222`,导致 options 页 ERR_BLOCKED_BY_CLIENT。
3. `chrome.action.openPopup` 在 CDP 下返回 opened 但 popup target 秒关
   （attach 前就 dismiss）,轮询也抓不到 —— popup 截图走 mock 路线。
4. mock 的 tabs API 必须同时支持回调和 Promise 双模式（MV3 Chrome 无
   回调时返回 Promise,App.tsx 用了 await）。
5. macOS Chromium `--lang=zh-CN` 不生效（UI 语言跟随系统）;用
   `Page.addScriptToEvaluateOnNewDocument` 在 bundle 前钉扎
   `navigator.language` 解决。

### 验证结果 (2026-11-01)

- 全部脚本 `node --check` 通过
- capture 全流程跑通:popup h=471 自适应、options zh-CN、视频页角标 1.5x
- final/ 七个规格文件产出并目检通过(文案压印清晰)
- AMO:伪造 JWT → 401 Unknown JWT iss(请求格式/签名算法正确)
- CWS:googleapis.com 直连超时 → SOP 已写代理要求(NODE_USE_ENV_PROXY=1)
- `pnpm test` 204 例通过(仓库无回归)

### 与并行会话的协调

- 开发期间并行会话完成了 icon 重绘（467337a）、v0.1.0 GitHub Release、
  store-assets 早版入库与 `excludeSources: ['store-assets/**']` 追加
  （9c03000、7858368）;本轮提交（51be060）覆盖最终版截图/脚本/文案/SOP,
  wxt.config.ts 双方改动已合并无冲突。
