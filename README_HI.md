<p align="center">
  <img src="public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">बिलीबिली स्पीड मास्टर</h1>

<p align="center">
  Bilibili पर प्लेबैक स्पीड को आसान बनाएं।
</p>

<p align="center">
  <a href="README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Chrome पर इंस्टॉल करें" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Firefox पर इंस्टॉल करें" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

क्या आप Bilibili वीडियो की स्पीड हर बार बदलने से थक गए हैं? क्या आप चैनल के हिसाब से अलग स्पीड चाहते हैं?
**Bilibili Speed Master** आपके ग्लोबल और चैनल पसंद याद रखता है। एक बार सेट करें और बस काम करे।
पूरी तरह लोकल चलता है, बिना विज्ञापन और बिना ट्रैकिंग के।

---

## मुख्य विशेषताएं

- **ग्लोबल डिफ़ॉल्ट स्पीड**: जब चैनल में पसंद नहीं हो, तो आपकी ग्लोबल स्पीड इस्तेमाल होती है।
- **चैनल-स्तरीय ओवरराइड**: किसी भी वीडियो में स्पीड बदलें और पूरा चैनल याद रखेगा।
- **सभी कंट्रोल कैप्चर**: प्लेयर UI और शॉर्टकट्स सिंक रहते हैं।
- **ग्लोबल पर वापस जाना भी गिना जाता है**: आपकी स्पष्ट पसंद को "अनसेट" नहीं माना जाता।

> यह किसके लिए है?
> - एनीमे बिंज वॉचर्स
> - टेक / सीखने वाले कंटेंट के प्रशंसक
> - जो अधिक कुशलता से देखना चाहते हैं

---

## सुरक्षा और गोपनीयता

- **पूरी तरह लोकल**
- **कोई विज्ञापन / कोई प्रमोशन नहीं**
- **कोई खाते नहीं, देखने का डेटा अपलोड नहीं**
- **Bilibili की सिफारिशें या प्लेबैक रणनीति नहीं बदलता**

---

## इंस्टॉलेशन

- [Chrome के लिए इंस्टॉल करें](#)
- [Firefox के लिए इंस्टॉल करें](#)

---

## ओपन सोर्स और योगदान

Bilibili Speed Master ओपन सोर्स है। Issues और PRs का स्वागत है।

- **खुला**: कोर लॉजिक, DOM अनुकूलन, व्यवहार इंटरसेप्शन, सेटिंग्स स्टोरेज
- **आरक्षित**: स्टोर एसेट्स (Logo / Banner), ब्रांड नाम, आधिकारिक रिलीज चैनल
- **लाइसेंस**: MPL-2.0 (Mozilla Public License 2.0: व्यावसायिक उपयोग, संशोधन और वितरण की अनुमति; संशोधित फाइलें ओपन सोर्स रहनी चाहिए) [पूरा टेक्स्ट](https://www.mozilla.org/en-US/MPL/2.0/)

---

## व्यवहार लॉजिक (विस्तार के लिए क्लिक करें)

<details>
<summary>विवरण देखें</summary>

- **ग्लोबल डिफ़ॉल्ट स्पीड**
  जब चैनल में कस्टम सेटिंग न हो, तो बार-बार बदलाव से बचने के लिए ग्लोबल स्पीड उपयोग होती है।

- **चैनल-स्तरीय ओवरराइड**
  चैनल में किसी भी वीडियो पर स्पीड बदलने के बाद, सभी वीडियो उसी स्पीड पर चलते हैं।

- **यूज़र एक्शन्स कैप्चर करें**
  प्लेयर कंट्रोल्स या शॉर्टकट्स चैनल की पसंद अपडेट करते हैं।

- **ग्लोबल पर वापस जाना भी गिना जाता है**
  स्पष्ट चुनाव को "कोई पसंद नहीं" के रूप में वर्गीकृत नहीं करता।

</details>

---

## विकास और बिल्ड

```bash
pnpm dev           # हॉट रीलोड के साथ डेवलपमेंट मोड
pnpm dev:firefox   # Firefox डेवलपमेंट मोड
pnpm build         # प्रोडक्शन बिल्ड
pnpm build:firefox # Firefox के लिए प्रोडक्शन बिल्ड
pnpm zip           # स्टोर ZIP पैकेज
pnpm compile       # केवल टाइप चेक (कोई आउटपुट नहीं)
```

उत्पाद और UI स्पेक के लिए देखें: [docs/spec.md](docs/spec.md), [docs/popup.md](docs/popup.md), [docs/options.md](docs/options.md)
