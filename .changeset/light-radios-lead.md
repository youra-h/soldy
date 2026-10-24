---
'@soldy-ui/core': minor
'@soldy-ui/plugins': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/solid': minor
'@soldy-ui/svelte': minor
'@soldy-ui/angular': minor
'@soldy-ui/webc': minor
---

ListBox объявляет скринридеру элемент под стрелками: у элементов `id`, узел списка ссылается на подсвеченный через `aria-activedescendant`. `TSelectItemIdsPlugin` → `TOptionIdsPlugin`, `SelectItemIdsPluginDescriptor` → `OptionIdsPluginDescriptor`: замените импорт. `onHighlightChanged(null)` наследника `TListNavigationPlugin` приходит и от `trackHighlight`, гасящего отметку. `bundle:unregistered` реестра наборов (`TCollectionBundlesPlugin`) приходит и тогда, когда элемент ушёл из коллекции, а не только когда снято его монтирование.
