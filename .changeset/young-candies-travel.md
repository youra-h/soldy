---
'@soldy/setup': minor
'@soldy/accessor': minor
'@soldy/plugins': minor
'@soldy/ui-vue': minor
'@soldy/ui-react': minor
'@soldy/ui-solid': minor
'@soldy/ui-svelte': minor
'@soldy/ui-angular': minor
'@soldy/ui-webc': minor
---

Типы setup едут одним контрактом: `IComponentDescriptor<C>`, `IPluginDefinition<C>` и `IAdapterContext<C>` вместо позиционных параметров. `defineComponent` и `definePlugin` выводят контракт сами — явные аргументы типа у `definePlugin` убрать. Сняты `TPluginEventsFrom`, `TPluginPropsFrom`, `TPluginOutputsFrom`, `DescriptorPlugins`, `TDescriptorInstance`, `NamespacedEvents`; `TAdapterState` и `toInstanceState` принимают контракт. `useAdapter` и `useCollectionAdapter` адаптеров дженериков не требуют: `useAdapter(adapter, props)`.
