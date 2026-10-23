---
'@soldy-ui/svelte': minor
---

Адаптер Svelte убран: связку компонента с фасадами сводит `joinBindings`, `chainHandler` склеивает своё и обработчик потребителя, комментарии сокращены. Сломалось: `TCollectionBinding` параметризован типом состояния, а не контрактом (`TCollectionBinding<TState, TProps>`); убраны экспорт `joinState`/`TJoinedState` и поле `plugins` связки; setup-функции DatePicker и Select не отдают `field`/`start`/`end`/`calendar`/`engine` — части берутся у `ctrl`. Обновиться: `joinBindings(owner, useCollectionAdapter(facade, getProps, () => owner.forwardProps))` вместо ручной сборки объекта связки с `joinState`; `binding.ctrl.field` вместо `binding.field`.
