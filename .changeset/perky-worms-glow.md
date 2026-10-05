---
'@soldy-ui/core': minor
---

Отметки из данных одной записи (`_: { selected: true }`, `_: { active: true }` в `items`) ставятся одной операцией: наполнение коллекции с тысячами отмеченных строк — одно `change:selection` на запись вместо одного на строку. Ломающее: события `meta:applied` и `meta:changed` у `TMetaExtension` несут список пар `{ item, meta }` (тип `TMetaEntry`) и приходят один раз на запись — в её конце, на `change:items`: сначала `meta:applied` добавленных, следом `meta:changed` обновлённых. `meta.apply(item, meta)` шлёт `meta:applied` сразу — списком из одной пары. Как обновиться: обработчик `(item, meta) => …` заменить на `(entries) => entries.forEach(({ item, meta }) => …)`. Формат `_` в данных, `meta.apply()` и `meta.get()` не менялись.
