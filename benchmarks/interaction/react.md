# Отклик на действие — React

Стенд и методика — [`README.md`](README.md), итоги всех платформ — [`report.md`](report.md).

## 2026-10-28 — React, первый замер

Отклик, мс (медиана):

| Действие                | ×1, кадр | ×4, кадр | ×6, кадр | ×6, успокоение | ×6, INP |
| ----------------------- | -------- | -------- | -------- | -------------- | ------- |
| select: open            | 16       | 18       | 25       | 64             | 24      |
| select: close           | 15       | 16       | 19       | 63             | 16      |
| select: type            | 8        | 14       | 24       | 61             | 24      |
| menu: open              | 16       | 17       | 21       | 63             | 24      |
| menu: close             | 15       | 17       | 18       | 64             | 32      |
| date-picker: open       | 17       | 28       | 50       | 98             | 48      |
| date-picker: close      | 15       | 16       | 22       | 63             | 24      |
| date-picker: locale ru  | 17       | 93       | 140      | 177            | —       |
| date-picker: locale en  | 19       | 78       | 125      | 166            | —       |
| dialog: open            | 16       | 19       | 22       | 64             | 24      |
| dialog: close           | 15       | 17       | 19       | 64             | 16      |
| input: type             | 14       | 14       | 14       | 62             | 16      |
| tabs: tab 2             | 16       | 20       | 36       | 81             | 32      |
| tabs: tab 1             | 16       | 19       | 37       | 80             | 32      |
| calendar: locale ru     | 117      | 649      | 1021     | 1061           | —       |
| calendar: locale en     | 112      | 642      | 1029     | 1073           | —       |
| number-input: locale ru | 17       | 31       | 50       | 97             | —       |
| number-input: locale en | 17       | 32       | 61       | 98             | —       |

Работа на действие (медиана):

| Действие                | обновлений, 50 копий | обновлений, 1 копия | монтирований, 50 / 1 | DOM-записей в других копиях | DOM-записей вне страницы, 50 / 1 | кто обновился (50 копий)                                     |
| ----------------------- | -------------------- | ------------------- | -------------------- | --------------------------- | -------------------------------- | ------------------------------------------------------------ |
| select: open            | 22                   | 22                  | 0 / 0                | 0                           | 4 / 4                            | SelectItem 5, ItemRow 5, Elevate 3, Frame 2                  |
| select: close           | 22                   | 22                  | 0 / 0                | 0                           | 2 / 2                            | SelectItem 5, ItemRow 5, Elevate 3, Frame 2                  |
| select: type            | 26                   | 26                  | 0 / 0                | 0                           | 6 / 6                            | Elevate 5, SelectItem 5, ItemRow 5, Input 2                  |
| menu: open              | 8                    | 8                   | 0 / 0                | 0                           | 4 / 4                            | Button 2, Frame 2, Teleport 2, Menu$1 1                      |
| menu: close             | 7                    | 7                   | 0 / 0                | 0                           | 2 / 2                            | Frame 2, Teleport 2, Menu$1 1, Elevate 1                     |
| date-picker: open       | 215                  | 215                 | 0 / 0                | 0                           | 54 / 5                           | CalendarItem 124, Button 17, Elevate 14, Icon 12             |
| date-picker: close      | 54                   | 54                  | 0 / 0                | 0                           | 52 / 3                           | CalendarItem 31, Button 4, Elevate 3, Icon 3                 |
| date-picker: locale ru  | 1008                 | 126                 | 31 / 31              | 980                         | 70 / 21                          | Elevate 205, Button 110, Icon 107, Frame 104                 |
| date-picker: locale en  | 956                  | 74                  | 31 / 31              | 980                         | 70 / 21                          | Elevate 202, Button 106, Icon 104, Frame 102                 |
| dialog: open            | 19                   | 19                  | 0 / 0                | 0                           | 65 / 16                          | Button 6, Dialog 2, Teleport 2, Input 2                      |
| dialog: close           | 11                   | 11                  | 0 / 0                | 0                           | 58 / 9                           | Button 4, DialogPreview 1, Dialog 1, Teleport 1              |
| input: type             | 2                    | 2                   | 0 / 0                | 0                           | 0 / 0                            | Input 1, NativeInput 1                                       |
| tabs: tab 2             | 18                   | 18                  | 0 / 0                | 0                           | 0 / 0                            | Button 6, TabsItem 4, Tabs$1 3, Elevate 3                    |
| tabs: tab 1             | 18                   | 18                  | 0 / 0                | 0                           | 0 / 0                            | Button 6, TabsItem 4, Tabs$1 3, Elevate 3                    |
| calendar: locale ru     | 2751                 | 56                  | 1550 / 31            | 980                         | 0 / 0                            | CalendarItem 1550, Button 300, Icon 200, Icon_arrowRight 200 |
| calendar: locale en     | 2751                 | 56                  | 1550 / 31            | 980                         | 0 / 0                            | CalendarItem 1550, Button 300, Icon 200, Icon_arrowRight 200 |
| number-input: locale ru | 801                  | 17                  | 0 / 0                | 784                         | 0 / 0                            | Button 200, Icon 200, NumberInput 100, NativeInput 100       |
| number-input: locale en | 801                  | 17                  | 0 / 0                | 784                         | 0 / 0                            | Button 200, Icon 200, NumberInput 100, NativeInput 100       |

