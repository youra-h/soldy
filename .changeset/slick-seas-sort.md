---
'@soldy-ui/setup': patch
---

`TagsCollectionItemDescriptor`: проп `tag_closable` читается одноимённым геттером фасада тега, а не своим `get` — как `tab_closable` у `TabsCollectionItemDescriptor`. Имя и значение пропа не изменились.
