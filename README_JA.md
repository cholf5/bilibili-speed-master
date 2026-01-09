<p align="center">
  <img src="public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili スピードマスター</h1>

<p align="center">
  Bilibili の再生速度管理をもっと簡単に。
</p>

<p align="center">
  <a href="README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Chrome にインストール" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Firefox にインストール" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

毎回 Bilibili の動画で速度を調整するのが面倒ですか？チャンネルごとに速度を変えたいですか？
**Bilibili Speed Master** は、グローバル設定とチャンネル別の好みを記憶します。一度設定すれば自動で反映されます。
完全にローカル動作で、広告や追跡はありません。

---

## 特長

- **グローバル既定速度**：チャンネル設定がない場合はグローバル速度を使用。
- **チャンネル単位の上書き**：任意の動画で調整すればチャンネル全体に反映。
- **全操作をキャプチャ**：UI 操作やショートカットも反映されます。
- **グローバルに戻しても記録**：明示的な選択は「未設定」になりません。

> こんな人におすすめ
> - アニメを一気見する人
> - 技術 / 学習系コンテンツが好きな人
> - 視聴効率を上げたい人

---

## セキュリティとプライバシー

- **完全ローカル動作**
- **広告なし / プロモーションなし**
- **アカウント不要、視聴データの送信なし**
- **Bilibili の推薦や再生戦略を変更しません**

---

## インストール

- [Chrome 版インストール](#)
- [Firefox 版インストール](#)

---

## オープンソースと貢献

Bilibili Speed Master はオープンソースです。Issue と PR を歓迎します。

- **公開**：コアロジック、DOM 対応、挙動のフック、設定保存
- **保留**：ストア素材（Logo / Banner）、ブランド名、公式配布チャネル
- **ライセンス**：MPL-2.0（Mozilla Public License 2.0：商用利用、改変、再配布可。改変ファイルは公開必須）[全文](https://www.mozilla.org/en-US/MPL/2.0/)

---

## 挙動ロジック（クリックで展開）

<details>
<summary>詳細を見る</summary>

- **グローバル既定速度**
  チャンネルに設定がない場合は、グローバル速度を使用して調整の手間を減らします。

- **チャンネル単位の上書き**
  チャンネル内の任意動画で速度を調整すると、全動画に反映されます。

- **ユーザー操作を捕捉**
  プレーヤー操作やショートカットによる変更も記録されます。

- **グローバルに戻しても記録**
  明示的な選択を「未設定」と誤判定しません。

</details>

---

## 開発とビルド

```bash
pnpm dev           # 開発モード（ホットリロード）
pnpm dev:firefox   # Firefox 開発モード
pnpm build         # 本番ビルド
pnpm build:firefox # Firefox 本番ビルド
pnpm zip           # ストア用 ZIP を生成
pnpm compile       # 型チェックのみ（出力なし）
```

製品と UI の仕様はこちら： [docs/spec.md](docs/spec.md), [docs/popup.md](docs/popup.md), [docs/options.md](docs/options.md)
