---
'@soldy/core': minor
'@soldy/setup': minor
'@soldy/ui-vue': minor
'@soldy/theme-oren': minor
---

Значения оформления объявляет тема. `variant`, `view` у Button, Tabs, ListBox, Accordion, Tags и CheckBox, `shape` и `animation` у Skeleton больше не union-типы ядра: тип значения — ключи пустого реестра (`IComponentVariants`, `IButtonViews`, `ITabsViews`, `ICheckBoxViews`, `ISkeletonShapes`, `ISkeletonAnimations`), который дополняет тема. Умолчаний у этих свойств нет: без значения модификатора нет, и блок выглядит видом темы по умолчанию. Модификаторы получили префиксы: `s-button--view-plain`, `s-button--variant-accent`, `s-skeleton--shape-circle`, `s-skeleton--animation-wave`. Флаг `plain` у CheckBox заменён свойством `view`. Разметка компонентов больше не передаёт вложенным частям значения темы: крестики, строка таба и строки списков красятся темой по контексту. Как обновиться: подключить тему (`import "@soldy/theme-oren"`), чтобы её `index.d.ts` дополнил реестры; своя тема объявляет значения через `declare module "@soldy/core"`; стили по старым модификаторам (`--a-*`, `--accent`, `--rounded`) переписать на префиксные; вместо `plain` у CheckBox задать `view="plain"`.
