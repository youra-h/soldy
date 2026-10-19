---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/theme-oren': minor
'@soldy-ui/icons-material': minor
---

NumberInput (Vue): поле числа в формате локали — шаг и границы, ↑/↓, PageUp/PageDown, Home/End, кнопки «−» и «+» с удержанием, `formatOptions` (процент, валюта, единица), событие `commit`; `createScale` принимает открытые границы, а `shift` шкалы со значения вне сетки шагает к соседнему узлу со стороны сдвига (с 2,5 при шаге 1 — на 3 и на 2). Ломающее: роли иконок `minus` и `plus` — дополните ими свой пакет иконок; раздел локали `numberInput` — дополните им свой `TLocale` (`extendLocale` возьмёт из основы).
