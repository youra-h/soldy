# @soldy-ui/theme-base

## 0.3.0-alpha.3

### Minor Changes

- 11e25c7: Tabs: слоты `leading` и `trailing` стоят не в списке табов, а рядом с ним, в новом ряду `.so-tabs__bar`, — выравнивание `center`, `end` и `stretch` работает со слотами, а в `[role=tablist]` остались только табы. Обновление: классы слотов — `.so-tabs__leading` и `.so-tabs__trailing` вместо `.so-tabs__list--leading` и `.so-tabs__list--trailing`; `.so-tabs > .so-tabs__list` пишите через ряд: `.so-tabs > .so-tabs__bar > .so-tabs__list`. Своя тема: `--so-tabs-active-*` и `--so-tabs-gap-*` плагин раскладки пишет на ряд, место таба отсчитывается от него — линию и отметку рисуйте на ряду; поле `listEl` у `TActiveTabOffset` переименовано в `barEl`.
- 328644b: Плагины раскладки `TTabsViewPlugin`, `TTableHeadPlugin` и `TToastsFrontPlugin` — в `@soldy-ui/theme-base/setup`. `useTheme(oren)` ставит их, как раньше; прямой импорт классов — из `@soldy-ui/theme-base/setup`
- fff8870: Жест слоёв и взятый заголовок Table идут за указателем без темы: `translate` из `--so-swipe-offset` (панели Popover, Select и DatePicker, Drawer, тост, карточка выбора месяца Calendar) и из `--so-table-column-drag` ставит общий слой тем, а тема ведёт переходом только возврат, уход и приземление. Ломающее: `theme-variables.json` — два раздела: `base-reads` (что читает общий слой, прежний список) и `theme-reads` (что тема вправе читать, но не задаёт: знак направления, ступень размера блока, переменные плагинов). Как обновиться: прежние ключи читать из `base-reads`; своя тема больше не кладёт `--so-swipe-offset` в `translate` и не регистрирует его `@property`: сдвиг ставит общий слой, и у каждого слоя с жестом там свой ноль — вложенный слой сдвиг внешнего не наследует, и во всех браузерах, Firefox до 128 тоже.

### Patch Changes

- 6020322: Структура Scroller, Slider, Rating, ProgressLinear, ProgressSpinner, Skeleton и Pagination — в общем слое `@soldy-ui/theme-base`; облик oren не меняется
- ac51425: Структура ListBox, Menu, Select, Popover, Tooltip, Dialog и Drawer — в общем слое `@soldy-ui/theme-base`; облик oren не меняется
- e0beaf3: Tabs: в RTL слот `trailing` списка стоит у конца строки, а не вплотную к табам
- fd0bfec: Структура Calendar, DateInput, DatePicker, Toasts и DragAndDrop — в общем слое `@soldy-ui/theme-base`; облик oren не меняется
- 93fdf15: Структура Label, Field, Icon, Switch, CheckBox, RadioGroup и Button — в общем слое `@soldy-ui/theme-base`, числа — его переменными; облик oren не меняется
- e8395eb: Структура Input, Textarea, NumberInput, Tabs, Tags и Accordion — в общем слое `@soldy-ui/theme-base`; облик oren не меняется
- 8aaaae8: Новый пакет `@soldy-ui/theme-base` — общий слой тем: сброс частей soldy и знак направления письма. Тема oren включает его в свой CSS, облик не меняется.
- 382e887: Структура Table — в общем слое `@soldy-ui/theme-base`; облик oren не меняется
- Updated dependencies [a14dfe5]
- Updated dependencies [11e25c7]
- Updated dependencies [8110fc3]
- Updated dependencies [0ab715a]
- Updated dependencies [582d3a6]
- Updated dependencies [28470f6]
- Updated dependencies [0471962]
- Updated dependencies [fc30695]
- Updated dependencies [64be9ca]
- Updated dependencies [fcd14b4]
- Updated dependencies [a09886b]
- Updated dependencies [241082a]
- Updated dependencies [734ff59]
- Updated dependencies [7a86466]
- Updated dependencies [b6d9450]
- Updated dependencies [b5a5d78]
- Updated dependencies [ad1de00]
- Updated dependencies [53a3fe6]
  - @soldy-ui/plugins@0.3.0-alpha.3
  - @soldy-ui/core@0.3.0-alpha.3
