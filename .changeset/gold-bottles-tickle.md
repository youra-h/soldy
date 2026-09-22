---
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
---

Общий слой оверлея: модель фокуса вынесена в базу TOverlayFocusPlugin, к ней добавлены TModalFocusPlugin (Tab замкнут в панели) и TScrollLockPlugin (страница под открытым оверлеем не прокручивается, замок со счётчиком слоёв). Поведение Popover не меняется.
