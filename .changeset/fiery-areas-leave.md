---
'@soldy-ui/theme-oren': patch
'@soldy-ui/plugins': patch
---

Tabs `view="contained"`: карточка активного таба переезжает к новому табу переходом, как полоса у `line`. Ресайз, сдвиг соседей и первая отрисовка ставят её на место сразу, а при `prefers-reduced-motion: reduce` переезда нет. Без `useTheme` карточка, как и раньше, стоит на выбранном табе. Переменные геометрии активного таба на списке переименованы: `--underline-pos`/`--underline-size` → `--active-tab-pos`/`--active-tab-size`.
