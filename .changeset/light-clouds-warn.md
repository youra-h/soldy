---
'@soldy-ui/core': patch
'@soldy-ui/plugins': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
'@soldy-ui/theme-oren': patch
---

DatePicker получил кнопку очистки — `clearable`, как у Input и DateInput: DatePicker теперь сам поле (база ядра `TField`, дескриптор `FieldDescriptor`) с набором кнопки `clearAria`, командой и событием `clear` и слотом `clear`. У одной даты кнопка стоит в поле перед кнопкой календаря, у диапазона — одна на период, после поля конца, и очищает оба конца, в том числе набранные не до конца. Имя кнопки — строка локали `field.clear` с `name` DatePicker. Плагин имён поля `TFieldNamesPlugin` теперь ставят дескрипторы Input и DateInput, а не `FieldDescriptor`: у DatePicker имя кнопки пишет `TDatePickerNamesPlugin` — наследник плагина имён поля. В теме oren коробка диапазона — сетка из пяти колонок, а сторону кнопок DatePicker задаёт переменная `--s-date-picker-button` вместо `--s-date-picker-trigger`.
