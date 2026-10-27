# @soldy-ui/theme-base

## 0.3.0-alpha.6

### Patch Changes

- d20904b: Every size of the font scales now steps from the font of the place, which `normal` takes as is, instead of numbers fitted to a 16px page. Button, Pagination, fields and captions: `sm` is 2px smaller, `lg`, `xl` and `2xl` 2px, 4px and 8px larger (`calc(1em - 0.125rem)` … `calc(1em + 0.5rem)`). Table cells and header labels, Calendar day numbers and picker tiles, control notes (Field helper and error, Textarea counter, Slider mark labels) and tags are the same ladder a step down: 4px and 2px smaller at `sm` and `normal`, the font of the place at `lg`, 2px and 4px larger at `xl` and `2xl`; the group labels of `sm` rows are 6px smaller. At a 16px place nothing changes; at 14px a `sm` Button is now 12px instead of 14px (as large as `normal`), a `lg` one 16px instead of 18px, and a `normal` table 12px. The gap cell of Pagination takes the font of its size on its own node rather than inheriting it from the root.
- 69f263b: The group labels of ListBox, Select and Menu now take the note of the size of their rows (Field helper), a step smaller than the rows, instead of the note one size below: 14px at a 16px place for `normal` rows, 12px at 14px. The variables `--so-group-label-font-size-sm` and `--so-group-label-line-height-sm` are gone: `sm` rows read the `sm` note.
- e9aaab9: Calendar: weekdays, days and the month and year picker tiles take the font of the place at the normal size
- a6a77f8: Every package declares `sideEffects`, so the application's bundler drops the modules a page does not use: a page with one button no longer pulls every component of the core, every plugin and every component of the adapter (React: 184 → 82 KB gzip of JS). The core, plugins, icons and adapters are `false`, the themes keep their stylesheets (`["*.css"]`), and `@soldy-ui/webc` is `true`: importing it defines every element, as before.
- 2dec183: The repository moved to github.com/youra-h/soldy-ui: package repository, homepage and issue links point there
- 3b50b69: Calendar: columns widen on large sizes so weekday labels fit; picker tiles wrap into taller rows instead of overflowing
- Updated dependencies [101269c]
- Updated dependencies [7ac5495]
- Updated dependencies [a6a77f8]
- Updated dependencies [765030a]
- Updated dependencies [2e2ff15]
- Updated dependencies [2dec183]
- Updated dependencies [54f5b1d]
- Updated dependencies [5429a39]
- Updated dependencies [604ae77]
  - @soldy-ui/core@0.3.0-alpha.6
  - @soldy-ui/plugins@0.3.0-alpha.6

## 0.3.0-alpha.5

### Patch Changes

- @soldy-ui/core@0.3.0-alpha.5
  - @soldy-ui/plugins@0.3.0-alpha.5

## 0.3.0-alpha.4

### Patch Changes

- Updated dependencies [6f96bae]
- Updated dependencies [1c703ad]
- Updated dependencies [8bb9bdc]
  - @soldy-ui/core@0.3.0-alpha.4
  - @soldy-ui/plugins@0.3.0-alpha.4

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
