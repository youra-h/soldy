---
'@soldy-ui/core': minor
'@soldy-ui/setup': minor
'@soldy-ui/angular': minor
---

Table: `resizable` и `reorderable` таблицы — значение колонок без своего, своё значение колонки сильнее. Ломающее: по умолчанию `resizable` и `reorderable` колонки — `undefined` («как у таблицы»), а не `false`, и геттер колонки отдаёт итог, а `change:resizable` и `change:reorderable` колонки приходят и от смены у таблицы. Обновиться: разметку менять не нужно — у таблицы по умолчанию их тоже нет; своё значение колонки читается из `getProps()`.
