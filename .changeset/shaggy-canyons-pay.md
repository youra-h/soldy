---
'@soldy-ui/angular': patch
---

Angular: коллекции RadioGroup, ListBox, Tabs и Accordion. Части — отдельные теги (`<so-list-box-item>`, `<so-tabs-item>`, `<div so-tabs-content>`, `<so-accordion-item>`, `<label so-radio-group-item>`), элементы разметки входят в коллекцию в порядке DOM и на сервере. Лифт коллекции — слой DI на владельца (`provideElevator()` в `providers`); поле `token` у `TAngularElevator`, которое ни к чему не было подключено, убрано. Узел плагинам компонент отдаёт только в браузере, после отрисовки.
