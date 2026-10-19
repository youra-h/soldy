---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/vue': patch
---

DatePicker: проп `validate` — проверка набора в полях, как у DateInput: «00» у дня и месяца не записывается, часть ждёт следующей цифры. DatePicker отдаёт его полю одной даты и обоим концам диапазона; по умолчанию выключен
