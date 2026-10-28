# Отклик на действие — Vue

Стенд и методика — [`README.md`](README.md), итоги всех платформ — [`report.md`](report.md).

## 2026-10-28 — Vue, первый замер

Отклик, мс (медиана):

| Действие                | ×1, кадр | ×4, кадр | ×6, кадр | ×6, успокоение | ×6, INP |
| ----------------------- | -------- | -------- | -------- | -------------- | ------- |
| select: open            | 16       | 18       | 23       | 64             | 24      |
| select: close           | 15       | 16       | 18       | 63             | 16      |
| select: type            | 9        | 14       | 23       | 61             | 24      |
| menu: open              | 16       | 17       | 22       | 64             | 24      |
| menu: close             | 15       | 16       | 19       | 64             | 32      |
| date-picker: open       | 16       | 23       | 36       | 80             | 32      |
| date-picker: close      | 16       | 17       | 23       | 64             | 32      |
| date-picker: locale ru  | 20       | 82       | 131      | 171            | —       |
| date-picker: locale en  | 19       | 76       | 120      | 150            | —       |
| dialog: open            | 16       | 18       | 32       | 82             | 32      |
| dialog: close           | 16       | 16       | 34       | 76             | 32      |
| input: type             | 14       | 12       | 12       | 58             | <16     |
| tabs: tab 2             | 16       | 21       | 47       | 94             | 40      |
| tabs: tab 1             | 16       | 22       | 44       | 93             | 40      |
| calendar: locale ru     | 159      | 883      | 1708     | 1731           | —       |
| calendar: locale en     | 149      | 841      | 1693     | 1741           | —       |
| number-input: locale ru | 17       | 32       | 57       | 98             | —       |
| number-input: locale en | 17       | 34       | 58       | 99             | —       |

Работа на действие (медиана):

| Действие                | обновлений, 50 копий | обновлений, 1 копия | монтирований, 50 / 1 | DOM-записей в других копиях | DOM-записей вне страницы, 50 / 1 | кто обновился (50 копий)                          |
| ----------------------- | -------------------- | ------------------- | -------------------- | --------------------------- | -------------------------------- | ------------------------------------------------- |
| select: open            | 13                   | 13                  | 0 / 0                | 0                           | 4 / 4                            | SelectItem 5, ItemRow 5, Select 1, Input 1        |
| select: close           | 13                   | 13                  | 0 / 0                | 0                           | 2 / 2                            | SelectItem 5, ItemRow 5, Select 1, Input 1        |
| select: type            | 14                   | 14                  | 0 / 0                | 0                           | 6 / 6                            | SelectItem 5, ItemRow 5, Input 2, Select 1        |
| menu: open              | 17                   | 17                  | 0 / 0                | 0                           | 4 / 4                            | ItemRow 5, Frame 3, MenuItem 3, Menu 1            |
| menu: close             | 17                   | 17                  | 0 / 0                | 0                           | 2 / 2                            | ItemRow 5, Frame 3, MenuItem 3, Menu 1            |
| date-picker: open       | 41                   | 41                  | 0 / 0                | 0                           | 54 / 5                           | CalendarItem 31, Button 4, Frame 2, DatePicker 1  |
| date-picker: close      | 41                   | 41                  | 0 / 0                | 0                           | 52 / 3                           | CalendarItem 31, Button 4, Frame 2, DatePicker 1  |
| date-picker: locale ru  | 208                  | 12                  | 31 / 31              | 1078                        | 71 / 22                          | Button 53, Frame 51, DatePicker 50, DateInput 50  |
| date-picker: locale en  | 208                  | 12                  | 31 / 31              | 1078                        | 71 / 22                          | Button 53, Frame 51, DatePicker 50, DateInput 50  |
| dialog: open            | 6                    | 6                   | 0 / 0                | 0                           | 108 / 10                         | Button 4, DialogPreview 1, Dialog 1               |
| dialog: close           | 6                    | 6                   | 0 / 0                | 0                           | 104 / 6                          | Button 4, DialogPreview 1, Dialog 1               |
| input: type             | 1                    | 1                   | 0 / 0                | 0                           | 0 / 0                            | Input 1                                           |
| tabs: tab 2             | 6                    | 6                   | 0 / 0                | 0                           | 0 / 0                            | TabsItem 2, Button 2, TabsContent 2               |
| tabs: tab 1             | 6                    | 6                   | 0 / 0                | 0                           | 0 / 0                            | TabsItem 2, Button 2, TabsContent 2               |
| calendar: locale ru     | 302                  | 8                   | 1550 / 31            | 1029                        | 0 / 0                            | Button 150, Calendar 50, Popover 50, Frame 50     |
| calendar: locale en     | 302                  | 8                   | 1550 / 31            | 1029                        | 0 / 0                            | Button 150, Calendar 50, Popover 50, Frame 50     |
| number-input: locale ru | 152                  | 5                   | 0 / 0                | 294                         | 0 / 0                            | Button 100, NumberInput 50, ? 1, LocaleProvider 1 |
| number-input: locale en | 152                  | 5                   | 0 / 0                | 294                         | 0 / 0                            | Button 100, NumberInput 50, ? 1, LocaleProvider 1 |

