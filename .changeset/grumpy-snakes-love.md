---
'@soldy-ui/core': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/theme-oren': minor
---

Кнопка очистки — часть поля. Input и DateInput получили `clearable`, `clearLabel`, имя кнопки `clearAria`, команду `clear` и слот `clear` — общая база ядра `TField` и дескриптор `FieldDescriptor`. Кнопка стоит первой в слоте у конца поля, а в теме oren она квадрат со стороной в строку слота, как кнопка календаря DatePicker, а не низкая и широкая. Select свою кнопку больше не рисует: `clearable` и `clearLabel` он отдаёт полю, а выбор снимает по событию `clear` поля. Ломает: у Select сняты `clearAria` (имя кнопки — `select.field.clearAria`) и модификатор `s-select--clearable` (теперь `s-input--clearable` у поля), у `TSelectCollectionFacade` — `clear`: очищайте поле, `select.field.clear()`. Класс кнопки `.s-select__clear` стал `.s-input__clear`, признак детали `embedded` — `input.clear` вместо `select.clear`.
