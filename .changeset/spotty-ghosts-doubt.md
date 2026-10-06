---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/theme-oren': minor
---

Таблица: ширину колонки меняет ручка у края заголовка — мышью, касанием, клавишами и жестом скринридера (`resizable` у колонки, в границах `minWidth` и `maxWidth`); итог приходит событием таблицы `column:resize` с колонкой и шириной, по нему приложение сохраняет настройку. `disabled` таблицы выключает ручки колонок. Разметка заголовка колонки сменилась: содержимое — в обёртке `.s-table-column__content`, рядом — полоса ручки `.s-table-column__resizer` с полем `input type="range"`, а заголовок назван обёрткой (`aria-labelledby`) и объявлен `scope="col"`. Стили по `.s-table-column > .s-table-column__sort` и `.s-table-column > .s-table-column__text` ведут теперь через обёртку. Ширина задана у всех показанных колонок — таблица шириной в их сумму, а не во всю ширину места.
