---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/plugins': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

Calendar — компонент поверх календаря ядра: во Vue `<Calendar>` с частью `Calendar.Item`, в setup — дескрипторы `CalendarDescriptor`, `CalendarItemDescriptor` и их коллекционные части, в теме oren — стили. Сетка — по APG (Date Picker Dialog): месяц — `table` с `role="grid"`, его заголовок называет сетку и сам объявляет смену месяца (`aria-live="polite"`), фокус и наборы — на ячейке дня, одна остановка Tab на все сетки, шапка дней недели скрыта от скринридера. Клавиши — `TCalendarKeyboardPlugin`: стрелки, Home/End, PageUp/PageDown (с Shift — год), Enter и пробел выбирают день, Escape отменяет начатый диапазон; DOM-фокус идёт за фокусом коллекции и в новый месяц. Нажатия и наведение для предпросмотра диапазона — `TCalendarPointerPlugin`. Кнопки листания — одна пара на все сетки; их имена — новые пропсы `prevLabel` и `nextLabel` у `TCalendar` (по умолчанию английские), кнопка, погасшая у границы под фокусом, отдаёт фокус дню. Содержимое дня — слот `item` со scope `{ item }`. В ядре: выходы `prevAria` и `nextAria`, событие вида `change:paging` — перечитать `prevDisabled` и `nextDisabled`, а ячейка заполнителя в `grids` — только дата и `aria-hidden`, без текста и `data-outside-month`.
