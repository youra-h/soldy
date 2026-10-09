---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

Select в окне: `<Virtual><Select :items /></Virtual>` — список панели рисует только видимые опции, на месте остальных — распорки той же высоты (`.s-select__filler`). Фасад коллекции Select отдаёт `drawn`, разметка рисует опции по нему. Клавиши ходят по всем показанным опциям: подсвеченную вне окна окно держит в документе, а `aria-activedescendant` ссылается на опцию, только пока она в документе, — ссылку и прокрутку к ней клавиатура ставит, когда окно её нарисовало (хук `onHighlightedMounted` у `TListNavigationPlugin`). Прокрутка к подсвеченной опции — в следующем кадре: панель, открытую той же клавишей, и дорисованную опцию адаптер рисует после обработчика. Место опции в наборе (`aria-setsize`, `aria-posinset`) в окне пишет общее расширение коллекции `positionInSet` (`TPositionInSetExtension`) — у ListBox и Select одно.
