<p align="center">
  <img src="../../public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  Управляйте скоростью воспроизведения на Bilibili без лишних усилий.
</p>

<p align="center">
  <a href="../../README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Установить в Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Установить в Firefox" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

Надоело каждый раз менять скорость в видео на Bilibili? Хотите разные скорости для разных каналов?
**Bilibili Speed Master** запоминает глобальные и канальные предпочтения. Настройте один раз, и всё работает автоматически.
Полностью локальная работа без рекламы и трекинга.

---

## Основные возможности

- **Глобальная скорость по умолчанию**: Использует вашу глобальную скорость, если у канала нет предпочтений.
- **Переопределение по каналу**: Измените скорость в любом видео, и весь канал запомнит её.
- **Перехват всех управлений**: UI плеера и горячие клавиши синхронизируются.
- **Возврат к глобальной тоже считается**: Явный выбор не считается "не заданным".

> Для кого это?
> - Любители марафонов аниме
> - Поклонники тех- и обучающего контента
> - Те, кто хочет смотреть эффективнее

---

## Безопасность и приватность

- **Полностью локально**
- **Без рекламы / без продвижения**
- **Без аккаунтов и загрузки данных просмотра**
- **Не меняет рекомендации или стратегию воспроизведения Bilibili**

---

## Установка

- [Установить для Chrome](#)
- [Установить для Firefox](#)

---

## Открытый код и вклад

Bilibili Speed Master — open source. Issues и PR приветствуются.

- **Открыто**: основная логика, адаптация DOM, перехват поведения, хранение настроек
- **Зарезервировано**: материалы магазина (Logo / Banner), бренд, официальные каналы релизов
- **Форки и перепаковки**: запрещено публиковать в магазинах расширений под тем же названием; материалы магазина и бренд не покрываются лицензией MPL-2.0
- **Лицензия**: MPL-2.0 (Mozilla Public License 2.0: коммерческое использование, модификация и распространение разрешены; измененные файлы должны оставаться open source) [Полный текст](https://www.mozilla.org/en-US/MPL/2.0/)

---

## Логика поведения (нажмите, чтобы раскрыть)

<details>
<summary>Показать детали</summary>

- **Глобальная скорость по умолчанию**
  Если у канала нет настройки, используется глобальная скорость, чтобы избежать повторных изменений.

- **Переопределение по каналу**
  После изменения скорости на любом видео все видео канала воспроизводятся с этой скоростью.

- **Перехват действий пользователя**
  Управления плеером или сочетания клавиш обновляют предпочтение канала.

- **Возврат к глобальной тоже считается**
  Не классифицирует явный выбор как "нет предпочтения".

</details>

---

## Разработка и сборка

```bash
pnpm dev           # Режим разработки с hot reload
pnpm dev:firefox   # Режим разработки для Firefox
pnpm build         # Продакшн сборка
pnpm build:firefox # Продакшн сборка для Firefox
pnpm zip           # Упаковать в ZIP для магазина
pnpm compile       # Только проверка типов (без вывода)
```

Для спецификаций продукта и UI см.: [docs/spec.md](../spec.md), [docs/popup.md](../popup.md), [docs/options.md](../options.md)
