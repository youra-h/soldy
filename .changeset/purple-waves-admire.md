---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/theme-oren': minor
---

Жест «смахнуть, чтобы закрыть» стал общей возможностью слоёв: кроме выезжающей панели, его получил Popover (проп `swipe`: `none` по умолчанию, `handle`, `panel`). Панель у триггера смахивают от него — вниз под ним и вверх над ним, панель внутри контейнера — вниз; полоса жеста стоит у края со стороны триггера. Контракт ядра — `ISwipeable` (`swipe`, `swipeSide`, `swiping`, `beginSwipe`, `endSwipe`) и тип-гард `isSwipeable`. Ломающее: тип `TDrawerSwipe` заменён общим `TSwipe`, плагин `TDrawerSwipePlugin` — `TSwipePlugin` (`@soldy-ui/plugins`), определение `DrawerSwipePluginDescriptor` — `SwipePluginDescriptor` (`@soldy-ui/setup`), а переменная сдвига жеста в теме `--drawer-swipe` — `--s-swipe-offset`: обновите импорты и свой CSS, если читали переменную.
