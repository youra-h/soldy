---
'@soldy-ui/theme-oren': patch
'@soldy-ui/plugins': patch
---

Tabs `view="contained"`: карточка активного таба переезжает к новому табу переходом, как полоса у `line`. Ресайз, сдвиг соседей и первая отрисовка ставят её на место сразу, а при `prefers-reduced-motion: reduce` переезда нет. Без `useTheme` карточка, как и раньше, стоит на выбранном табе. Геометрию активного таба поведение темы пишет на список переменными `--so-tabs-active-pos` и `--so-tabs-active-size`.
