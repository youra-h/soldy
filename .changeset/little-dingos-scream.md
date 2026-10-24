---
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/angular': minor
---

Прокрутка списков одна на ListBox, Select и Menu: за установкой value и за подсветкой, откуда бы они ни пришли. Подсветка докручивает элемент ближайшим краем; value двигает только сам список — частично видный элемент ближайшим краем, невидимый в центр. `change:highlight` навигации списка сообщает о видимой подсветке, позиция без отметки его не шлёт. `TMenuNavigationPlugin.highlightItem` и `unhighlight` больше не принимают `FocusOptions`: фокус меню не прокручивает. `TListScrollPlugin` слушает подсветку навигации, которую называет опция `navigation` (`ListScrollPluginDescriptor.with({ navigation: TListKeyboardPlugin })`); без опции он идёт только за значением.
