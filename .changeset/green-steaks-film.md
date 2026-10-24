---
'@soldy-ui/core': minor
'@soldy-ui/setup': minor
'@soldy-ui/vue': minor
'@soldy-ui/react': minor
'@soldy-ui/solid': minor
'@soldy-ui/svelte': minor
'@soldy-ui/angular': minor
'@soldy-ui/webc': minor
---

Строки ListBox, Select, меню и тегов рисует деталь ItemRow (TItemRow): роль и остановку Tab строки пишет только элемент, tabindex="-1" опции Select — ядро (TSelectExtension), а не разметка. Экземпляр строки создаёт её монтирование и отпускает снятие, поэтому под окном Virtual строк в памяти столько, сколько показано. Ломающее: у TTagsItem больше нет row; в Web Components строка — <div is="so-item-row-div"> и <span is="so-item-row-span"> (registerItemRowTag) вместо so-button-div и so-button-span, в Angular — атрибут so-item-row вместо so-button. Обновиться: искать строку по классу .so-button или по этим именам, а не через tag.row.