Счёт — компоненты, которые React отрисовал в коммите (хук devtools продакшн-сборки, флаг
`PerformedWork` у волокна; поддерево, которое React пропустил, не обходится).

Что видно:

- **Соседей действие не трогает.** У каждого действия на одной копии рендеров на странице из 50
  копий столько же, сколько на странице из одной, и записей в DOM других копий нет. Записи вне
  страницы при открытии DatePicker и Dialog (54 и 65 против 5 и 16) — `aria-hidden` (у Dialog — на окне и его
  подложке) на закрытых панелях 49 соседей. Терпимо.
- **Лишняя работа внутри копии — поломка.** Перерисовка владельца перерисовывала все его элементы:
  открытие DatePicker — каждый день месяца четыре раза (124 рендера `CalendarItem` из 215),
  открытие Select — 5 опций и 5 строк (10 из 22), смена языка 50 календарей — 1550 рендеров дней.
  Границы перерисовки стояли только у строк и ячеек Table. Исправлено ниже.
- **Смена языка** перерисовывает NumberInput и DatePicker дважды-трижды: хост стенда пишет язык
  перерисовкой корня, и React перерисовывает дерево от него, а затем — от смены языка в ядре. В
  приложении так же, если язык — состояние у корня: граница перерисовки у каждого компонента
  убрала бы первую волну, но это решение не адаптера, а приложения — терпимо.
- **Отклик.** Действие на одной копии — до 50 мс до кадра при ×6 (открытие DatePicker). Язык
  страницы: 50 полей DatePicker — 125–140 мс при ×6; 50 видимых календарей — 1,0 с.

## 2026-10-28 — React, элементы коллекций под границей перерисовки

Каждый элемент коллекции — `*/item` и пункты меню (`MenuCheckboxItem`, `MenuRadioItem`,
`MenuPopoverItem`, `MenuSubmenu`) — под границей перерисовки адаптера (`withRenderBoundary`), как
строки Table. Владелец отдаёт элементу из данных тот же экземпляр и те же слоты (`relaySlot` без
слота — `undefined`), и React его пропускает. Сторож —
`packages/ui/react/__tests__/item-renders.spec.tsx`.

Рендеров на действие:

| Действие              |   до | после | кто ушёл                |
| --------------------- | ---: | ----: | ----------------------- |
| select: open/close    |   22 |    12 | SelectItem 5, ItemRow 5 |
| date-picker: open     |  215 |    91 | CalendarItem 124        |
| date-picker: close    |   54 |    23 | CalendarItem 31         |
| calendar: locale (50) | 2751 |  1201 | CalendarItem 1550       |

Время до кадра — одной сессией, старый код и новый подряд (×1 / ×4 / ×6, мс):

| Действие            | ×1       | ×4        | ×6         |
| ------------------- | -------- | --------- | ---------- |
| date-picker: open   | 17 → 16  | 26 → 24   | 48 → 40    |
| date-picker: close  | 15 → 16  | 16 → 16   | 23 → 18    |
| calendar: locale ru | 111 → 92 | 628 → 524 | 1007 → 856 |
| calendar: locale en | 109 → 88 | 644 → 529 | 1037 → 841 |

Смена языка 50 календарей — на 15–20% быстрее: React больше не перерисовывает дни, которые
пересобирает. Остальные действия — в пределах разброса. Таблицы ниже — полный прогон после правки.

Отклик, мс (медиана):

