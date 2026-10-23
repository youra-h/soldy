---
'@soldy-ui/react': minor
---

Адаптер React: хуки сборки useSetupXxx больше не экспортируются из пакета — это внутренняя проводка компонентов. Свою сборку собирайте хуками адаптера: useComponent((create) => create(XDescriptor(), { ctrl, props }), props) для одного контекста, useAdapterContext + useCollectionAdapter(useAdapter(adapter, props), facade, props) для коллекции. Сигнатура useCollectionAdapter сменилась: (owner, facade, props) вместо (adapter, props, forward), результат — связка компонента вместе с фасадом.