Счёт — рендеры компонентов: функция `render` каждого смонтированного компонента после первого
рендера (хук devtools продакшн-сборки с `__VUE_PROD_DEVTOOLS__`). Событие `component:updated` того
же хука для счёта не годится: Vue шлёт его и на каждый вызов функции слота, под именем владельца
слота, и счёт Select на одно открытие выходил 19 вместо одного.

Что видно:

- **Соседей действие не трогает.** У каждого действия на одной копии рендеров на странице из 50
  копий столько же, сколько на странице из одной, и записей в DOM других копий нет. Записи вне
  страницы при открытии DatePicker и Dialog (54 и 108 против 5 и 10) — `aria-hidden` (у Dialog — на окне и его
  подложке) на закрытых панелях 49 соседей: открытый слой прячет всё вне себя. Терпимо.
- **Лишняя работа внутри копии — поломка.** Перерисовка владельца перерисовывала все элементы,
  которые он рисует из данных: открытие Select — 5 опций и 5 их строк (13 рендеров вместо 3),
  открытие DatePicker — 31 день месяца (41 вместо 10). Владелец пробрасывал элементу свои слоты
  `item*` всегда, проброс ссылается на переменную цикла, а такого потомка Vue перерисовывает с
  каждой перерисовкой родителя (AGENTS.md, Pitfalls). Исправлено ниже.
- **Menu** перерисовывает пункты на открытии (17 рендеров) — это стенд, а не библиотека: превью
  Vue пишет пункты функцией `h()`, а слоты из `h()` Vue стабильными не считает. Пункты в шаблоне
  приложения получают скомпилированные слоты и на открытии не перерисовываются.
- **Отклик.** Действие на одной копии — до 47 мс до кадра при ×6. Язык страницы: 50 полей DatePicker
  — 120–131 мс при ×6; 50 видимых календарей — 1,7 с, дольше всех: сетка месяца при смене первого
  дня недели собирается заново у всех платформ ([`report.md`](report.md)).

## 2026-10-28 — Vue, элементы из данных без проброса слотов

Владелец, который рисует элементы из данных (Calendar, Select, ListBox, Menu и подменю, Tabs,
Tags, Accordion, RadioGroup, Pagination, Toasts), отдаёт элементу проброс своих `item*`, только
когда у него задан хоть один, а DatePicker отдаёт свой `item` календарю тоже только заданным.
Сторож — `packages/ui/vue/__tests__/item-renders.spec.ts`.

Рендеров на действие:

| Действие                |  до | после | кто ушёл                                       |
| ----------------------- | --: | ----: | ---------------------------------------------- |
| select: open/close      |  13 |     3 | SelectItem 5, ItemRow 5                        |
| select: type            |  14 |     6 | 4 опции и их строки (подсветка новой осталась) |
| date-picker: open/close |  41 |    10 | CalendarItem 31                                |

Остальные действия — без изменений. Время до кадра — одной сессией, старый код и новый подряд
(страницы `calendar`, `date-picker`, `select`, `tabs`, `dialog`; ×1 / ×4 / ×6, мс):

| Действие            | ×1        | ×4        | ×6          |
| ------------------- | --------- | --------- | ----------- |
| date-picker: open   | 32 → 32   | 21 → 19   | 35 → 31     |
| date-picker: close  | 31 → 31   | 17 → 16   | 30 → 22     |
| select: open        | 16 → 16   | 18 → 18   | 23 → 20     |
| select: type        | 9 → 9     | 15 → 15   | 26 → 23     |
| calendar: locale ru | 117 → 120 | 736 → 716 | 1213 → 1150 |

Выигрыш во времени — несколько миллисекунд при ×6: опций в превью пять, дней — 31. Он растёт с
числом элементов: Select на 200 опций перерисовывал бы на каждом открытии 400 компонентов. Таблицы
ниже — полный прогон после правки.

Отклик, мс (медиана):

| Действие                | ×1, кадр | ×4, кадр | ×6, кадр | ×6, успокоение | ×6, INP |
| ----------------------- | -------- | -------- | -------- | -------------- | ------- |
| select: open            | 16       | 18       | 20       | 64             | 24      |
| select: close           | 14       | 16       | 17       | 62             | 16      |
| select: type            | 9        | 15       | 24       | 62             | 24      |
| menu: open              | 16       | 17       | 22       | 63             | 24      |
| menu: close             | 16       | 17       | 19       | 64             | 32      |
| date-picker: open       | 16       | 21       | 36       | 79             | 32      |
| date-picker: close      | 15       | 15       | 22       | 64             | 24      |
| date-picker: locale ru  | 20       | 81       | 128      | 160            | —       |
| date-picker: locale en  | 19       | 77       | 122      | 151            | —       |
| dialog: open            | 16       | 18       | 21       | 64             | 24      |
| dialog: close           | 15       | 15       | 20       | 63             | 24      |
| input: type             | 14       | 14       | 13       | 60             | 16      |
| tabs: tab 2             | 16       | 21       | 35       | 83             | 32      |
| tabs: tab 1             | 16       | 18       | 35       | 80             | 32      |
| calendar: locale ru     | 138      | 783      | 1254     | 1309           | —       |
| calendar: locale en     | 141      | 788      | 1239     | 1282           | —       |
| number-input: locale ru | 18       | 31       | 56       | 97             | —       |
| number-input: locale en | 17       | 31       | 55       | 98             | —       |

