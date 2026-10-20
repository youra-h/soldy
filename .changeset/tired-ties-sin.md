---
'@soldy-ui/solid': patch
---

Popover и Tooltip в Solid: панель с произвольным содержимым у триггера и подсказка по наведению и фокусу — поведение, разметка и слоты как у Vue. Scope слота `trigger` читайте в разметке — `trigger={(scope) => <Button {...scope.triggerAria} />}`: так триггер не пересоздаётся при открытии
