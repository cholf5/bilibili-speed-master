<p align="center">
  <img src="public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  Torne o gerenciamento de velocidade no Bilibili simples.
</p>

<p align="center">
  <a href="README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Instalar no Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Instalar no Firefox" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

Cansado de ajustar a velocidade toda vez que abre um vídeo no Bilibili? Quer velocidades diferentes por canal?
**Bilibili Speed Master** lembra suas preferências globais e por canal. Configure uma vez e pronto.
Funciona totalmente local, sem anúncios e sem rastreamento.

---

## Destaques

- **Velocidade global padrão**: Usa sua velocidade global quando um canal não tem preferência.
- **Substituição por canal**: Ajuste em qualquer vídeo e o canal inteiro será lembrado.
- **Intercepta todos os controles**: UI do player e atalhos permanecem sincronizados.
- **Voltar ao global também conta**: Sua escolha explícita nunca é tratada como "não definido".

> Para quem é?
> - Quem maratona animes
> - Fãs de conteúdo técnico / educacional
> - Quem quer assistir com mais eficiência

---

## Segurança e privacidade

- **Totalmente local**
- **Sem anúncios / sem promoção**
- **Sem contas, sem envio de dados de visualização**
- **Não altera recomendações ou estratégia de reprodução do Bilibili**

---

## Instalação

- [Instalar para Chrome](#)
- [Instalar para Firefox](#)

---

## Open source e contribuição

Bilibili Speed Master é open source. Issues e PRs são bem-vindos.

- **Aberto**: Lógica central, adaptação DOM, interceptação de comportamento, armazenamento de configurações
- **Reservado**: Materiais da loja (Logo / Banner), nome da marca, canais oficiais de lançamento
- **Licença**: MPL-2.0 (Mozilla Public License 2.0: uso comercial, modificação e distribuição permitidos; arquivos modificados devem permanecer open source) [Texto completo](https://www.mozilla.org/en-US/MPL/2.0/)

---

## Lógica de comportamento (clique para expandir)

<details>
<summary>Ver detalhes</summary>

- **Velocidade global padrão**
  Quando um canal não tem configuração, a velocidade global é usada para evitar ajustes repetidos.

- **Substituição por canal**
  Depois de ajustar qualquer vídeo em um canal, todos os vídeos desse canal usam essa velocidade.

- **Intercepta ações do usuário**
  Controles do player ou atalhos atualizam a preferência do canal.

- **Voltar ao global também conta**
  Evita classificar escolhas explícitas como "sem preferência".

</details>

---

## Desenvolvimento e build

```bash
pnpm dev           # Modo dev com hot reload
pnpm dev:firefox   # Modo dev para Firefox
pnpm build         # Build de produção
pnpm build:firefox # Build de produção para Firefox
pnpm zip           # Empacotar como ZIP da loja
pnpm compile       # Apenas verificação de tipos (sem saída)
```

Para specs de produto e UI: [docs/spec.md](docs/spec.md), [docs/popup.md](docs/popup.md), [docs/options.md](docs/options.md)
