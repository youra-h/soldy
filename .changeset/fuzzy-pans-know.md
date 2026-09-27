---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

ProgressLinear: ось `orientation` — `horizontal` (по умолчанию) или `vertical`, снизу вверх; на корне модификатор `--horizontal` или `--vertical`. `aria-orientation` полоса не пишет: у роли `progressbar` его нет. Тема oren рисует вертикальную полосу строчным блоком высотой 10rem (класс или стиль потребителя её перекрывает) и той же толщины по `size`, что горизонтальную; заливка растёт снизу, бег идёт снизу вверх при любом направлении письма; при `prefers-reduced-motion` доля встаёт сразу, а бег тот же.
