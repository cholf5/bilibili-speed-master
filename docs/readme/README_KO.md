<p align="center">
  <img src="public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">빌리빌리 속도 마스터</h1>

<p align="center">
  Bilibili 재생 속도 관리를 더 쉽게.
</p>

<p align="center">
  <a href="README.md">简体中文</a> | <a href="./docs/readme/README_EN.md">English</a> | <a href="./docs/readme/README_ZH_TW.md">繁體中文</a> | <a href="./docs/readme/README_JA.md">日本語</a> | <a href="./docs/readme/README_KO.md">한국어</a> | <a href="./docs/readme/README_ES.md">Español</a> | <a href="./docs/readme/README_FR.md">Français</a> | <a href="./docs/readme/README_DE.md">Deutsch</a> | <a href="./docs/readme/README_RU.md">Русский</a> | <a href="./docs/readme/README_PT_BR.md">Português (Brasil)</a> | <a href="./docs/readme/README_IT.md">Italiano</a> | <a href="./docs/readme/README_TR.md">Türkçe</a> | <a href="./docs/readme/README_VI.md">Tiếng Việt</a> | <a href="./docs/readme/README_TH.md">ไทย</a> | <a href="./docs/readme/README_ID.md">Bahasa Indonesia</a> | <a href="./docs/readme/README_AR.md">العربية</a> | <a href="./docs/readme/README_HI.md">हिन्दी</a> | <a href="./docs/readme/README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Chrome 설치" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Firefox 설치" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

Bilibili 영상마다 속도를 매번 조절하시나요? 채널마다 다른 속도를 원하시나요?
**Bilibili Speed Master**가 전역 및 채널별 선호를 기억합니다. 한 번만 설정하면 자동으로 적용됩니다.
완전히 로컬에서 실행되며 광고나 추적이 없습니다.

---

## 주요 기능

- **전역 기본 속도**: 채널 설정이 없을 때 전역 속도를 사용합니다.
- **채널별 덮어쓰기**: 어떤 영상에서든 조절하면 채널 전체에 적용됩니다.
- **모든 조작 감지**: 플레이어 UI와 단축키를 모두 반영합니다.
- **전역으로 돌아가도 기록**: 명확한 선택은 "미설정"으로 보지 않습니다.

> 추천 대상
> - 애니메이션 몰아보기 사용자
> - 기술 / 학습 콘텐츠 팬
> - 더 효율적으로 시청하고 싶은 분

---

## 보안 및 개인정보

- **완전 로컬 동작**
- **광고 없음 / 홍보 없음**
- **계정 불필요, 시청 데이터 업로드 없음**
- **Bilibili 추천 또는 재생 전략을 변경하지 않음**

---

## 설치

- [Chrome 설치](#)
- [Firefox 설치](#)

---

## 오픈 소스 및 기여

Bilibili Speed Master는 오픈 소스입니다. 이슈와 PR을 환영합니다.

- **공개**: 핵심 로직, DOM 대응, 동작 가로채기, 설정 저장
- **보류**: 스토어 자산(Logo / Banner), 브랜드명, 공식 배포 채널
- **라이선스**: MPL-2.0 (Mozilla Public License 2.0: 상업적 사용, 수정, 배포 가능; 수정된 파일은 오픈 소스로 유지) [전체](https://www.mozilla.org/en-US/MPL/2.0/)

---

## 동작 로직 (클릭하여 펼치기)

<details>
<summary>자세히 보기</summary>

- **전역 기본 속도**
  채널에 사용자 설정이 없을 때 전역 속도를 사용합니다.

- **채널별 덮어쓰기**
  채널 내 어느 영상에서든 속도를 조절하면 전체에 적용됩니다.

- **사용자 조작 감지**
  플레이어 조작이나 단축키 변경도 채널 설정에 반영됩니다.

- **전역으로 돌아가도 기록**
  명시적 선택을 "선호 없음"으로 오해하지 않습니다.

</details>

---

## 개발 및 빌드

```bash
pnpm dev           # 개발 모드(핫 리로드)
pnpm dev:firefox   # Firefox 개발 모드
pnpm build         # 프로덕션 빌드
pnpm build:firefox # Firefox 프로덕션 빌드
pnpm zip           # 스토어 ZIP 패키징
pnpm compile       # 타입 체크만 수행(출력 없음)
```

제품 및 UI 스펙은 다음을 참고하세요: [docs/spec.md](docs/spec.md), [docs/popup.md](docs/popup.md), [docs/options.md](docs/options.md)
