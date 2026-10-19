---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

Меню: пункт с панелью `Menu.PopoverItem` (`MenuPopoverItem`) — строка открывает сбоку панель с любым содержимым, например календарём: нажатием, Enter, пробелом или → (в RTL ←); Escape возвращает к пункту, Tab из панели закрывает меню. Открыта одна панель на меню — подменю или пункта с панелью, — и связку строки с панелью у обоих пишет один плагин `TMenuPopupIdsPlugin`.
