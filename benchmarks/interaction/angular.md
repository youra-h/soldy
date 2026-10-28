# Отклик на действие — Angular

Стенд и методика — [`README.md`](README.md), итоги всех платформ — [`report.md`](report.md).

## 2026-10-28 — Angular, первый замер

Отклик, мс (медиана):

| Действие                | ×1, кадр | ×4, кадр | ×6, кадр | ×6, успокоение | ×6, INP |
| ----------------------- | -------- | -------- | -------- | -------------- | ------- |
| select: open            | 17       | 25       | 31       | 80             | 32      |
| select: close           | 16       | 20       | 23       | 63             | 24      |
| select: type            | 10       | 14       | 23       | 60             | 24      |
| menu: open              | 17       | 23       | 30       | 77             | 32      |
| menu: close             | 16       | 20       | 23       | 66             | 32      |
| date-picker: open       | 18       | 27       | 37       | 81             | 32      |
| date-picker: close      | 16       | 21       | 25       | 64             | 24      |
| date-picker: locale ru  | 19       | 64       | 101      | 144            | —       |
| date-picker: locale en  | 19       | 54       | 91       | 131            | —       |
| dialog: open            | 17       | 23       | 26       | 65             | 32      |
| dialog: close           | 16       | 19       | 21       | 63             | 24      |
| input: type             | 14       | 14       | 15       | 61             | 16      |
| tabs: tab 2             | 17       | 22       | 40       | 84             | 32      |
| tabs: tab 1             | 17       | 23       | 47       | 96             | 32      |
| calendar: locale ru     | 122      | 693      | 1140     | 1180           | —       |
| calendar: locale en     | 119      | 685      | 1137     | 1177           | —       |
| number-input: locale ru | 17       | 23       | 28       | 66             | —       |
| number-input: locale en | 17       | 23       | 29       | 66             | —       |

Работа на действие (медиана):

| Действие                | обновлений, 50 копий | обновлений, 1 копия | монтирований, 50 / 1 | DOM-записей в других копиях | DOM-записей вне страницы, 50 / 1 | кто обновился (50 копий)                                                                  |
| ----------------------- | -------------------- | ------------------- | -------------------- | --------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| select: open            | 3 (тактов 1)         | 3                   | 0 / 0                | 0                           | 4 / 4                            | TSelectComponent 1, TInputComponent 1, TFrameComponent 1                                  |
| select: close           | 3 (тактов 1)         | 3                   | 0 / 0                | 0                           | 2 / 2                            | TSelectComponent 1, TInputComponent 1, TFrameComponent 1                                  |
| select: type            | 5 (тактов 1)         | 5                   | 0 / 0                | 0                           | 6 / 6                            | TSelectComponent 1, TInputComponent 1, TSelectItemComponent 1, TItemRowComponent 1        |
| menu: open              | 4 (тактов 2)         | 4                   | 0 / 0                | 0                           | 4 / 4                            | TButtonComponent 2, TMenuComponent 1, TFrameComponent 1                                   |
| menu: close             | 3 (тактов 1)         | 3                   | 0 / 0                | 0                           | 2 / 2                            | TMenuComponent 1, TButtonComponent 1, TFrameComponent 1                                   |
| date-picker: open       | 8 (тактов 2)         | 8                   | 0 / 0                | 0                           | 54 / 5                           | TDatePickerComponent 2, TDateInputComponent 2, TButtonComponent 1, TFrameComponent 1      |
| date-picker: close      | 6 (тактов 1)         | 6                   | 0 / 0                | 0                           | 52 / 3                           | TDatePickerComponent 1, TDateInputComponent 1, TButtonComponent 1, TCalendarComponent 1   |
| date-picker: locale ru  | 207 (тактов 1)       | 11                  | 31 / 31              | 1078                        | 676 / 627                        | TButtonComponent 52, TDatePickerComponent 51, TDateInputComponent 51, TFrameComponent 50  |
| date-picker: locale en  | 205 (тактов 1)       | 9                   | 31 / 31              | 1078                        | 676 / 627                        | TButtonComponent 52, TDatePickerComponent 50, TDateInputComponent 50, TFrameComponent 50  |
| dialog: open            | 6 (тактов 2)         | 6                   | 0 / 0                | 0                           | 108 / 10                         | TButtonComponent 2, PreviewRootComponent 1, DialogPreview 1, TDialogComponent 1           |
| dialog: close           | 5 (тактов 1)         | 5                   | 0 / 0                | 0                           | 104 / 6                          | PreviewRootComponent 1, DialogPreview 1, TButtonComponent 1, TDialogComponent 1           |
| input: type             | 1 (тактов 1)         | 1                   | 0 / 0                | 0                           | 0 / 0                            | TInputComponent 1                                                                         |
| tabs: tab 2             | 9 (тактов 1)         | 9                   | 0 / 0                | 0                           | 0 / 0                            | TTabsItemComponent 2, TButtonComponent 2, TTabsContentComponent 2, PreviewRootComponent 1 |
| tabs: tab 1             | 9 (тактов 1)         | 9                   | 0 / 0                | 0                           | 0 / 0                            | TTabsItemComponent 2, TButtonComponent 2, TTabsContentComponent 2, PreviewRootComponent 1 |
| calendar: locale ru     | 201 (тактов 1)       | 5                   | 1550 / 31            | 30674                       | 0 / 0                            | TButtonComponent 100, TCalendarComponent 50, TPopoverComponent 50, PreviewRootComponent 1 |
| calendar: locale en     | 201 (тактов 1)       | 5                   | 1550 / 31            | 30674                       | 0 / 0                            | TButtonComponent 100, TCalendarComponent 50, TPopoverComponent 50, PreviewRootComponent 1 |
| number-input: locale ru | 151 (тактов 1)       | 4                   | 0 / 0                | 196                         | 0 / 0                            | TButtonComponent 100, TNumberInputComponent 50, PreviewRootComponent 1                    |
| number-input: locale en | 151 (тактов 1)       | 4                   | 0 / 0                | 196                         | 0 / 0                            | TButtonComponent 100, TNumberInputComponent 50, PreviewRootComponent 1                    |

Счёт — проходы шаблонов компонентов и такты обнаружения изменений (`тактов`): на каждое действие
— один-два такта.

Что видно:

- **Соседей действие не трогает.** Проходов шаблонов на странице из 50 копий столько же, сколько
  на странице из одной: компоненты на сигналах, и такт проверяет только виды, чьи сигналы
  сменились. Записей в DOM других копий нет. Записи вне страницы при открытии DatePicker и Dialog
  — `aria-hidden` (у Dialog — на окне и его подложке) на закрытых панелях 49 соседей, по атрибуту-двум на
  соседа — терпимо.
- **Отклик.** Действие на одной копии — до 47 мс до кадра при ×6; открытие панелей (Select, Menu,
  DatePicker) — 30–37 мс, на 10 мс дольше, чем у Svelte и Solid.
- **Язык страницы.** 50 полей DatePicker — 91–101 мс при ×6; 50 видимых календарей — 1,1 с. Записей
  в DOM на смене языка календарей в 30 раз больше, чем у Vue, по той же причине, что у Web
  Components: новая ячейка получает атрибуты уже в документе. Сетка собирается заново у всех
  платформ — [`report.md`](report.md).
