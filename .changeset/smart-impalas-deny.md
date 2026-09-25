---
'@soldy-ui/core': minor
'@soldy-ui/setup': minor
'@soldy-ui/plugins': minor
'@soldy-ui/vue': minor
'@soldy-ui/angular': minor
---

У контролов `disabled` отдаёт своё значение — то, что задали разметка, данные или код, — а итог с учётом выключенного владельца (элемент выключенного списка, набора табов, группы радио) отдаёт новое свойство только для чтения `resolvedDisabled` с событием `change:resolvedDisabled`; в дескрипторе Control это защищённый выход. Раньше `disabled` отдавал итог, и `true`, заданное элементу разметкой, пока список выключен, в элемент не записывалось: после включения списка элемент снова становился доступен. Ломающее: `disabled` элемента в выключенном списке теперь `false`, пока его не выключили самого, а `change:disabled` (и `update:disabled` во Vue) приходит только на смену своего значения. Как обновиться: где по `disabled` решали, доступен ли элемент, читайте `resolvedDisabled` и слушайте `change:resolvedDisabled`; `IDisabledOwner` теперь требует `resolvedDisabled` вместо `disabled`.
