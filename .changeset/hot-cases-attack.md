---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/plugins': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

Панели Select и DatePicker можно смахнуть, чтобы закрыть: новый проп `swipe` (`none` по умолчанию, `handle` — за полосу у края со стороны поля, `panel` — за любое место, кроме контролов и прокручиваемых областей). Оба компонента — смахиваемые слои (`ISwipeable`) с общим `TSwipePlugin`: панель уходит от поля — вниз под ним, вверх над ним, — и жест закрывает её записью `open`, как Escape. Признак «тянут» — `data-swiping` из нового набора `panelDataset`, полосу разметка рисует по выходу `handleRendered`. У DatePicker календарь в панели завёрнут в `.s-date-picker__content`, и прокручивается теперь он, а не панель: иначе пальцем длинную панель с жестом не прокрутить. Тема oren: вид панели у якоря — проявление, жест и уход смахнутой — один миксин на Popover, Select и DatePicker; Popover выглядит как прежде.
