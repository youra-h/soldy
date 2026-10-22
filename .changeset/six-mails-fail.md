---
'@soldy-ui/core': patch
'@soldy-ui/setup': patch
---

Сверка состава по `trackBy` (`items =`, `batch.patch`) больше не снимает элементы, вошедшие разметкой, например пункты `item-content` у подменю из данных. Новый метод `batch.hold(item)` защищает элемент состава от сверки.
