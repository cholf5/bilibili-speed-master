<p align="center">
  <img src="../../public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">بيليبيلي ماستر السرعة</h1>

<p align="center">
  إدارة سرعة التشغيل على Bilibili بسهولة.
</p>

<p align="center">
  <a href="../../README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="التثبيت على Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="التثبيت على Firefox" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

هل سئمت من ضبط السرعة كل مرة تفتح فيها فيديو على Bilibili؟ هل تريد سرعات مختلفة لكل قناة؟
**Bilibili Speed Master** يتذكر تفضيلاتك العامة وتفضيلات القنوات. اضبطها مرة واحدة وستعمل تلقائيًا.
يعمل محليًا بالكامل بدون إعلانات أو تتبع.

---

## أبرز المزايا

- **السرعة الافتراضية العامة**: تستخدم سرعتك العامة عندما لا يكون للقناة تفضيل.
- **تجاوز حسب القناة**: اضبط السرعة في أي فيديو وسيتذكرها كامل القناة.
- **اعتراض جميع عناصر التحكم**: واجهة المشغل والاختصارات تبقى متزامنة.
- **العودة للعامة تُحسب**: اختيارك الواضح لا يُعامل كـ "غير مُعيّن".

> لمن هذا؟
> - محبو مشاهدة الأنمي بكثرة
> - عشاق المحتوى التقني / التعليمي
> - من يريد المشاهدة بكفاءة أعلى

---

## الأمان والخصوصية

- **محلي بالكامل**
- **لا إعلانات / لا ترويج**
- **لا حسابات ولا رفع لبيانات المشاهدة**
- **لا يغير توصيات أو استراتيجية تشغيل Bilibili**

---

## التثبيت

- [التثبيت لـ Chrome](#)
- [التثبيت لـ Firefox](#)

---

## المصدر المفتوح والمساهمة

Bilibili Speed Master مفتوح المصدر. نرحب بالمشكلات وطلبات السحب.

- **مفتوح**: المنطق الأساسي، تكييف DOM، اعتراض السلوك، تخزين الإعدادات
- **محجوز**: أصول المتجر (Logo / Banner)، اسم العلامة، قنوات الإصدار الرسمية
- **التفريعات وإعادة التغليف**: يُحظر النشر في متاجر الإضافات بنفس الاسم؛ أصول المتجر واسم العلامة لا تغطيهما رخصة MPL-2.0
- **الترخيص**: MPL-2.0 (Mozilla Public License 2.0: الاستخدام التجاري والتعديل والتوزيع مسموح؛ يجب أن تبقى الملفات المعدلة مفتوحة المصدر) [النص الكامل](https://www.mozilla.org/en-US/MPL/2.0/)

---

## منطق السلوك (انقر للتوسيع)

<details>
<summary>عرض التفاصيل</summary>

- **السرعة الافتراضية العامة**
  عندما لا توجد إعدادات للقناة، تُستخدم السرعة العامة لتجنب التعديلات المتكررة.

- **تجاوز حسب القناة**
  بعد ضبط السرعة في أي فيديو ضمن القناة، ستعمل كل الفيديوهات بتلك السرعة.

- **اعتراض أفعال المستخدم**
  عناصر التحكم أو الاختصارات تحدث تفضيل القناة.

- **العودة للعامة تُحسب**
  يمنع اعتبار الاختيار الواضح "لا تفضيل".

</details>

---

## التطوير والبناء

```bash
pnpm dev           # وضع التطوير مع تحديث فوري
pnpm dev:firefox   # وضع التطوير لـ Firefox
pnpm build         # بناء الإنتاج
pnpm build:firefox # بناء الإنتاج لـ Firefox
pnpm zip           # حزمة ZIP للمتجر
pnpm compile       # فحص الأنواع فقط (بدون مخرجات)
```

لمواصفات المنتج وواجهة المستخدم: [docs/spec.md](../spec.md), [docs/popup.md](../popup.md), [docs/options.md](../options.md)
