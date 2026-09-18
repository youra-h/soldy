---
'@soldy/setup': minor
'@soldy/accessor': minor
'@soldy/ui-vue': minor
'@soldy/ui-react': minor
'@soldy/ui-solid': minor
'@soldy/ui-svelte': minor
'@soldy/ui-webc': minor
'@soldy/ui-angular': minor
---

Связывание компонента с фреймворком — одно на все шесть адаптеров.

Публичная поверхность компонента в именах фреймворка — `surfaceOf(descriptor, profile)` из `@soldy/setup`: экспортные имена пропов и событий, умолчания и типы для статического слоя, список съеденных пропсов. Считается один раз на пару «дескриптор × профиль» и заменяет `TDescriptorInspector`, который пересчитывал то же самое на каждом монтировании и в двух режимах. Профиль (`IAdapterProfile`) — стратегия имён и слот по умолчанию, одна константа на адаптер: `VueProfile`, `ReactProfile`, `SolidProfile`, `SvelteProfile`, `WebcProfile`, `AngularProfile`.

На монтирование адаптер берёт связку `bindComponent(adapter, profile)`: стартовое состояние, подписки на триггеры, проброс событий с дедупликацией, чтение и запись пропсов с guard'ом, спред несъеденных пропсов. Своих циклов по аксессору у адаптеров больше нет — остаётся только то, куда писать значение и как отдать событие.

Удалены: `TDescriptorInspector` из `@soldy/accessor`; `createInspectorFactory`, `collectEventBindings`, `collectForwardProps` из `@soldy/setup`; `createInspector`, `useSyncProps`, `useSyncEvents` и их опции из адаптеров, а также `bindOutput`/`bindInput`/`buildInitialState`/`bindEvents` из Angular. Как обновиться: вместо `createInspector(descriptor).getExportEvents()` — `surfaceOf(descriptor, VueProfile).exportEvents`, вместо `getExportProps()` — `.exportProps`.
