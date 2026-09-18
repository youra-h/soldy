---
'@soldy/setup': minor
'@soldy/ui-vue': patch
'@soldy/ui-react': patch
'@soldy/ui-solid': patch
'@soldy/ui-svelte': patch
---

Один файл на компонент: контракт объявляется прямо в дескрипторе. Отдельных файлов contribution больше нет — их читал только свой дескриптор, а компонент приходилось собирать по двум местам. Дескриптор теперь целиком описывает компонент: наследование, пропсы, события, слоты и плагины; тип слотов лежит рядом. Плагины устроены так же — `definePlugin({ ctor, namespace, contribution: { … } })`.

Из `@soldy/setup` удалены фабрики `*Contribution` (`ButtonContribution` и ещё 53) и `LIST_PROPS`; типы слотов (`TButtonSlots` и соседи) по-прежнему экспортируются. `defineType`, `TPropType` и `TEmptySlotScope` переехали в `define` и экспортируются оттуда.

Служебные пропсы адаптера — `TAdapterProps` (`ctrl`, `embedded`), пропсы компонента из дескриптора — `DescriptorComponentProps`, колбэк-события — `DescriptorCallbackEvents`. Раньше то же было объявлено в каждом адаптере отдельно (`TBaseComponentProps` во Vue, `TReactComponentProps`, `TSolidComponentProps`, `TSvelteComponentProps` — удалены).
