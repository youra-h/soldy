---
'@soldy-ui/react': patch
'@soldy-ui/core': patch
---

Внутренние имена setup-слоя коллекций React (Accordion, ListBox, Tabs, RadioGroup) приведены к правилу имён: контекст фасада — `collectionAdapter`, связка — `collectionBinding`. Примеры `relay` в документации ядра — на `this._engine`. Поведение не меняется.
