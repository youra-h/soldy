---
'@soldy-ui/solid': minor
---

Адаптер Solid: `useCollectionAdapter` снова отвечает только за фасад, связку компонента с фасадами сводит новый `joinBindings`, как в Angular и Web Components. Сломалось: `useCollectionAdapter(adapter, props, forward)` принимает аксессор атрибутов (`owner.forwardProps`) вместо связки владельца и отдаёт `TCollectionBinding`; у `TJoinedBinding` второй параметр — тип состояния фасада. Обновиться: `joinBindings(owner, useCollectionAdapter(facade, props, owner.forwardProps))` вместо `useCollectionAdapter(facade, props, owner)`.
