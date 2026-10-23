---
'@soldy-ui/svelte': minor
---

Адаптер Svelte убран: `useCollectionAdapter(facade, getProps, owner)` отдаёт полную связку компонента с фасадом, `chainHandler` склеивает своё и обработчик потребителя, комментарии сокращены. Сломалось: `useCollectionAdapter` принимает связку владельца вместо геттера атрибутов и отдаёт `TBinding`; убраны `TCollectionBinding`, экспорт `joinState`/`TJoinedState` и поле `plugins` связки; setup-функции DatePicker и Select не отдают `field`/`start`/`end`/`calendar`/`engine` — части берутся у `ctrl`. Обновиться: `useCollectionAdapter(facade, getProps, useAdapter(...))` вместо ручной сборки объекта связки с `joinState`; `binding.ctrl.field` вместо `binding.field`.
