---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
---

Соседа по коллекции находят по контракту, а не приведением типа: новые охранники `activationOf`, `filterOf`, `plainOf`, `selectionOf`, у Select — `selectOf` и `tagsOf`, и контракт `IPlainExtension`. Ломающее: в `ISelectTagsExtension` объявлены обязательные `hasTags` и `syncTags()` — своё расширение `tags` для движка Select должно их реализовать, иначе Select его не найдёт.
