---
'@soldy-ui/theme-oren': minor
---

Тема oren больше не объявляет токены `--so-text-2xs` и `--so-text-2xs--line-height`: кегль подписи группы у строк размера `sm` теперь задаёт общий слой тем — `--so-group-label-font-size-sm` и `--so-group-label-line-height-sm`, с теми же 10px и 14px. Приложению, которое читало эти токены, — читать переменные общего слоя.
