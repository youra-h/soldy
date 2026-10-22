---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
---

DragAndDrop сообщает о перестановке перетаскиванием: `move:before` (отменить — `preventDefault()`) и `move` с `engine`, `item`, `oldIndex`, `newIndex`. Выключенный элемент не перетаскивается, коллекции внутри элементов другой коллекции перестановку не наследуют. Ломающее: `TDragPlugin.activate` принимает вторым аргументом обёртку, `DRAG_CONTEXT_ELEVATOR` перестановку больше не включает — коллекции оборачивают в `DragAndDrop`.
