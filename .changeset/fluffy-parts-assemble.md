---
'@soldy/setup': minor
'@soldy/ui-vue': patch
'@soldy/ui-react': patch
'@soldy/ui-solid': patch
'@soldy/ui-svelte': patch
'@soldy/ui-webc': patch
'@soldy/ui-angular': patch
---

Слой setup собирает компонент по одному составу. Состав монтирования (плагины дескриптора плюс регистрации приложения) считается один раз, и по нему строятся набор плагинов, units аксессора и начальные значения плагинных пропсов — раньше каждый выяснял состав сам, и плагины реестра доходили только до набора.

Дескриптор стал описанием типа и только им: методы `createBundle` и `createAccessor` с него сняты (их звала одна сборка), а сам он строится один раз на тип — `defineDescriptor` кэширует фабрику, и монтирование больше не пересобирает всю цепочку до `EntityContribution`.

Расширения `TPluginsBindingExtension` и `TPluginPropsExtension` удалены вместе с `resolveDefaultExtensions` и полем `defaultExtensions` в конфиге контекста. Начальные значения плагинных пропсов пишет сборка, а корневой узел привязывается методом контекста `adapter.bindElement(el)` — у компонента без `TElementPlugin` он ничего не делает. Как обновиться: `adapter.get(TPluginsBindingExtension)?.bindElement(el)` заменить на `adapter.bindElement(el)`, `{ defaultExtensions: [] }` из вызовов `createAdapterContext` убрать.

`IAdapterContextOptions` и `IAdapterContextConfig` теперь экспортируются из `@soldy/setup`.
