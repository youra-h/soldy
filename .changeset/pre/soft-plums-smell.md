---
'@soldy-ui/core': minor
---

Коллекции принимают `items` массивом только для чтения; `items:added`/`items:removed` отдают `ReadonlyArray` — так же объявите параметр обработчика.