| Действие                | ×1, кадр | ×4, кадр | ×6, кадр | ×6, успокоение | ×6, INP |
| ----------------------- | -------- | -------- | -------- | -------------- | ------- |
| select: open            | 16       | 18       | 23       | 65             | 24      |
| select: close           | 15       | 17       | 18       | 63             | 16      |
| select: type            | 9        | 15       | 25       | 62             | 24      |
| menu: open              | 16       | 18       | 20       | 63             | 24      |
| menu: close             | 16       | 16       | 18       | 63             | 32      |
| date-picker: open       | 17       | 25       | 44       | 82             | 40      |
| date-picker: close      | 15       | 16       | 23       | 62             | 24      |
| date-picker: locale ru  | 18       | 83       | 136      | 177            | —       |
| date-picker: locale en  | 19       | 74       | 122      | 165            | —       |
| dialog: open            | 16       | 20       | 24       | 65             | 24      |
| dialog: close           | 15       | 17       | 21       | 62             | 24      |
| input: type             | 14       | 14       | 14       | 61             | 16      |
| tabs: tab 2             | 16       | 20       | 37       | 82             | 32      |
| tabs: tab 1             | 16       | 20       | 35       | 85             | 32      |
| calendar: locale ru     | 101      | 588      | 985      | 1020           | —       |
| calendar: locale en     | 104      | 584      | 950      | 990            | —       |
| number-input: locale ru | 17       | 31       | 49       | 98             | —       |
| number-input: locale en | 17       | 31       | 61       | 99             | —       |

Работа на действие (медиана):

| Действие                | обновлений, 50 копий | обновлений, 1 копия | монтирований, 50 / 1 | DOM-записей в других копиях | DOM-записей вне страницы, 50 / 1 | кто обновился (50 копий)                                  |
| ----------------------- | -------------------- | ------------------- | -------------------- | --------------------------- | -------------------------------- | --------------------------------------------------------- |
| select: open            | 12                   | 12                  | 0 / 0                | 0                           | 4 / 4                            | Elevate 3, Frame 2, Teleport 2, Select$1 1                |
| select: close           | 12                   | 12                  | 0 / 0                | 0                           | 2 / 2                            | Elevate 3, Frame 2, Teleport 2, Select$1 1                |
| select: type            | 18                   | 18                  | 0 / 0                | 0                           | 6 / 6                            | Elevate 5, Input 2, NativeInput 2, Frame 2                |
| menu: open              | 8                    | 8                   | 0 / 0                | 0                           | 4 / 4                            | Button 2, Frame 2, Teleport 2, Menu$1 1                   |
| menu: close             | 7                    | 7                   | 0 / 0                | 0                           | 2 / 2                            | Frame 2, Teleport 2, Menu$1 1, Elevate 1                  |
| date-picker: open       | 91                   | 91                  | 0 / 0                | 0                           | 54 / 5                           | Button 17, Elevate 14, Icon 12, Frame 9                   |
| date-picker: close      | 23                   | 23                  | 0 / 0                | 0                           | 52 / 3                           | Button 4, Elevate 3, Icon 3, Frame 3                      |
| date-picker: locale ru  | 946                  | 64                  | 31 / 31              | 980                         | 70 / 21                          | Elevate 205, Button 110, Icon 107, Frame 104              |
| date-picker: locale en  | 925                  | 43                  | 31 / 31              | 980                         | 70 / 21                          | Elevate 202, Button 106, Icon 104, Frame 102              |
| dialog: open            | 19                   | 19                  | 0 / 0                | 0                           | 65 / 16                          | Button 6, Dialog 2, Teleport 2, Input 2                   |
| dialog: close           | 11                   | 11                  | 0 / 0                | 0                           | 58 / 9                           | Button 4, DialogPreview 1, Dialog 1, Teleport 1           |
| input: type             | 2                    | 2                   | 0 / 0                | 0                           | 0 / 0                            | Input 1, NativeInput 1                                    |
| tabs: tab 2             | 18                   | 18                  | 0 / 0                | 0                           | 0 / 0                            | Button 6, TabsItem 4, Tabs$1 3, Elevate 3                 |
| tabs: tab 1             | 18                   | 18                  | 0 / 0                | 0                           | 0 / 0                            | Button 6, TabsItem 4, Tabs$1 3, Elevate 3                 |
| calendar: locale ru     | 1201                 | 25                  | 1550 / 31            | 980                         | 0 / 0                            | Button 300, Icon 200, Icon_arrowRight 200, Calendar$1 100 |
| calendar: locale en     | 1201                 | 25                  | 1550 / 31            | 980                         | 0 / 0                            | Button 300, Icon 200, Icon_arrowRight 200, Calendar$1 100 |
| number-input: locale ru | 801                  | 17                  | 0 / 0                | 784                         | 0 / 0                            | Button 200, Icon 200, NumberInput 100, NativeInput 100    |
| number-input: locale en | 801                  | 17                  | 0 / 0                | 784                         | 0 / 0                            | Button 200, Icon 200, NumberInput 100, NativeInput 100    |
