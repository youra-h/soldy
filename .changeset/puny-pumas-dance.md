---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

Table: колонки переставляются пользователем — перетаскиванием заголовка колонки `reorderable` и Ctrl+Shift+←/→ на нём. Тащится только заголовок, колонка встаёт на место одной перестановкой на отпускании; таблица отдаёт `column:move` с колонкой и новым порядком полей
