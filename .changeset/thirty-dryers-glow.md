---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

Меню: подменю — `Menu.Submenu` (`MenuSubmenu`). Пункт открывает сбоку своё меню наведением, стрелкой к концу строки, Enter и пробелом; путь указателя наискосок к открытой панели её не закрывает; стрелка к началу строки и Escape закрывают один уровень, а выбор пункта и Tab — всё меню, и `choose` приходит каждому меню над пунктом. Наведение в панели меню — теперь плагин `TMenuHoverPlugin`: `TMenuPointerPlugin` только открывает меню.
