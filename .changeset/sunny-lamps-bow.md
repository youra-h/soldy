---
'@soldy-ui/core': minor
'@soldy-ui/setup': minor
---

Tags: вид набора больше не доставляется каждому тегу. Пилюлю тега тема рисует по модификатору набора (`s-tags--view-<v>`), и копия значения на элементе осталась без читателя. Убраны `view` и `change:view` у расширения коллекции `tags` и его item-адаптера, геттер `view` у `TTagsCollectionFacade` и `TTagsItemCollectionFacade`, выход `view` у `Tags.Item` (`TagsCollectionItemDescriptor`). Как обновиться: вид набора читать с `TTags.view`, смену слушать событием `change:view` инстанса Tags.
