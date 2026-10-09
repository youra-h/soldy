---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/theme-oren': minor
---

Окно для длинных списков — обёртка `Virtual`: `<Virtual><ListBox :items /></Virtual>`, так же Table. Коллекции внутри рисуют только видимые элементы, на месте остальных — распорки той же высоты; код окна попадает в сборку приложения только вместе с обёрткой, выключатель — `enabled`. Ломающее: у Table убраны проп `virtual` и выход `bodyRows` — окно ставит обёртка `Virtual`, а тело рисуется по `drawn` (`entry.item` вместо `entry.row`); расширение `virtual` коллекции строк разделено на общее рисование коллекций `draw` (стратегия окна `TWindowStrategy`) и табличное `window` (`aria-rowcount`, `aria-rowindex`, `headRowAria`); `TTableVirtualPlugin` заменён общим `TVirtualPlugin`, переменная распорки `--s-table-filler-height` — на `--s-filler-height`. ListBox в окне: нарисованным — `aria-setsize` и `aria-posinset`, подсвеченный клавиатурой элемент окно держит в документе, предел `maxRows` считается по показанным элементам.
