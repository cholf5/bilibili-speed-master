<p align="center">
  <img src="../../public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  Quản lý tốc độ phát trên Bilibili dễ dàng hơn.
</p>

<p align="center">
  <a href="../../README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Cài đặt trên Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Cài đặt trên Firefox" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

Mệt mỏi vì phải chỉnh tốc độ mỗi lần mở video trên Bilibili? Muốn tốc độ khác nhau theo từng kênh?
**Bilibili Speed Master** ghi nhớ thiết lập toàn cục và theo kênh. Cài một lần, dùng mãi.
Hoạt động hoàn toàn cục bộ, không quảng cáo, không theo dõi.

---

## Điểm nổi bật

- **Tốc độ mặc định toàn cục**: Dùng tốc độ toàn cục khi kênh chưa có thiết lập.
- **Ghi đè theo kênh**: Chỉnh tốc độ ở bất kỳ video nào, cả kênh sẽ nhớ.
- **Chặn mọi thao tác**: UI trình phát và phím tắt luôn đồng bộ.
- **Quay về toàn cục vẫn tính**: Lựa chọn rõ ràng không bị coi là "chưa đặt".

> Dành cho ai?
> - Người cày anime
> - Người thích nội dung kỹ thuật / học tập
> - Ai muốn xem hiệu quả hơn

---

## Bảo mật và quyền riêng tư

- **Hoàn toàn cục bộ**
- **Không quảng cáo / không quảng bá**
- **Không tài khoản, không tải dữ liệu xem lên**
- **Không thay đổi gợi ý hay chiến lược phát của Bilibili**

---

## Cài đặt

- [Cài đặt cho Chrome](#)
- [Cài đặt cho Firefox](#)

---

## Mã nguồn mở và đóng góp

Bilibili Speed Master là mã nguồn mở. Hoan nghênh issue và PR.

- **Mở**: Logic cốt lõi, thích ứng DOM, chặn hành vi, lưu cài đặt
- **Giữ lại**: Tài nguyên cửa hàng (Logo / Banner), tên thương hiệu, kênh phát hành chính thức
- **Giấy phép**: MPL-2.0 (Mozilla Public License 2.0: cho phép dùng thương mại, sửa đổi và phân phối; tệp chỉnh sửa phải mở nguồn) [Toàn văn](https://www.mozilla.org/en-US/MPL/2.0/)

---

## Logic hành vi (bấm để mở)

<details>
<summary>Xem chi tiết</summary>

- **Tốc độ mặc định toàn cục**
  Khi kênh không có thiết lập riêng, dùng tốc độ toàn cục để tránh chỉnh lặp.

- **Ghi đè theo kênh**
  Sau khi chỉnh tốc độ ở bất kỳ video nào trong kênh, tất cả video phát theo tốc độ đó.

- **Chặn thao tác người dùng**
  Điều khiển trình phát hoặc phím tắt sẽ cập nhật ưu tiên kênh.

- **Quay về toàn cục vẫn tính**
  Tránh hiểu nhầm lựa chọn rõ ràng là "không có ưu tiên".

</details>

---

## Phát triển và build

```bash
pnpm dev           # Chế độ dev có hot reload
pnpm dev:firefox   # Chế độ dev cho Firefox
pnpm build         # Build production
pnpm build:firefox # Build production cho Firefox
pnpm zip           # Đóng gói ZIP cho store
pnpm compile       # Chỉ kiểm tra kiểu (không output)
```

Xem spec sản phẩm và UI: [docs/spec.md](../spec.md), [docs/popup.md](../popup.md), [docs/options.md](../options.md)
