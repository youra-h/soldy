---
'@soldy/accessor': minor
'@soldy/setup': minor
---

Аксессор: свойство — объект `TProperty` (декларация и владелец) с методами `value`, `assign`, `reset`, `initialize`, `watch`; `TAccessor.getValue`, `setValue`, `getEventSource` и тип `IAccessorProp` сняты, у `IAccessorEvent` появился `source`. Setup: плагины монтирования — `IComponentPlugins` (`TOwnPlugins` / `TSharedPlugins`) вместо флага `ownsBundle`; `TExternalPlugins` переехал из контекста адаптера в сборку. Публичный API контекста и связки для адаптеров не изменился.
