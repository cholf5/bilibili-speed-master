<p align="center">
  <img src="../../public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  Haz que la gestión de la velocidad de reproducción en Bilibili sea sencilla.
</p>

<p align="center">
  <a href="../../README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Instalar en Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Instalar en Firefox" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

¿Cansado de ajustar la velocidad cada vez que abres un video de Bilibili? ¿Quieres velocidades distintas por canal?
**Bilibili Speed Master** recuerda tus preferencias globales y por canal. Configúralo una vez y listo.
Funciona completamente de forma local, sin anuncios ni seguimiento.

---

## Destacados

- **Velocidad global predeterminada**: Usa tu velocidad global cuando un canal no tenga preferencia.
- **Anulación por canal**: Ajusta la velocidad en cualquier video y se recordará para el canal.
- **Intercepta todos los controles**: UI del reproductor y atajos se mantienen sincronizados.
- **Volver a global también cuenta**: Tu elección explícita nunca se trata como "sin configurar".

> ¿Para quién es?
> - Fans de maratones de anime
> - Amantes de contenido técnico / aprendizaje
> - Quienes quieren ver más eficientemente

---

## Seguridad y privacidad

- **Totalmente local**
- **Sin anuncios / sin promoción**
- **Sin cuentas ni subida de datos de visualización**
- **No altera recomendaciones ni estrategia de reproducción de Bilibili**

---

## Instalación

- [Instalar para Chrome](#)
- [Instalar para Firefox](#)

---

## Código abierto y contribución

Bilibili Speed Master es de código abierto. Issues y PRs son bienvenidos.

- **Abierto**: Lógica principal, adaptación DOM, interceptación de comportamiento, almacenamiento de ajustes
- **Reservado**: Recursos de tienda (Logo / Banner), nombre de marca, canales oficiales de publicación
- **Licencia**: MPL-2.0 (Mozilla Public License 2.0: uso comercial, modificación y distribución permitidos; los archivos modificados deben seguir siendo abiertos) [Texto completo](https://www.mozilla.org/en-US/MPL/2.0/)

---

## Lógica de comportamiento (haz clic para expandir)

<details>
<summary>Ver detalles</summary>

- **Velocidad global predeterminada**
  Cuando un canal no tiene ajustes, se usa la velocidad global para evitar ajustes repetidos.

- **Anulación por canal**
  Después de ajustar cualquier video de un canal, todos los videos se reproducen a esa velocidad.

- **Intercepta acciones del usuario**
  Tanto los controles del reproductor como los atajos actualizan la preferencia del canal.

- **Volver a global también cuenta**
  Evita clasificar elecciones explícitas como "sin preferencia".

</details>

---

## Desarrollo y compilación

```bash
pnpm dev           # Modo dev con recarga en caliente
pnpm dev:firefox   # Modo dev para Firefox
pnpm build         # Compilación de producción
pnpm build:firefox # Compilación de producción para Firefox
pnpm zip           # Empaquetar como ZIP de tienda
pnpm compile       # Solo comprobación de tipos (sin salida)
```

Para especificaciones de producto y UI, ver: [docs/spec.md](../spec.md), [docs/popup.md](../popup.md), [docs/options.md](../options.md)
