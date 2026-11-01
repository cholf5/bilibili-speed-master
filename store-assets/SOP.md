# Bilibili Speed Master — 双商店提审 SOP

> 目标:你只提供账号凭证,其余(打包、素材、上传、提审)全部按本文执行。
> 脚本均为零依赖 Node(≥22),位于 `store-assets/scripts/`。

---

## 0. 素材与包(已就绪,无需操作)

| 产物 | 位置 |
| --- | --- |
| Chrome 商店包 | `.output/bilibili-speed-master-0.1.0-chrome.zip` |
| Firefox 商店包 | `.output/bilibili-speed-master-0.1.0-firefox.zip` |
| AMO 源码包(审核要求) | `.output/bilibili-speed-master-0.1.0-sources.zip` |
| 图标 / 宣传图 / 截图 | `store-assets/screenshots/final/` |
| Listing 文案 | `store-assets/listing/listing.md` |

重新生成(发布前如代码有变):

```bash
pnpm build && pnpm build:firefox && pnpm zip && pnpm zip:firefox
CHROME_BIN="<Chrome for Testing 路径>" node store-assets/scripts/capture-screenshots.mjs
python3 store-assets/scripts/imaging.py compose store-assets/screenshots/raw store-assets/screenshots/final
# 成品截图的三句压印文案(见 imaging.py compose 用法,见 git log / 卡片)
```

---

## 1. 首次注册(人工,一次性)

### 1.1 Chrome Web Store

1. 访问 https://chrome.google.com/webstore/devconsole ,用 Google 账号登录
2. 缴纳 **$5 注册费**(一次性)
3. 补充账号资料:开发者名称(建议 `cholf5`)、邮箱、公开或仅群组可见

### 1.2 Firefox Add-ons (AMO)

1. 访问 https://addons.mozilla.org/developers/ 注册账号(免费,建议同邮箱)
2. 可选:在 Profile 设定开发者显示名

---

## 2. 生成 API 凭证(人工,一次性;凭证只发给我用)

### 2.1 Chrome Web Store → 提审自动化

1. 访问 https://console.cloud.google.com 新建项目(如 `bilibili-speed-master`)
2. 「API 和服务 → 库」启用 **Chrome Web Store API**
3. 「OAuth 同意屏幕」:External → 填应用名 → 添加你自己的 Google 账号为测试用户
4. 「凭据 → 创建凭据 → OAuth 客户端 ID」→ 类型选 **Web application**(CWS API 仅支持
   Web/安装式应用,不支持 Service Account):
   - Authorized redirect URIs 填 `https://developers.google.com/oauthplayground`
5. 打开 https://developers.google.com/oauthplayground :
   - 右上角齿轮 ⚙ → 勾选 *Use your own OAuth credentials*,填入 Client ID/Secret
   - Step 1 输入自定义 scope: `https://www.googleapis.com/auth/chromewebstore`
   - 授权并换取 token,复制 **refresh_token**
6. 获取 **Item ID**:首次需人工上传一次扩展(见 §3.1 第 1 步),item id 在开发者
   仪表盘 URL 与「软件包」页可见(32 位十六进制)
7. 把四个值交给我:
   ```
   CWS_CLIENT_ID=...
   CWS_CLIENT_SECRET=...
   CWS_REFRESH_TOKEN=...
   CWS_ITEM_ID=...
   ```

> 安全说明:refresh_token 只用于向 Google 换取短期 access_token 调 CWS API,
> 可随时在 Google 账号「第三方访问权限」里吊销。

### 2.2 AMO → 提审自动化

1. 访问 https://addons.mozilla.org/developers/addon/api/key/ 
2. 生成 **API key**(显示一次):
   ```
   AMO_API_KEY=...
   AMO_API_SECRET=...
   ```
3. (更新已有 add-on 时)从 add-on 编辑页 URL 取 slug:
   `AMO_ADDON_SLUG=<slug>`

> 安全说明:AMO JWT 密钥只签名上传请求,可在同一页面随时轮换。

凭证请通过本机环境变量提供(export 后告知我即可),我会写入临时环境再运行脚本;
**不要**提交到 git。

> **网络要求**:googleapis.com 在大陆网络直连不可达(已实测)。提交 CWS 需代理,
> Node ≥24 原生支持:`NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://127.0.0.1:<端口> \
> node store-assets/scripts/submit-chrome.mjs ...`。AMO 直连可达(已实测)。

