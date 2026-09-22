---
'@soldy-ui/setup': minor
'@soldy-ui/vue': patch
'@soldy-ui/react': patch
'@soldy-ui/solid': patch
'@soldy-ui/svelte': patch
---

Выходы плагинов — защищённые пропсы, которые плагин вычисляет, а разметка только читает (`dismiss_ownerAttribute`, `layout_styles`, `keyboard_highlightedUid`, `editable_query`, `listItem_highlighted`), — типизирует дескриптор. Тип выхода — четвёртый аргумент `definePlugin`, `Pick` геттера класса плагина; выходы плагинов дескриптора собирает `DescriptorPluginOutputs<typeof XDescriptor>`. Контекст адаптера несёт их вторым параметром, `IAdapterContext<TInstance, TOutputs>`: его выводит `createAdapterContext` из состава плагинов дескриптора. `state` у `useAdapter` React, Solid и Svelte теперь типа `TAdapterState<TInstance, TOutputs>` — свойства инстанса и выходы; во Vue выходы передаются третьим аргументом `useAdapter`, и шаблоны Select, Frame, Icon, Spinner и Skeleton читают их с типом геттера плагина. Удалён `TDismissPluginProps`: он описывал `dismiss_ownerAttribute` рукой и с плагином не сверялся. Как обновиться: вместо `TDismissPluginProps` взять `DescriptorPluginOutputs<typeof SelectDescriptor>` (или дескриптора, в состав которого входит `DismissPluginDescriptor`).
