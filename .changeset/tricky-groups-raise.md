---
'@soldy/setup': minor
'@soldy/ui-vue': minor
'@soldy/accessor': minor
---

Тип значения пропа задаёт только интерфейс пропсов ядра. `defineType<T>(ctor)` остаётся для scope слотов, а `type` пропа в дескрипторах теперь голый конструктор (`type: String`): так объявлены строковые пропы ListBox, Select, их частей и `anchor_placement` у Frame. `T` из обёртки у пропа не читал никто, и она могла молча разойтись с ядром.

`useProps` (`@soldy/ui-vue`) больше не разворачивает `defineType` в `type` пропа: тип декларации уходит во Vue как есть. Как обновиться: в своём дескрипторе замените у пропа `type: defineType<X>(String)` на `type: String`, иначе Vue проверит обёртку как `Object` и будет предупреждать на каждое значение. Scope слотов не меняется: `scope: { text: defineType<string>(String) }`.
