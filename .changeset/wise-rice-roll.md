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

Переменные CSS, которые пишут ядро и плагины, а читает тема, названы одной схемой `--so-…` — с префиксом классов, и одноимённая переменная приложения у предка их не подменяет: `--so-dialog-width`, `--so-dialog-height`, `--so-dialog-offset-{top,bottom,start,end}`, `--so-drawer-width`, `--so-drawer-height`, `--so-swipe-offset`, `--so-filler-height`, `--so-slider-position`, `--so-slider-range-start`, `--so-slider-range-end`, `--so-progress-linear-percent`, `--so-progress-spinner-fraction`, `--so-table-column-width`, `--so-table-column-drag`, `--so-table-column-shift`, `--so-table-column-ghost` и `--so-table-column-ghost-size`. Тема oren читает их под этими именами.
