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

Строки ListBox, Select и меню рисует `TItemRow` (`row` элемента): роль и остановку Tab строки пишет только элемент, `tabindex="-1"` опции Select — ядро, а не разметка. Ломающее: вид строки ListBox — свойство элемента `TListBoxItem.view`, его пишет список; у `TListBoxItemCollectionFacade` и item-адаптера `list` нет `view` и `change:view` — читайте `item.view`.