Работа на действие (медиана):

| Действие                | обновлений, 50 копий | обновлений, 1 копия | монтирований, 50 / 1 | DOM-записей в других копиях | DOM-записей вне страницы, 50 / 1 | кто обновился (50 копий)                          |
| ----------------------- | -------------------- | ------------------- | -------------------- | --------------------------- | -------------------------------- | ------------------------------------------------- |
| select: open            | 3                    | 3                   | 0 / 0                | 0                           | 4 / 4                            | Select 1, Input 1, Frame 1                        |
| select: close           | 3                    | 3                   | 0 / 0                | 0                           | 2 / 2                            | Select 1, Input 1, Frame 1                        |
| select: type            | 6                    | 6                   | 0 / 0                | 0                           | 6 / 6                            | Input 2, Select 1, Frame 1, SelectItem 1          |
| menu: open              | 17                   | 17                  | 0 / 0                | 0                           | 4 / 4                            | ItemRow 5, Frame 3, MenuItem 3, Menu 1            |
| menu: close             | 17                   | 17                  | 0 / 0                | 0                           | 2 / 2                            | ItemRow 5, Frame 3, MenuItem 3, Menu 1            |
| date-picker: open       | 10                   | 10                  | 0 / 0                | 0                           | 54 / 5                           | Button 4, Frame 2, DatePicker 1, DateInput 1      |
| date-picker: close      | 10                   | 10                  | 0 / 0                | 0                           | 52 / 3                           | Button 4, Frame 2, DatePicker 1, DateInput 1      |
| date-picker: locale ru  | 208                  | 12                  | 31 / 31              | 1078                        | 71 / 22                          | Button 53, Frame 51, DatePicker 50, DateInput 50  |
| date-picker: locale en  | 208                  | 12                  | 31 / 31              | 1078                        | 71 / 22                          | Button 53, Frame 51, DatePicker 50, DateInput 50  |
| dialog: open            | 6                    | 6                   | 0 / 0                | 0                           | 108 / 10                         | Button 4, DialogPreview 1, Dialog 1               |
| dialog: close           | 6                    | 6                   | 0 / 0                | 0                           | 104 / 6                          | Button 4, DialogPreview 1, Dialog 1               |
| input: type             | 1                    | 1                   | 0 / 0                | 0                           | 0 / 0                            | Input 1                                           |
| tabs: tab 2             | 6                    | 6                   | 0 / 0                | 0                           | 0 / 0                            | TabsItem 2, Button 2, TabsContent 2               |
| tabs: tab 1             | 6                    | 6                   | 0 / 0                | 0                           | 0 / 0                            | TabsItem 2, Button 2, TabsContent 2               |
| calendar: locale ru     | 302                  | 8                   | 1550 / 31            | 1029                        | 0 / 0                            | Button 150, Calendar 50, Popover 50, Frame 50     |
| calendar: locale en     | 302                  | 8                   | 1550 / 31            | 1029                        | 0 / 0                            | Button 150, Calendar 50, Popover 50, Frame 50     |
| number-input: locale ru | 152                  | 5                   | 0 / 0                | 294                         | 0 / 0                            | Button 100, NumberInput 50, ? 1, LocaleProvider 1 |
| number-input: locale en | 152                  | 5                   | 0 / 0                | 294                         | 0 / 0                            | Button 100, NumberInput 50, ? 1, LocaleProvider 1 |

## 2026-10-28 — Vue, неделя Calendar по месту в сетке

Ключ строки недели — её место в сетке, а не первая дата (задача 869fmu6nz). Смена языка с другим
первым днём недели (`ruRU` ⇄ `enUS`) оставляет в строке шесть дней из семи, и сетка месяца не
пересобирается целиком. Время до кадра на странице `calendar` из 50, мс; «до» — прошлый замер
журнала, «после» — `npm run interaction -- --pages calendar --rates 1,6` (×4 — тем же прогоном):

| Действие            | ×1       | ×4        | ×6         |
| ------------------- | -------- | --------- | ---------- |
| calendar: locale ru | 120 → 76 | 716 → 392 | 1150 → 560 |
| calendar: locale en | 141 → 78 | 788 → 351 | 1239 → 554 |
