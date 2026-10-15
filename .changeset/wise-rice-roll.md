---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/theme-oren': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/solid': minor
'@soldy-ui/svelte': minor
'@soldy-ui/angular': minor
'@soldy-ui/webc': minor
---

Переменные CSS, которые пишут ядро и плагины, а читает тема, названы одной схемой `--so-…` — с префиксом классов. Раньше часть шла без префикса и сталкивалась с переменными приложения: `--dialog-width`, объявленная приложением для своих окон, становилась шириной окна soldy без `width`. Переименованы: `--dialog-width`, `--dialog-height`, `--dialog-offset-{top,bottom,start,end}`, `--drawer-width` и `--drawer-height` — в `--so-dialog-…` и `--so-drawer-…`; `--s-swipe-offset`, `--s-filler-height`, `--s-slider-position`, `--s-slider-range-start`, `--s-slider-range-end`, `--s-progress-linear-percent`, `--s-progress-spinner-fraction`, `--s-table-column-width`, `--s-table-column-drag`, `--s-table-column-shift`, `--s-table-column-ghost` и `--s-table-column-ghost-size` — в `--so-…` с тем же хвостом (`--so-swipe-offset`). Тема oren читает новые имена. Приложение, которое задавало эти переменные само или читало их в своей теме и тестах, переименовывает их: старых имён библиотека не пишет. Токены темы (`--s-neutral-500`, `--s-component-*`) не менялись.
