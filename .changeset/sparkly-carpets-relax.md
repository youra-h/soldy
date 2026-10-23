---
'@soldy-ui/theme-oren': minor
---

Тема больше не сбрасывает стили страницы: preflight Tailwind убран, сброс — только у частей soldy. Приложению, которое на него опиралось, — подключить свой сброс и задать шрифт и высоту строки страницы. Вместе с preflight из сборки ушли переменные Tailwind, которые читал только он: `--font-sans`, `--font-mono`, `--default-font-family`, `--default-mono-font-family`.