---

## 3. 提审流程(我执行)

### 3.1 Chrome Web Store

首次必须人工建 item(一次性,之后全自动):

1. 开发者仪表盘 →「新增项」→ 上传 `.output/bilibili-speed-master-0.1.0-chrome.zip`
2. 按 `store-assets/listing/listing.md` 填写:名称、描述、分类
   (`Productivity`)、语言(zh-CN)、上传 `screenshots/final/` 的
   icon-128 / promo-440x280 / 4 张 1280x800 截图
3. 「隐私」标签:数据使用选 **不收集任何用户数据**;单句途与权限理由从
   listing.md §5 粘贴;分发范围默认;提交「商品详情页审核」前的自检清单
   见 §4
4. 记下 **Item ID**,之后:

```bash
export CWS_CLIENT_ID=... CWS_CLIENT_SECRET=... CWS_REFRESH_TOKEN=... CWS_ITEM_ID=...
node store-assets/scripts/submit-chrome.mjs status      # 看审核状态
node store-assets/scripts/submit-chrome.mjs upload      # 上传新版本包
node store-assets/scripts/submit-chrome.mjs publish     # 提交审核(默认 trustedTesters)
node store-assets/scripts/submit-chrome.mjs publish public   # 公开发布(我说了才跑)
```

后续版本更新 = `upload` + `publish` 两条命令,审核一般 1–3 天(新 item 可能更久)。

### 3.2 Firefox Add-ons (AMO)

首次提交我可直接完成(upload API 会创建草稿,listing 在仪表盘补全):

```bash
export AMO_API_KEY=... AMO_API_SECRET=...
node store-assets/scripts/submit-firefox.mjs upload
```

脚本会上传 扩展 zip + 源码包,自动轮询 AMO 在线校验(add-on linter 同源)直到
出结果;PASS 后:

1. 仪表盘 https://addons.mozilla.org/developers/addons/ → 该版本 → 「Edit listing」
2. 按 listing.md 填名称/summary/描述(许可证选 **MPL-2.0**、支持 URL 填
   GitHub Issues、上传截图),保存并 **Submit for review**
3. 审核备注(源码构建说明 + view API 说明)从 listing.md §6 粘贴到
   「Review Notes」

首次人工审核约 1–7 天;更新版本(有 slug 后)用
`node store-assets/scripts/submit-firefox.mjs upload` 一条命令完成,AMO 会
自动带上一版的 listing。

---

## 4. 提审自检清单(每次发布前)

- [ ] `pnpm test`、`pnpm compile` 全绿
- [ ] `web-ext lint .output/firefox-mv3` 0 errors(允许的 4 条 warning 见 F-2 卡)
- [ ] 版本号已升(`package.json` version;WXT manifest 跟随),tag `vX.Y.Z`
- [ ] Chrome 包:manifest 无 Firefox 字段泄漏;截图与 listing 描述一致
- [ ] AMO 包:上传时附 sources zip;版本备注含构建命令
- [ ] `about.ts` 的 RATE_URL 仍为 null(首次上架)→ 过审后回填

## 5. 过审后收尾(我执行)

1. 回填 `src/shared/about.ts` `RATE_URL`(CWS URL;Firefox 可用 AMO URL)
2. README 两份的安装徽章换成商店链接
3. `git tag v0.1.0 && git push --tags`
4. 看板 F-2 卡移 Done,记录商店 URL 与过审日期

## 6. 已知审核风险与预案

| 风险 | 预案 |
| --- | --- |
| CWS「有限功能」误判(单一站点 host permission) | 单句途已写明;如被拒,回复说明倍速偏好存储属于"用户主动使用的单一目的" |
| AMO 源码审核问 React bundle | 版本备注已写构建命令 + sources zip 附上;React 内部 innerHTML 已备注 |
| 商标/名称争议(含"Bilibili") | README 已声明品牌保留;如被 AMO 要求更名,备选名「倍速大师 Speed Master」(仅改 listing 名称,包内 name 不动) |
| 截图含第三方视频内容 | 已选用官方 MV 片段(低风险);如被要求,可换用种子自制视频重截(capture 脚本支持 VIDEO_URL 参数) |
