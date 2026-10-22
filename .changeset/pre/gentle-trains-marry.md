---
'@soldy-ui/webc': patch
---

Событие «до» (`so:show:before`, `so:hide:before`, …) отменяется `preventDefault()` самого события, как событие DOM; `detail.preventDefault()` работает как прежде
