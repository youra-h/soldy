---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
'@soldy-ui/plugins': patch
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/theme-oren': patch
---

Calendar: заголовок месяца — кнопка, открывающая панель выбора месяца и года. Панель накрывает календарь целиком, её шапка встаёт на место ряда заголовков; в ней список месяцев — ровная сетка 4×3 с подписями по центру, год в шапке переключает на годы по 12, стрелки листают год и страницу лет. Имена стрелок — новые пропсы prevYearLabel, nextYearLabel, prevYearsLabel, nextYearsLabel. Frame и Popover получили проп contained: панель не телепортируется, а встаёт в ближайшем позиционированном предке (Popover — накрывает его целиком). ListBox сообщает о выборе пользователя событием choose расширения списка.
