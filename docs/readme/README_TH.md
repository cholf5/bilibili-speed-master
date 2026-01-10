<p align="center">
  <img src="../../public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  จัดการความเร็วการเล่นบน Bilibili ได้ง่ายขึ้น
</p>

<p align="center">
  <a href="../../README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="ติดตั้งบน Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="ติดตั้งบน Firefox" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

เบื่อไหมที่ต้องปรับความเร็วทุกครั้งที่ดูวิดีโอใน Bilibili? อยากได้ความเร็วต่างกันตามช่อง?
**Bilibili Speed Master** จดจำการตั้งค่าทั่วไปและตามช่อง ตั้งครั้งเดียว ใช้งานได้ยาวๆ
ทำงานแบบโลคัลทั้งหมด ไม่มีโฆษณาและไม่มีการติดตาม

---

## ไฮไลต์

- **ความเร็วเริ่มต้นแบบทั่วโลก**: ใช้ความเร็วทั่วโลกเมื่อช่องไม่มีการตั้งค่า
- **แทนค่าตามช่อง**: ปรับที่วิดีโอใดก็ได้ แล้วทั้งช่องจะจำไว้
- **ดักจับทุกการควบคุม**: UI ของเครื่องเล่นและคีย์ลัดจะซิงก์เสมอ
- **กลับไปค่าเริ่มต้นก็ยังนับ**: การเลือกชัดเจนไม่ถูกมองว่า "ยังไม่ตั้ง"

> เหมาะกับใคร?
> - คนดูอนิเมะมาราธอน
> - คนชอบเนื้อหาด้านเทค / การเรียนรู้
> - คนที่อยากดูให้มีประสิทธิภาพขึ้น

---

## ความปลอดภัยและความเป็นส่วนตัว

- **ทำงานแบบโลคัลทั้งหมด**
- **ไม่มีโฆษณา / ไม่มีโปรโมชัน**
- **ไม่ต้องใช้บัญชี ไม่มีการอัปโหลดข้อมูลการรับชม**
- **ไม่เปลี่ยนคำแนะนำหรือกลยุทธ์การเล่นของ Bilibili**

---

## การติดตั้ง

- [ติดตั้งสำหรับ Chrome](#)
- [ติดตั้งสำหรับ Firefox](#)

---

## โอเพนซอร์สและการมีส่วนร่วม

Bilibili Speed Master เป็นโอเพนซอร์ส ยินดีรับ issue และ PR

- **เปิด**: ลอจิกหลัก, การปรับ DOM, การดักจับพฤติกรรม, การจัดเก็บการตั้งค่า
- **สงวนไว้**: ทรัพยากรของสโตร์ (Logo / Banner), ชื่อแบรนด์, ช่องทางเผยแพร่ทางการ
- **สัญญาอนุญาต**: MPL-2.0 (Mozilla Public License 2.0: อนุญาตให้ใช้เชิงพาณิชย์ แก้ไข และแจกจ่าย; ไฟล์ที่แก้ไขต้องเปิดซอร์ส) [ข้อความเต็ม](https://www.mozilla.org/en-US/MPL/2.0/)

---

## ตรรกะการทำงาน (คลิกเพื่อขยาย)

<details>
<summary>ดูรายละเอียด</summary>

- **ความเร็วเริ่มต้นแบบทั่วโลก**
  เมื่อช่องไม่มีการตั้งค่า จะใช้ความเร็วทั่วโลกเพื่อหลีกเลี่ยงการปรับซ้ำ

- **แทนค่าตามช่อง**
  หลังจากปรับความเร็วในวิดีโอใดๆ ของช่อง ทุกวิดีโอจะเล่นด้วยความเร็วนี้

- **ดักจับการกระทำของผู้ใช้**
  การควบคุมของเครื่องเล่นหรือคีย์ลัดจะอัปเดตค่าของช่อง

- **กลับไปค่าเริ่มต้นก็ยังนับ**
  ป้องกันการตีความว่าเป็น "ไม่มีการตั้งค่า"

</details>

---

## การพัฒนาและการบิลด์

```bash
pnpm dev           # โหมดพัฒนาแบบ hot reload
pnpm dev:firefox   # โหมดพัฒนา Firefox
pnpm build         # บิลด์สำหรับโปรดักชัน
pnpm build:firefox # บิลด์สำหรับโปรดักชันบน Firefox
pnpm zip           # แพ็กเป็น ZIP สำหรับสโตร์
pnpm compile       # ตรวจสอบชนิดเท่านั้น (ไม่มีเอาต์พุต)
```

ดูสเปกสินค้าและ UI ได้ที่: [docs/spec.md](../spec.md), [docs/popup.md](../popup.md), [docs/options.md](../options.md)
