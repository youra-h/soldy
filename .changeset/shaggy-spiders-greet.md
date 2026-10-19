---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/svelte': minor
'@soldy-ui/solid': minor
'@soldy-ui/angular': minor
'@soldy-ui/webc': minor
'@soldy-ui/theme-oren': minor
---

ListBox и Select: группы пунктов из данных, как у Menu (`_: { group }`, `groupBy`, `groups`), части `ListBox.Group` и `Select.Group`. `TMenuGroupIdsPlugin` заменён общим плагином имени группы `TItemGroupIdsPlugin` (описание — `ItemGroupIdsPluginDescriptor` вместо `MenuGroupIdsPluginDescriptor`), типы `IMenuGroup`, `IMenuGroupProps`, `TMenuGroupEvents` — общими `IItemGroup`, `IItemGroupProps`, `TItemGroupEvents` — замените импорт. Рисование отдаёт разметке ListBox и Select секции: в поверхности компонента `drawnSections` вместо `drawn` (событие `change:drawnSections`). Список с группами окно `Virtual` не рисует.
